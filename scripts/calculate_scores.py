"""
Sprint 2 — Scoringsberekening
==============================
Berekent per (rijder, etappe) de rider-onafhankelijke basispunten en slaat op in Supabase.
Idempotent: opnieuw draaien geeft geen duplicaten (delete-then-insert per etappe).

Berekende punten (GEEN kopman-bonus of teampunten — die zijn user-specifiek):
  - punten_etappe : etappe-finish positie (top 20)
  - punten_gc     : dagelijks GC klassement (top 5)
  - punten_punten : dagelijks puntenklassement (top 5)
  - punten_kom    : dagelijks bergklassement (top 5)
  - punten_jong   : dagelijks jongerenklassement (top 5)

TTT-etappes: alle rijders van de top-8 ploegen krijgen de ploeg-TTT-punten als punten_etappe.

Gebruik:
    python scripts/calculate_scores.py 3       # bereken etappe 3
    python scripts/calculate_scores.py all     # bereken alle etappes met geïmporteerde data

Vereisten:
    pip install supabase
    scripts/.env met SUPABASE_URL en SUPABASE_KEY (zie scripts/.env.example)
"""

import os
import sys

# ── Credentials laden ──────────────────────────────────────────────────────────
env_file = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("FOUT: Stel SUPABASE_URL en SUPABASE_KEY in als environment variables,")
    print("      of maak een scripts/.env bestand aan (zie scripts/.env.example).")
    sys.exit(1)

from supabase import create_client

client = create_client(SUPABASE_URL, SUPABASE_KEY)

RACE_SLUG = "giro-d-italia"
RACE_JAAR = 2026
BATCH_SIZE = 100

# Puntentabellen
ETAPPE_PUNTEN = [50, 44, 40, 36, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2]
GC_PUNTEN = [10, 8, 6, 4, 2]
PUNTEN_KL_PUNTEN = [8, 6, 4, 2, 1]
KOM_PUNTEN = [8, 6, 4, 2, 1]
JONG_PUNTEN = [6, 4, 3, 2, 1]
TTT_PUNTEN = [40, 32, 28, 24, 20, 16, 12, 8]


def get_race_edition_id() -> str:
    result = (
        client.table("race_editions")
        .select("id")
        .eq("race_slug", RACE_SLUG)
        .eq("jaar", RACE_JAAR)
        .single()
        .execute()
    )
    if not result.data:
        print("FOUT: race_edition niet gevonden in Supabase.")
        sys.exit(1)
    return result.data["id"]


def get_all_riders() -> dict:
    """Retourneert {rider_id: ploeg_naam} voor team-lookup bij TTT."""
    result = client.table("riders").select("id, ploeg").execute()
    return {r["id"]: r["ploeg"] for r in result.data}


def insert_batches(tabel: str, rows: list):
    inserted = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        client.table(tabel).insert(batch).execute()
        inserted += len(batch)
    return inserted


def build_classification_map(tabel: str, stage_number: int, race_edition_id: str, punten_lijst: list) -> dict:
    """Haalt top-N klassement op en retourneert {rider_id: punten}."""
    result = (
        client.table(tabel)
        .select("rank, rider_id")
        .eq("race_edition_id", race_edition_id)
        .eq("stage_number", stage_number)
        .not_.is_("rider_id", "null")
        .order("rank")
        .execute()
    )
    punten_map = {}
    for entry in result.data:
        rank = entry.get("rank")
        rider_id = entry.get("rider_id")
        if rank and rider_id and 1 <= rank <= len(punten_lijst):
            punten_map[rider_id] = punten_lijst[rank - 1]
    return punten_map


def calculate_stage(stage_number: int, race_edition_id: str, riders: dict) -> bool:
    print(f"\nEtappe {stage_number}:")

    # Controleer of dit een TTT-etappe is
    ttt_result = (
        client.table("stage_ttt_results")
        .select("rank, team_naam")
        .eq("race_edition_id", race_edition_id)
        .eq("stage_number", stage_number)
        .order("rank")
        .execute()
    )

    if ttt_result.data:
        return calculate_ttt_stage(stage_number, race_edition_id, riders, ttt_result.data)

    # Controleer of stage_results data heeft voor deze etappe
    results = (
        client.table("stage_results")
        .select("rank, rider_id, status")
        .eq("race_edition_id", race_edition_id)
        .eq("stage_number", stage_number)
        .not_.is_("rider_id", "null")
        .execute()
    )

    if not results.data:
        print(f"  Geen data gevonden — etappe nog niet geïmporteerd.")
        return False

    # Verwijder bestaande scores voor deze etappe
    client.table("stage_scores").delete().eq(
        "race_edition_id", race_edition_id
    ).eq("stage_number", stage_number).execute()

    # Bouw score-map per rider_id
    scores: dict[str, dict] = {}

    # Etappepunten op basis van finish-positie
    for r in results.data:
        rider_id = r.get("rider_id")
        if not rider_id:
            continue
        rank = r.get("rank")
        status = r.get("status", "DF")
        if status == "DF" and rank and 1 <= rank <= 20:
            scores.setdefault(rider_id, {})["punten_etappe"] = ETAPPE_PUNTEN[rank - 1]

    # Klassementspunten
    for tabel, punten_lijst, sleutel in [
        ("stage_gc", GC_PUNTEN, "punten_gc"),
        ("stage_points_classification", PUNTEN_KL_PUNTEN, "punten_punten"),
        ("stage_kom_classification", KOM_PUNTEN, "punten_kom"),
        ("stage_youth_classification", JONG_PUNTEN, "punten_jong"),
    ]:
        kl_map = build_classification_map(tabel, stage_number, race_edition_id, punten_lijst)
        for rider_id, punten in kl_map.items():
            scores.setdefault(rider_id, {})[sleutel] = punten

    # Bouw DB-rijen (0 als default voor ontbrekende categorieën)
    rows = []
    for rider_id, s in scores.items():
        rows.append({
            "race_edition_id": race_edition_id,
            "stage_number": stage_number,
            "rider_id": rider_id,
            "punten_etappe": s.get("punten_etappe", 0),
            "punten_gc": s.get("punten_gc", 0),
            "punten_punten": s.get("punten_punten", 0),
            "punten_kom": s.get("punten_kom", 0),
            "punten_jong": s.get("punten_jong", 0),
        })

    if not rows:
        print(f"  Geen scoreerbare rijders gevonden.")
        return False

    inserted = insert_batches("stage_scores", rows)
    print(f"  {inserted} rijders opgeslagen in stage_scores.")
    return True


def calculate_ttt_stage(stage_number: int, race_edition_id: str, riders: dict, ttt_data: list) -> bool:
    print(f"  TTT-etappe gedetecteerd ({len(ttt_data)} ploegen)")

    # Bouw team → punten map
    team_punten: dict[str, int] = {}
    for entry in ttt_data:
        rank = entry.get("rank")
        team_naam = entry.get("team_naam", "")
        if rank and 1 <= rank <= len(TTT_PUNTEN):
            team_punten[team_naam] = TTT_PUNTEN[rank - 1]

    if not team_punten:
        print(f"  Geen TTT-ploegen gevonden.")
        return False

    # Verwijder bestaande scores
    client.table("stage_scores").delete().eq(
        "race_edition_id", race_edition_id
    ).eq("stage_number", stage_number).execute()

    # Ken punten toe aan alle rijders uit de scorende teams
    rows = []
    for rider_id, ploeg in riders.items():
        # Normaliseer teamnaam (strip WT/PRT suffix indien aanwezig)
        ploeg_clean = ploeg.replace(" (WT)", "").replace(" (PRT)", "").strip()
        punten = team_punten.get(ploeg) or team_punten.get(ploeg_clean)
        if punten:
            rows.append({
                "race_edition_id": race_edition_id,
                "stage_number": stage_number,
                "rider_id": rider_id,
                "punten_etappe": punten,
                "punten_gc": 0,
                "punten_punten": 0,
                "punten_kom": 0,
                "punten_jong": 0,
            })

    if not rows:
        print(f"  Geen rijders gekoppeld aan scorende TTT-ploegen. Check teamnamen.")
        return False

    inserted = insert_batches("stage_scores", rows)
    print(f"  TTT: {inserted} rijders opgeslagen in stage_scores.")
    return True


def main():
    if len(sys.argv) < 2:
        print("Gebruik: python calculate_scores.py [etappenummer|all]")
        sys.exit(1)

    arg = sys.argv[1]

    race_edition_id = get_race_edition_id()
    print(f"race_edition_id: {race_edition_id}")

    riders = get_all_riders()
    print(f"Rijders geladen: {len(riders)}")

    if arg == "all":
        print("\nScores berekenen voor alle etappes met geïmporteerde data...")
        berekend = 0
        for nummer in range(1, 22):
            success = calculate_stage(nummer, race_edition_id, riders)
            if success:
                berekend += 1
            else:
                print(f"  Gestopt bij etappe {nummer} — geen data meer.")
                break
        print(f"\nKlaar. {berekend} etappes verwerkt.")
    else:
        try:
            nummer = int(arg)
        except ValueError:
            print(f"FOUT: Ongeldig argument '{arg}'. Gebruik een etappenummer (1-21) of 'all'.")
            sys.exit(1)

        if not 1 <= nummer <= 21:
            print(f"FOUT: Etappenummer moet tussen 1 en 21 liggen (gegeven: {nummer}).")
            sys.exit(1)

        calculate_stage(nummer, race_edition_id, riders)
        print("\nKlaar.")


if __name__ == "__main__":
    main()

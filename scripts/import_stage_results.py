"""
Sprint 1 — Etapperesultaten importeren
=======================================
Haalt per etappe de uitslag en klassementen op via procyclingstats en slaat op in Supabase.
Idempotent: opnieuw draaien geeft geen duplicaten (delete-then-insert per etappe).

Gebruik:
    python scripts/import_stage_results.py 3       # importeer etappe 3
    python scripts/import_stage_results.py all     # importeer alle gereden etappes

Vereisten:
    pip install procyclingstats supabase
    scripts/.env met SUPABASE_URL en SUPABASE_KEY (zie scripts/.env.example)
"""

import os
import sys
import time

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
from procyclingstats import Stage

client = create_client(SUPABASE_URL, SUPABASE_KEY)

RACE_SLUG = "giro-d-italia"
RACE_JAAR = 2026
RACE_URL_PREFIX = f"race/{RACE_SLUG}/{RACE_JAAR}"
BATCH_SIZE = 100


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


def get_known_rider_ids() -> set:
    result = client.table("riders").select("id").execute()
    return {r["id"] for r in result.data}


def insert_batches(tabel: str, rows: list):
    inserted = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        client.table(tabel).insert(batch).execute()
        inserted += len(batch)
    return inserted


def strip_team_suffix(name: str) -> str:
    return name.replace(" (WT)", "").replace(" (PRT)", "").strip()


def delete_stage_data(stage_number: int, race_edition_id: str):
    tabellen = [
        "stage_results",
        "stage_gc",
        "stage_points_classification",
        "stage_kom_classification",
        "stage_youth_classification",
    ]
    for tabel in tabellen:
        client.table(tabel).delete().eq("race_edition_id", race_edition_id).eq(
            "stage_number", stage_number
        ).execute()


def import_ttt_stage(
    stage: Stage, stage_number: int, race_edition_id: str
) -> bool:
    print(f"  Stage {stage_number}: TTT-etappe gedetecteerd")
    try:
        teams_raw = stage.teams()
    except Exception as e:
        print(f"  Stage {stage_number}: TTT team-data niet beschikbaar: {e}")
        return False

    client.table("stage_ttt_results").delete().eq(
        "race_edition_id", race_edition_id
    ).eq("stage_number", stage_number).execute()

    rows = []
    for i, team in enumerate(teams_raw[:8]):
        rows.append(
            {
                "race_edition_id": race_edition_id,
                "stage_number": stage_number,
                "rank": i + 1,
                "team_naam": strip_team_suffix(team.get("team_name", "")),
                "tijd_gap": team.get("time"),
            }
        )

    if rows:
        client.table("stage_ttt_results").insert(rows).execute()
        print(f"  Stage {stage_number}: {len(rows)} TTT-ploegen opgeslagen")

    return True


def import_classification(
    tabel: str,
    data: list,
    stage_number: int,
    race_edition_id: str,
    known_rider_ids: set,
):
    rows = []
    for entry in data:
        rider_url = entry.get("rider_url", "")
        rider_id = rider_url.replace("rider/", "") if rider_url else None
        if rider_id and rider_id not in known_rider_ids:
            print(f"    WARNING: {rider_id} niet in riders-tabel, rider_id=None")
            rider_id = None
        rows.append(
            {
                "race_edition_id": race_edition_id,
                "stage_number": stage_number,
                "rank": entry.get("rank"),
                "rider_id": rider_id,
                "rider_naam": entry.get("rider_name", ""),
            }
        )
    if rows:
        client.table(tabel).insert(rows).execute()
    return len(rows)


def import_stage(
    stage_number: int, race_edition_id: str, known_rider_ids: set
) -> bool:
    url = f"{RACE_URL_PREFIX}/stage-{stage_number}"
    print(f"\nEtappe {stage_number}: {url}")

    try:
        stage = Stage(url)
        results = stage.results()
    except Exception as e:
        print(f"  Resultaten niet beschikbaar (etappe nog niet gereden?): {e}")
        return False

    # TTT-etappes apart afhandelen
    if stage.stage_type() == "TTT":
        return import_ttt_stage(stage, stage_number, race_edition_id)

    # Verwijder bestaande data voor deze etappe
    delete_stage_data(stage_number, race_edition_id)

    # ── stage_results: top 20 finishers + alle DNF/DNS/OTL ──────────────────
    scoring_results = [
        r
        for r in results
        if (r.get("rank") is not None and r["rank"] <= 20)
        or r.get("status") in ("DNF", "DNS", "OTL")
    ]

    rows = []
    skipped = 0
    for r in scoring_results:
        rider_url = r.get("rider_url", "")
        rider_id = rider_url.replace("rider/", "") if rider_url else None
        if rider_id and rider_id not in known_rider_ids:
            print(f"    WARNING: {rider_id} niet in riders-tabel, overgeslagen")
            skipped += 1
            continue
        rows.append(
            {
                "race_edition_id": race_edition_id,
                "stage_number": stage_number,
                "rank": r.get("rank"),
                "rider_id": rider_id,
                "rider_naam": r.get("rider_name", ""),
                "tijd_gap": r.get("time"),
                "status": r.get("status", "DF"),
            }
        )

    inserted = insert_batches("stage_results", rows)
    if skipped:
        print(f"  stage_results: {inserted} rijen opgeslagen, {skipped} overgeslagen")
    else:
        print(f"  stage_results: {inserted} rijen opgeslagen")

    # ── Klassementen ────────────────────────────────────────────────────────
    try:
        gc_n = import_classification(
            "stage_gc", stage.gc()[:5], stage_number, race_edition_id, known_rider_ids
        )
        print(f"  stage_gc: top {gc_n} opgeslagen")
    except Exception as e:
        print(f"  stage_gc: FOUT — {e}")

    try:
        pts_n = import_classification(
            "stage_points_classification",
            stage.points()[:5],
            stage_number,
            race_edition_id,
            known_rider_ids,
        )
        print(f"  stage_points_classification: top {pts_n} opgeslagen")
    except Exception as e:
        print(f"  stage_points_classification: FOUT — {e}")

    try:
        kom_n = import_classification(
            "stage_kom_classification",
            stage.kom()[:5],
            stage_number,
            race_edition_id,
            known_rider_ids,
        )
        print(f"  stage_kom_classification: top {kom_n} opgeslagen")
    except Exception as e:
        print(f"  stage_kom_classification: FOUT — {e}")

    try:
        youth_n = import_classification(
            "stage_youth_classification",
            stage.youth()[:5],
            stage_number,
            race_edition_id,
            known_rider_ids,
        )
        print(f"  stage_youth_classification: top {youth_n} opgeslagen")
    except Exception as e:
        print(f"  stage_youth_classification: FOUT — {e}")

    print(f"  Stage {stage_number}: OK")
    return True


def main():
    if len(sys.argv) < 2:
        print("Gebruik: python import_stage_results.py [etappenummer|all]")
        sys.exit(1)

    arg = sys.argv[1]

    race_edition_id = get_race_edition_id()
    print(f"race_edition_id: {race_edition_id}")

    known_rider_ids = get_known_rider_ids()
    print(f"Bekende riders: {len(known_rider_ids)}")

    if arg == "all":
        print("\nImporteren alle gereden etappes (stopt bij eerste niet-gereden etappe)...")
        for nummer in range(1, 22):
            success = import_stage(nummer, race_edition_id, known_rider_ids)
            if not success:
                print(f"\nGestopt bij etappe {nummer} — alle gereden etappes geïmporteerd.")
                break
            if nummer < 21:
                time.sleep(1)
        print("\nKlaar.")
    else:
        try:
            nummer = int(arg)
        except ValueError:
            print(f"FOUT: Ongeldig argument '{arg}'. Gebruik een etappenummer (1-21) of 'all'.")
            sys.exit(1)

        if not 1 <= nummer <= 21:
            print(f"FOUT: Etappenummer moet tussen 1 en 21 liggen (gegeven: {nummer}).")
            sys.exit(1)

        import_stage(nummer, race_edition_id, known_rider_ids)
        print("\nKlaar.")


if __name__ == "__main__":
    main()

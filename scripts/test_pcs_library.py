"""
Sprint 0 — Taak 0.2/0.3: PCS Library Verificatie
===================================================
Test alle procyclingstats API-calls die we voor de app nodig hebben.
Geen applicatiecode aangeraakt — puur standalone verificatie.

Resultaten worden na afloop samengevat als LIBRARY_TEST_RESULTS.md.

Gebruik:
    python scripts/test_pcs_library.py
"""

import json
import os
import time
import sys
from datetime import date

# ── Library imports ────────────────────────────────────────────────────────────
try:
    from procyclingstats import RaceStartlist, Race, Stage, Rider
    print("✅ procyclingstats importeerbaar\n")
except ImportError as e:
    print(f"❌ Import mislukt: {e}")
    print("   Voer uit: pip install procyclingstats")
    sys.exit(1)

# ── Referentiedata laden ───────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(__file__)
RIDERS_JSON = os.path.join(SCRIPT_DIR, "..", "frontend", "src", "data", "riders.json")
STAGES_JSON = os.path.join(SCRIPT_DIR, "..", "frontend", "src", "data", "stages.json")

with open(RIDERS_JSON, encoding="utf-8") as f:
    existing_riders = {r["id"]: r for r in json.load(f)}

with open(STAGES_JSON, encoding="utf-8") as f:
    existing_stages = {s["nummer"]: s for s in json.load(f)}

RACE_SLUG = "race/giro-d-italia/2026"

results = {}  # Wordt gevuld met bevindingen per test-sectie

# ──────────────────────────────────────────────────────────────────────────────
# A. STARTLIJST
# ──────────────────────────────────────────────────────────────────────────────
print("=" * 60)
print("A. STARTLIJST — RaceStartlist")
print("=" * 60)

try:
    t0 = time.time()
    sl = RaceStartlist(f"{RACE_SLUG}/startlist")
    startlist_data = sl.startlist()
    elapsed = time.time() - t0

    print(f"   Response-tijd: {elapsed:.2f}s")
    print(f"   Aantal renners: {len(startlist_data)}")

    if startlist_data:
        # Toon alle beschikbare velden van eerste item
        sample = startlist_data[0]
        print(f"   Beschikbare velden: {list(sample.keys())}")
        print(f"   Voorbeeld: {sample}")

        # Controleer aanwezigheid van rider_url (slug)
        has_rider_url = "rider_url" in sample
        has_name = "rider_name" in sample or "name" in sample
        has_team = "team_name" in sample or "team" in sample

        print(f"\n   Veld 'rider_url' aanwezig: {'✅' if has_rider_url else '❌'}")
        print(f"   Naam-veld aanwezig: {'✅' if has_name else '❌ – beschikbare velden: ' + str(list(sample.keys()))}")
        print(f"   Ploeg-veld aanwezig: {'✅' if has_team else '❌'}")
        print(f"   ≥ 180 renners: {'✅' if len(startlist_data) >= 180 else '⚠️ slechts ' + str(len(startlist_data))}")

        # Vergelijk 5 renners met bestaande riders.json
        print("\n   Match-check met bestaande riders.json (steekproef 5 renners):")
        rider_url_key = "rider_url" if "rider_url" in sample else None
        matches = 0
        checked = 0
        for item in startlist_data[:20]:
            if rider_url_key and item.get(rider_url_key):
                # PCS rider_url is bijv. "rider/tadej-pogacar"
                rider_id = item[rider_url_key].replace("rider/", "")
                if rider_id in existing_riders:
                    matches += 1
                if checked < 5:
                    status = "✅" if rider_id in existing_riders else "⚠️ nieuw"
                    print(f"     {rider_id}: {status}")
                checked += 1
        if checked > 0:
            print(f"   Match rate (eerste 20): {matches}/{checked}")

    results["A_startlist"] = {
        "status": "OK" if len(startlist_data) >= 180 else "WARN",
        "count": len(startlist_data),
        "fields": list(startlist_data[0].keys()) if startlist_data else [],
        "response_time_s": round(elapsed, 2),
    }

except Exception as e:
    print(f"   ❌ Fout: {e}")
    results["A_startlist"] = {"status": "ERROR", "error": str(e)}

# ──────────────────────────────────────────────────────────────────────────────
# B. ETAPPEOVERZICHT
# ──────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("B. ETAPPEOVERZICHT — Race.stages()")
print("=" * 60)

try:
    t0 = time.time()
    race = Race(RACE_SLUG)
    stages_data = race.stages()
    elapsed = time.time() - t0

    print(f"   Response-tijd: {elapsed:.2f}s")
    print(f"   Aantal etappes: {len(stages_data)}")

    if stages_data:
        sample = stages_data[0]
        print(f"   Beschikbare velden: {list(sample.keys())}")
        print(f"\n   Ruwe data per etappe (voor terreintype-mapping):")
        for s in stages_data:
            profile_raw = s.get("profile_icon", s.get("profile", s.get("stage_type", "?")))
            print(f"     Etappe {s.get('stage_name','?'):30s}  profiel={profile_raw}  afstand={s.get('distance','?')}")

        # Vergelijk etappe 1-3 met bestaande stages.json
        print("\n   Vergelijking etappe 1-3 met stages.json:")
        for s in stages_data[:3]:
            # Etappenummer bepalen uit stage_url of stage_name
            stage_url = s.get("stage_url", "")
            stage_name = s.get("stage_name", "")
            # Probeer nummer te extraheren
            num = None
            for part in stage_url.split("/"):
                if "stage-" in part:
                    try:
                        num = int(part.replace("stage-", ""))
                    except ValueError:
                        pass
            if num is None:
                # Probeer uit stage_name: "Stage 1" of "1"
                import re
                m = re.search(r'\d+', stage_name)
                num = int(m.group()) if m else None

            if num and num in existing_stages:
                ex = existing_stages[num]
                lib_dist = s.get("distance", "?")
                ex_dist = ex.get("afstand", "?")
                print(f"     Etappe {num}: lib_afstand={lib_dist} | json_afstand={ex_dist} "
                      f"| start={s.get('departure_city', s.get('start','?'))} "
                      f"| finish={s.get('arrival_city', s.get('finish','?'))}")

    results["B_stages"] = {
        "status": "OK" if len(stages_data) == 21 else "WARN",
        "count": len(stages_data),
        "fields": list(stages_data[0].keys()) if stages_data else [],
        "response_time_s": round(elapsed, 2),
    }

except Exception as e:
    print(f"   ❌ Fout: {e}")
    results["B_stages"] = {"status": "ERROR", "error": str(e)}

# ──────────────────────────────────────────────────────────────────────────────
# C. ETAPPERESULTATEN
# ──────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("C. ETAPPERESULTATEN — Stage.results() / .gc() / .points() / .kom() / .youth()")
print("=" * 60)

# Test etappes die al gereden zijn (Giro 2026 start 8 mei, vandaag 12 mei → etappes 1-4 gereden)
test_stages = [1, 2, 3, 4]
stage_results_sample = {}

for stage_num in test_stages:
    stage_url = f"{RACE_SLUG}/stage-{stage_num}"
    print(f"\n   --- Etappe {stage_num} ({stage_url}) ---")
    time.sleep(1)  # Rate limiting

    try:
        t0 = time.time()
        s = Stage(stage_url)
        elapsed = time.time() - t0
        print(f"   Stage object aangemaakt in {elapsed:.2f}s")

        # results()
        try:
            t0 = time.time()
            res = s.results()
            elapsed_r = time.time() - t0
            print(f"   results(): {len(res)} items in {elapsed_r:.2f}s")
            if res:
                print(f"     Velden: {list(res[0].keys())}")
                print(f"     Top-3: {res[:3]}")
                # Controleer DNF-renners
                dnf_items = [r for r in res if r.get("status", "") not in ("", None)
                             or str(r.get("rank", "")).upper() in ("DNF", "DNS", "OTL", "")]
                print(f"     DNF/DNS/OTL gedetecteerd: {len(dnf_items)} (van {len(res)} totaal)")
                stage_results_sample[stage_num] = {"fields": list(res[0].keys()), "sample": res[:2]}
        except Exception as e:
            print(f"   results(): ❌ {e}")

        time.sleep(0.5)

        # gc()
        try:
            gc = s.gc()
            print(f"   gc(): {len(gc)} items | velden: {list(gc[0].keys()) if gc else '[]'}")
            if gc:
                print(f"     Top-3: {gc[:3]}")
        except Exception as e:
            print(f"   gc(): ❌ {e}")

        time.sleep(0.5)

        # points()
        try:
            pts = s.points()
            print(f"   points(): {len(pts)} items | velden: {list(pts[0].keys()) if pts else '[]'}")
            if pts:
                print(f"     Top-3: {pts[:3]}")
        except Exception as e:
            print(f"   points(): ❌ {e}")

        time.sleep(0.5)

        # kom()
        try:
            kom = s.kom()
            print(f"   kom(): {len(kom)} items | velden: {list(kom[0].keys()) if kom else '[]'}")
            if kom:
                print(f"     Top-3: {kom[:3]}")
        except Exception as e:
            print(f"   kom(): ❌ {e}")

        time.sleep(0.5)

        # youth()
        try:
            youth = s.youth()
            print(f"   youth(): {len(youth)} items | velden: {list(youth[0].keys()) if youth else '[]'}")
            if youth:
                print(f"     Top-3: {youth[:3]}")
        except Exception as e:
            print(f"   youth(): ❌ {e}")

        # TTT-herkenning: controleer welke methoden beschikbaar zijn
        if stage_num == 1:
            available_methods = [m for m in dir(s) if not m.startswith("_")]
            print(f"\n   Beschikbare Stage-methoden: {available_methods}")

    except Exception as e:
        print(f"   ❌ Stage object fout: {e}")

results["C_stage_results"] = {
    "stages_tested": test_stages,
    "sample_fields": stage_results_sample,
}

# ──────────────────────────────────────────────────────────────────────────────
# D. RENNER-PROFIEL
# ──────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("D. RENNER-PROFIEL — Rider.points_per_speciality() + birthdate()")
print("=" * 60)

test_riders = [
    "tadej-pogacar",
    "jonas-vingegaard",
    "remco-evenepoel",
    "mathieu-van-der-poel",
    "primoz-roglic",
]

rider_profile_results = {}
for rider_slug in test_riders:
    print(f"\n   Renner: {rider_slug}")
    time.sleep(1)  # Rate limiting

    try:
        t0 = time.time()
        r = Rider(f"cyclist/{rider_slug}")
        elapsed = time.time() - t0

        # points_per_speciality
        try:
            specs = r.points_per_speciality()
            print(f"   points_per_speciality() ({elapsed:.2f}s): {specs}")
            rider_profile_results[rider_slug] = {"specs": specs}
        except Exception as e:
            print(f"   points_per_speciality(): ❌ {e}")
            rider_profile_results[rider_slug] = {"specs_error": str(e)}

        # birthdate
        try:
            bd = r.birthdate()
            leeftijd = (date.today() - date.fromisoformat(bd)).days // 365 if bd else None
            print(f"   birthdate(): {bd} → leeftijd: {leeftijd}")
            rider_profile_results[rider_slug]["birthdate"] = bd
            rider_profile_results[rider_slug]["leeftijd"] = leeftijd
        except Exception as e:
            print(f"   birthdate(): ❌ {e}")

    except Exception as e:
        print(f"   ❌ Rider object fout: {e}")
        rider_profile_results[rider_slug] = {"error": str(e)}

results["D_rider_profiles"] = rider_profile_results

# ──────────────────────────────────────────────────────────────────────────────
# E. RATE LIMITING
# ──────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("E. RATE LIMITING — Response-tijden meten")
print("=" * 60)

rate_times = {}
for rider_slug in ["tadej-pogacar", "jonas-vingegaard", "remco-evenepoel"]:
    t0 = time.time()
    try:
        r = Rider(f"cyclist/{rider_slug}")
        r.points_per_speciality()
        elapsed = time.time() - t0
        rate_times[rider_slug] = round(elapsed, 2)
        print(f"   {rider_slug}: {elapsed:.2f}s ✅")
    except Exception as e:
        elapsed = time.time() - t0
        rate_times[rider_slug] = f"ERROR: {e}"
        print(f"   {rider_slug}: ❌ {e}")
    time.sleep(1)

results["E_rate_limiting"] = rate_times

# ──────────────────────────────────────────────────────────────────────────────
# SAMENVATTING
# ──────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("SAMENVATTING")
print("=" * 60)

for key, val in results.items():
    status = val.get("status", "—")
    print(f"   {key}: {status}")

# Sla ruwe resultaten op voor gebruik in LIBRARY_TEST_RESULTS.md
output_path = os.path.join(SCRIPT_DIR, "test_pcs_raw_results.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False, default=str)
print(f"\n   Ruwe resultaten opgeslagen: {output_path}")
print("\nKlaar! Gebruik de output hierboven om LIBRARY_TEST_RESULTS.md in te vullen.")

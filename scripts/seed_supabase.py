"""
Sprint 0 — Taak 0.5: Supabase seed
====================================
Laadt bestaande riders.json en stages.json in de nieuwe Supabase-tabellen.
Idempotent: twee keer draaien geeft geen duplicaten (upsert op primary key).

Gebruik:
    set SUPABASE_URL=https://tegssdqwvzpmlwzhtfiw.supabase.co
    set SUPABASE_KEY=<anon-key>
    python scripts/seed_supabase.py

Of via .env bestand: kopieer scripts/.env.example naar scripts/.env en vul in.
"""

import json
import os
import sys

# ── Credentials laden ──────────────────────────────────────────────────────────
# Probeer eerst .env bestand (optioneel), dan environment variables
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

# ── Pad naar data-bestanden ────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(__file__)
RIDERS_JSON = os.path.join(SCRIPT_DIR, "..", "frontend", "src", "data", "riders.json")
STAGES_JSON = os.path.join(SCRIPT_DIR, "..", "frontend", "src", "data", "stages.json")

# ── Stap 1: race_edition aanmaken (upsert) ─────────────────────────────────────
print("Stap 1: race_edition aanmaken voor Giro d'Italia 2026...")

race_data = {
    "naam":      "Giro d'Italia",
    "jaar":      2026,
    "race_slug": "giro-d-italia",
    "race_url":  "race/giro-d-italia/2026",
    "budget":    42000000,
    "status":    "actief",
}

result = client.table("race_editions").upsert(
    race_data,
    on_conflict="race_slug,jaar"
).execute()

if not result.data:
    print("  FOUT: race_edition aanmaken mislukt.")
    sys.exit(1)

race_edition_id = result.data[0]["id"]
print(f"  OK: race_edition_id = {race_edition_id}")

# ── Stap 2: riders laden en upserten ──────────────────────────────────────────
print("\nStap 2: riders.json laden en upserten naar Supabase...")

with open(RIDERS_JSON, encoding="utf-8") as f:
    riders_raw = json.load(f)

riders_payload = []
for r in riders_raw:
    riders_payload.append({
        "id":                 r["id"],
        "naam":               r["naam"],
        "ploeg":              r["ploeg"],
        "scorito_categorie":  r.get("scorito_categorie"),
        "gebruiker_type":     r.get("gebruiker_type"),
        "prijs":              r.get("prijs"),
        "is_actief":          r.get("is_actief", True),
        "is_jongere":         r.get("is_jongere", False),
        # PCS-scores: nog niet beschikbaar, worden later ingevuld via US-1.3
        "pcs_gc":             r.get("pcs_gc"),
        "pcs_tt":             r.get("pcs_tt"),
        "pcs_sprint":         r.get("pcs_sprint"),
        "pcs_climber":        r.get("pcs_climber"),
        "pcs_hills":          r.get("pcs_hills"),
        "pcs_one_day":        r.get("pcs_one_day"),
        "pcs_leeftijd":       r.get("pcs_leeftijd"),
    })

# Supabase upsert in batches van 100 (limiet per request)
BATCH_SIZE = 100
total_riders = len(riders_payload)
inserted = 0

for i in range(0, total_riders, BATCH_SIZE):
    batch = riders_payload[i:i + BATCH_SIZE]
    result = client.table("riders").upsert(batch, on_conflict="id").execute()
    inserted += len(result.data)
    print(f"  Batch {i // BATCH_SIZE + 1}: {len(result.data)} renners verwerkt")

print(f"  OK: {inserted}/{total_riders} renners in Supabase")

# ── Stap 3: stages laden en upserten ──────────────────────────────────────────
print("\nStap 3: stages.json laden en upserten naar Supabase...")

with open(STAGES_JSON, encoding="utf-8") as f:
    stages_raw = json.load(f)

stages_payload = []
for s in stages_raw:
    stages_payload.append({
        "race_edition_id": race_edition_id,
        "nummer":          s["nummer"],
        "datum":           s["datum"],
        "startplaats":     s.get("startplaats"),
        "finishplaats":    s.get("finishplaats"),
        "afstand":         s.get("afstand"),
        "terreintype":     s.get("terreintype"),
        "hoogteverschil":  s.get("hoogteverschil"),
        "weging_tijdrit":  s.get("weging_tijdrit", False),
    })

result = client.table("stages").upsert(
    stages_payload,
    on_conflict="race_edition_id,nummer"
).execute()

print(f"  OK: {len(result.data)}/21 etappes in Supabase")

# ── Verificatie ────────────────────────────────────────────────────────────────
print("\nVerificatie:")
races  = client.table("race_editions").select("id, naam, jaar, status").execute()
riders = client.table("riders").select("id", count="exact").execute()
stages = client.table("stages").select("id", count="exact").execute()

print(f"  race_editions: {len(races.data)} rij(en) — {races.data}")
print(f"  riders:        {riders.count} rijen")
print(f"  stages:        {stages.count} rijen")

print("\nSeed voltooid!")

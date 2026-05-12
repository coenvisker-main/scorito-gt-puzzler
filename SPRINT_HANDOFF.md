# Sprint Handoff

---

## Sprint 0 → Sprint 1

**Datum:** 2026-05-12  
**Branch:** `main` (commit `4c15ef2`)  
**Volgende sprint:** Sprint 1 — Etapperesultaten importeren

---

## Wat er WEL gedaan is in Sprint 0

### Fase 1 — Library Verificatie (het harde criterium)

De `procyclingstats` pip-library (v0.2.7) is getest tegen **live PCS-data** van de Giro 2026 zonder ook maar één regel applicatiecode aan te raken.

| Test | Resultaat |
|---|---|
| Startlijst (`RaceStartlist`) | ✅ 184 renners, alle velden aanwezig |
| Etappeoverzicht (`Race.stages()`) | ✅ 21 etappes + terreintype-mapping |
| Etapperesultaten (`Stage.results()`) | ✅ Etappes 1, 2, 3 getest |
| GC/punten/berg/jong klassementen | ✅ Alle 4 methoden werken |
| DNF/DNS herkenning | ✅ `status="DNF"`, `rank=None` |
| Renner-specialisaties (`Rider`) | ✅ Na URL-correctie (zie bevindingen) |
| Rate limiting (1s interval) | ✅ Geen HTTP 429 |
| **Blockers** | **Geen — GO voor Sprint 1** |

Bevindingen gedocumenteerd in `scripts/LIBRARY_TEST_RESULTS.md`.

### Fase 2 — Supabase Schema & Seed

**Schema:**  
8 nieuwe tabellen aangemaakt via migratie (`sprint0_race_data_schema`):
- `race_editions` — ronde-edities
- `riders` — renners (PCS slug als primary key)
- `stages` — etappes
- `stage_results` — etappe-uitslag per renner
- `stage_gc` — GC-klassement per etappe
- `stage_points_classification` — puntenklassement per etappe
- `stage_kom_classification` — bergklassement per etappe
- `stage_youth_classification` — jongerenklassement per etappe
- `stage_ttt_results` — TTT-ploegresultaten

**Seed:**
- 1 race_edition: Giro d'Italia 2026 (`race_edition_id: dfaabe0c-d838-4942-96dd-0071fce726b7`)
- 182 renners geladen vanuit `riders.json`
- 21 etappes geladen vanuit `stages.json`

**Bestanden aangemaakt (allemaal gecommit op main):**
```
scripts/requirements-python.txt    — Python package dependencies
scripts/test_pcs_library.py        — verificatiescript (herbruikbaar)
scripts/LIBRARY_TEST_RESULTS.md    — veldmapping en bevindingen
scripts/seed_supabase.py           — seed-script (idempotent)
scripts/.env.example               — template voor credentials
```

---

## Wat er NIET gedaan is in Sprint 0

| Niet gedaan | Reden / Geplande sprint |
|---|---|
| Bestaande `import_riders.py` en `import_stages.py` vervangen | Bewust uitgesteld: zie advies onder |
| Rider-specialisatiescores inladen (pcs_gc, pcs_tt, etc.) | Sprint 4 (US-1.3) |
| Frontend-code gewijzigd | Was expliciet buiten scope |
| `server.js` gewijzigd | Was expliciet buiten scope |
| Stage-resultaten geïmporteerd | Sprint 1 (nu) |
| TTT-etappe getest | Geen TTT-etappe gereden in Giro 2026 tot nu toe |
| RLS-beleid ingesteld op nieuwe tabellen | Bewust uitgesteld; de app is privé en auth bestaat nog niet |

---

## Kritieke bevindingen voor Sprint 1

Moet je weten voordat je begint:

### 1. Rider URL-prefix: `rider/` NIET `cyclist/`
```python
r = Rider("rider/tadej-pogacar")   # ✅ correct
r = Rider("cyclist/tadej-pogacar") # ❌ geeft "HTML invalid" fout
```

### 2. `Race.stages()` geeft geen afstand/start/finish
`Race(url).stages()` retourneert alleen `stage_name`, `stage_url`, `profile_icon`, `date`.  
Voor distance, departure, arrival, vertical_meters: gebruik `Stage(url)`.

```python
s = Stage("race/giro-d-italia/2026/stage-1")
s.distance()        # → 147.0
s.departure()       # → "Nessebar"
s.arrival()         # → "Burgas"
s.stage_type()      # → "RR" | "ITT" | "TTT"
```

### 3. Niet-gereden etappe gooit exception
```python
Stage("race/giro-d-italia/2026/stage-4").results()
# → raises: "Results table not in page HTML"
# Altijd wrappen in try/except
```

### 4. DNF/DNS rijders hebben rank=None
```python
# Finisher:   {'rank': 5,    'status': 'DF',  ...}
# DNF rijder: {'rank': None, 'status': 'DNF', ...}
# DNS rijder: {'rank': None, 'status': 'DNS', ...}
```

### 5. Klassementen geven ALLE gerankten terug (niet alleen top 5)
`Stage.gc()`, `.points()`, `.kom()`, `.youth()` retourneren het volledige klassement.  
Wij moeten zelf slicen: `gc[:5]`, `points[:5]`, `kom[:5]`, `youth[:4]`.

### 6. Team-naam bevat suffix
`team_name` heeft `(WT)` of `(PRT)` suffix. Strip bij opslag:
```python
team_naam.replace(" (WT)", "").replace(" (PRT)", "")
```

### 7. Etappe 4 is vandaag (12 mei)
Resultaten beschikbaar vanavond/morgen. Etappes 1-3 zijn al inhaalbaar bij sprint-start.

### 8. race_edition_id voor alle DB-schrijfacties
```
race_edition_id = dfaabe0c-d838-4942-96dd-0071fce726b7
```
Alle nieuwe tabellen (stage_results, stage_gc, etc.) verwijzen hier naar.  
Haal het dynamisch op met:
```python
result = client.table("race_editions")
    .select("id")
    .eq("race_slug", "giro-d-italia")
    .eq("jaar", 2026)
    .single()
    .execute()
race_edition_id = result.data["id"]
```

---

## Supabase-verbinding

Project: `tegssdqwvzpmlwzhtfiw` (eu-central-1, ACTIVE_HEALTHY)  
URL: `https://tegssdqwvzpmlwzhtfiw.supabase.co`  
Sleutel: Gebruik de anon key uit de Supabase dashboard of vraag aan de beheerder.  
Maak een `scripts/.env` bestand aan (zie `scripts/.env.example`).

---

## Advies: wanneer bestaande scrapers vervangen?

De migratie van `import_riders.py` en `import_stages.py` naar de `procyclingstats`-library staat op de backlog als US-1.1 en US-1.2. Aanbeveling: **doe dit direct na Sprint 2**, niet later.

**Waarom na Sprint 2:**
- Na Sprint 1 schrijven de nieuwe importscripts naar Supabase
- De oude scrapers schrijven nog steeds naar `riders.json`
- Dit geeft twee losse datastores die uit sync kunnen lopen halverwege de Giro
- De veldmapping is al volledig gedocumenteerd in `LIBRARY_TEST_RESULTS.md`

**Niet eerder dan Sprint 2:**
- Sprints 1 en 2 zijn urgent (Giro loopt), geen tijd voor migratie
- De seed-data is al correct in Supabase, de oude scrapers worden niet meer actief gebruikt

---

## Sprint 1 — Startpunt

Wat Sprint 1 gaat bouwen (US-2.1 t/m 2.4):

1. **Python importscript** `scripts/import_stage_results.py`:
   - Haalt per etappe: results, gc, points, kom, youth op via `Stage(url)`
   - Schrijft naar Supabase: `stage_results`, `stage_gc`, `stage_points_classification`, `stage_kom_classification`, `stage_youth_classification`
   - Idempotent (upsert, geen duplicaten)
   - Vangt exception op bij niet-gereden etappes

2. **Admin API-endpoint** in `server.js`:
   - `POST /api/import-stage/:nummer` — triggert het importscript voor etappe N
   
3. **Admin UI knop** in `AdminDashboard.tsx`:
   - "Importeer etappe [X] resultaten"
   - Toont status/output

4. **Inhaalimport** voor etappes 1-4 die al gereden zijn bij sprint-start

**Branch:** Ga verder op `main`. Geen feature branch nodig voor kleine groep.

---

*Handoff opgesteld: 2026-05-12*

# Sprint Handoff

---

## Sprint 1 → Sprint 2

**Datum:** 2026-05-12  
**Branch:** `main` (commit `8b5fb46`)  
**Volgende sprint:** Sprint 2 — Scoringsberekening

---

## Wat er WEL gedaan is in Sprint 1

### Etapperesultaten importpipeline (US-2.1 t/m 2.4)

**Nieuw bestand:** `scripts/import_stage_results.py`  
CLI-script dat via `procyclingstats` per etappe ophaalt en naar Supabase schrijft:
- `stage_results`: top 20 finishers + alle DNF/DNS/OTL
- `stage_gc`, `stage_points_classification`, `stage_kom_classification`, `stage_youth_classification`: top 5 per klassement
- `stage_ttt_results`: top 8 ploegen bij TTT-etappes
- Idempotent via delete-then-insert (geen duplicaten bij herdraaien)
- Onbekende riders overgeslagen met warning in stdout

**Gebruik:**
```
python scripts/import_stage_results.py 4     # één etappe
python scripts/import_stage_results.py all   # alle gereden etappes (stopt bij eerste niet-gereden)
```

**`frontend/server.js`** — nieuw endpoint:
```
POST /api/import-stage/:nummer    (nummer = 1-21 of "all", timeout 5 min)
```

**`frontend/src/components/AdminDashboard.tsx`** — nieuwe sectie "Etappe Resultaten":
- 21 stage-buttons (groen = al geïmporteerd, geladen via Supabase bij mount)
- Bulk-knop "Importeer alle gereden etappes"
- Output-log toont Python stdout na import

**Startlijst bijgewerkt:** 184 rijders (was 182). Toegevoegd:
- MIHKELS Madis — EF Education - EasyPost — €1.000.000 — jongere
- STANNARD Robert — Bahrain - Victorious — €500.000

---

## Huidige staat van de database (na inhaalimport)

**Supabase project:** `tegssdqwvzpmlwzhtfiw` (eu-central-1)  
**race_edition_id:** `dfaabe0c-d838-4942-96dd-0071fce726b7`

### stage_results

| Etappe | Finishers (top 20) | Uitvallers | Status |
|--------|--------------------|------------|--------|
| 1 | 20 | 0 | ✅ Compleet |
| 2 | 20 | 5 | ✅ Compleet |
| 3 | 20 | 2 | ✅ Compleet |
| 4 | 0 | 1 | ⚠️ Onvolledig — gereden 2026-05-12, PCS nog niet bijgewerkt |

### Klassementen (stage_gc / stage_points / stage_kom / stage_youth)

| Etappe | GC | Punten | Berg | Jongeren |
|--------|----|--------|------|---------|
| 1 | 5 | 5 | 4* | 5 |
| 2 | 5 | 5 | 5 | 5 |
| 3 | 5 | 5 | 5 | 5 |
| 4 | — | — | — | — |

*KOM etappe 1 heeft 4 rijen: PCS had slechts 4 geklasseerde klimsers na etappe 1 (correct).

---

## Wat er NIET gedaan is in Sprint 1

| Niet gedaan | Reden / Geplande sprint |
|---|---|
| Etappe 4 volledig importeren | Gereden op 2026-05-12, PCS-uitslag nog niet beschikbaar |
| `import_riders.py` vervangen door procyclingstats | Bewust uitgesteld na Sprint 2 (zie Sprint 0 handoff) |
| Score-berekening | Sprint 2 (nu) |
| Score-weergave in UI | Sprint 2 (nu) |
| Rider-specialisatiescores (pcs_gc etc.) | Sprint 4 (US-1.3) |
| RLS-beleid op Supabase-tabellen | Uitgesteld tot vóór publieke release |

---

## Open acties vóór Sprint 2 start

1. **Etappe 4 herimporten** zodra PCS de uitslag publiceert (vanavond/morgen):
   ```
   python scripts/import_stage_results.py 4
   ```
   Of via de Admin UI knop "Importeer etappe 4".

2. **Dagelijks importeren** tijdens de Giro: na elke etappe de knop drukken of het script draaien.

---

## Kritieke bevindingen voor Sprint 2

### 1. Scorito puntentabel (volledig, geverifieerd met gebruiker)

**Dagelijks (alleen opgestelde 9 rijders scoren dagelijks):**

| Situatie | Punten |
|---|---|
| Etappe-uitslag top 20 | 50/44/40/36/32/30/28/26/24/22, daarna -2 per positie t/m 20e (2 pt) |
| Kopman-bonus (K) | Etappepunten ×2 — ALLEEN etappe-uitslag, NIET klassement of teampunten |
| GC dagelijks top 5 | 10/8/6/4/2 |
| Puntenklassement top 5 | 8/6/4/2/1 |
| Bergklassement top 5 | 8/6/4/2/1 |
| Jongerenklassement top 5 | 6/4/3/2/1 |
| Teampunten dagelijks | Etappewinst=10, GC-leider=8, Puntenleider=6, KOM-leider=6, Jongerenleider=3 |
| Teampunten: alleen hoogste trui | Geel > Groen > Bolletjes > Wit (niet cumulatief) |

**DNF/DNS-regels:**
- **DNF** (uitgevallen tijdens etappe): scoort nog teampunten in die etappe, GEEN verdere punten daarna
- **DNS** (niet van start): scoort NIETS in die etappe

**Eindklassement (alle 20 teamleden tellen mee):**

| Klassement | Punten |
|---|---|
| GC top 20 | 100/80/60/50/40/36/32/28/24/22, daarna -2 t/m 20e (2 pt) |
| Puntenklassement top 10 | 80/60/40/30/20/16/12/8/4/2 |
| Bergklassement top 10 | 80/60/40/30/20/16/12/8/4/2 |
| Jongerenklassement top 5 | 60/40/30/20/10 |
| Eindklassement teampunten | GC-winnaar=24, Puntenleider=18, KOM-leider=18, Jongerenleider=9 |

**TTT:**
- Top 8 ploegen: 40/32/28/24/20/16/12/8
- Geen kopman-bonus, geen teampunten

### 2. Database-kolommen voor scoringslogica

`stage_results`:
```
stage_number (int), rank (int|null), rider_id (text), rider_naam (text),
tijd_gap (text), status (text: 'DF'|'DNF'|'DNS'|'OTL')
```
Let op: `status = 'DF'` is een finisher (niet `'finisher'` — dat is alleen de DB-default die we nooit gebruiken).

Klassement-tabellen (stage_gc / stage_points_classification / stage_kom_classification / stage_youth_classification):
```
stage_number (int), rank (int), rider_id (text|null), rider_naam (text)
```
Rank 1 = jersey-drager die dag → geeft teampunten aan ploeggenoten.

### 3. Teampunten-logica: jersey-drager vs. ploeggenoot

Teampunten gelden voor rijders in je opstelling die in dezelfde **ploeg** zitten als de jersey-drager.
- Jersey-drager zelf scoort geen aparte teampunten (alleen als hij in je opstelling staat via GC/punten/klassementbonus)
- Meerdere riders van dezelfde ploeg in je opstelling → allemaal teampunten
- Alleen de hoogste trui telt: als één rijder tegelijk leidt in GC én punten, tellen alleen de GC-teampunten (8), niet ook de punten-teampunten (6)

### 4. 192 rijders in Supabase, 184 in riders.json

8 "ghost riders" uit een eerdere testsessie. Niet verwijderd (upsert verwijdert niet). Ze verschijnen nooit in `stage_results` want ze rijden niet. Geen actie nodig voor Sprint 2.

### 5. Rijders zonder rider_id in klassementen

Madis Mihkels staat in sommige klassementen met `rider_id = null` (etappe 1, vóór hij aan de riders-tabel werd toegevoegd). Na de herdraaien van de import staan alle etappes correct met zijn rider_id. Check na etappe 4 herimporten.

---

## Sprint 2 — Startpunt

Wat Sprint 2 gaat bouwen:

### Primair: score-berekening per etappe

**Optie A — Python script** `scripts/calculate_scores.py`:
- Leest `stage_results` + klassementen uit Supabase
- Berekent per (rijder, etappe) de dagelijkse Scorito-punten
- Slaat op in nieuwe tabel `stage_scores` (rider_id, stage_number, punten_etappe, punten_gc, punten_punten, punten_kom, punten_jong, punten_team, punten_totaal)

**Optie B — Berekening in de frontend** (TypeScript):
- Haalt ruwe data op uit Supabase
- Berekent scores client-side op basis van de opgestelde opstelling in TeamContext
- Geen extra DB-tabel nodig

Aanbeveling: **Optie A** voor de algemene scores (wie scoort hoeveel los van een specifiek team), **Optie B** voor gepersonaliseerde team-scores (jouw opgestelde 9 rijders per etappe × jouw kopmannen).

### Secondair: score-weergave in UI

- In de TeamMatrix: kolom per etappe met behaalde punten per rijder
- Totaalstand onder het teamoverzicht
- Vergelijking verwacht (formula) vs. werkelijk (stage_results)

---

## Bestandsoverzicht Sprint 1

```
scripts/import_stage_results.py    — nieuw: PCS → Supabase import per etappe
scripts/.env                        — credentials (gitignored, aanmaken via .env.example)
frontend/server.js                  — POST /api/import-stage/:nummer endpoint toegevoegd
frontend/src/components/
  AdminDashboard.tsx                — "Etappe Resultaten" sectie toegevoegd
frontend/src/data/riders.json       — bijgewerkt: 184 rijders incl. Mihkels + Stannard
```

---

## Supabase-verbinding

Project: `tegssdqwvzpmlwzhtfiw` (eu-central-1, ACTIVE_HEALTHY)  
URL: `https://tegssdqwvzpmlwzhtfiw.supabase.co`  
Credentials: `scripts/.env` (aanmaken via `scripts/.env.example`)

---

*Handoff opgesteld: 2026-05-12*

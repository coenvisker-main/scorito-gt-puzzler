# Library Verificatie — Bevindingen Sprint 0

Datum: 2026-05-12  
Library: `procyclingstats` versie 0.2.7  
Race: Giro d'Italia 2026 (`race/giro-d-italia/2026`)

---

## Conclusie

**✅ GO — Fase 2 (Supabase schema) mag starten.**

Alle kritieke API-calls werken correct. Eén URL-conventie-bug in het testscript zelf (zie D), geen library-blocker.

---

## A. Startlijst — `RaceStartlist`

**Status: ✅ OK**

```python
sl = RaceStartlist("race/giro-d-italia/2026/startlist")
data = sl.startlist()  # → 184 renners
```

### Beschikbare velden
| Veld | Type | Voorbeeld |
|---|---|---|
| `rider_name` | str | `"GROVES Kaden"` |
| `rider_url` | str | `"rider/kaden-groves"` |
| `nationality` | str | `"AU"` (ISO 2-letter) |
| `rider_number` | int | `1` |
| `team_name` | str | `"Alpecin - Premier Tech (WT)"` |
| `team_url` | str | `"team/alpecin-premier-tech-2026"` |

### Mapping naar ons datamodel
| Library-veld | Ons veld | Transformatie |
|---|---|---|
| `rider_url` | `riders.id` | Strip `"rider/"` prefix |
| `rider_name` | `riders.naam` | Geen (PCS-formaat: ACHTERNAAM Voornaam) |
| `team_name` | `riders.ploeg` | Strip `" (WT)"`, `" (PRT)"` suffix |
| `nationality` | `riders.nationaliteit` | Direct |
| `rider_number` | `riders.startnummer` | Direct (optioneel veld) |

### Validatiecriteria
- [x] 184 renners opgehaald (≥ 180 ✅)
- [x] `rider_url` aanwezig als uniek ID
- [x] Naam en ploeg aanwezig
- [x] Match-rate met bestaande `riders.json`: 19/20 eerste renners (één nieuw)
- [x] Response-tijd: 0.34s

### Opmerkingen
- `team_name` bevat `(WT)` / `(PRT)` suffixen — strippen bij opslag
- `rider_name` staat in PCS-formaat (ACHTERNAAM Voornaam) — compatibel met bestaande data

---

## B. Etappeoverzicht — `Race.stages()`

**Status: ⚠️ Gedeeltelijk — afstand/start/finish ontbreken in overzicht**

```python
race = Race("race/giro-d-italia/2026")
stages = race.stages()  # → 21 etappes
```

### Beschikbare velden (via Race.stages())
| Veld | Type | Voorbeeld |
|---|---|---|
| `stage_name` | str | `"Stage 1 \| Nessebar - Burgas"` |
| `stage_url` | str | `"race/giro-d-italia/2026/stage-1"` |
| `profile_icon` | str | `"p1"` t/m `"p5"` |
| `date` | str | `"2026-05-08"` |

### Ontbrekende velden (→ ophalen via `Stage(url)`)
`distance`, `departure`, `arrival`, `vertical_meters` zijn **niet** aanwezig in `Race.stages()`.  
Oplossing: gebruik `Stage(stage_url)` voor elk detailveld afzonderlijk.

### Terreintype-mapping (profile_icon → terreintype)
| profile_icon | Stage-naam patroon | Terreintype |
|---|---|---|
| `p1` | — | `"vlak"` |
| `p2` | — | `"heuvels"` |
| `p3` | — | `"heuvels"` (licht bergachtig) |
| `p4` | — | `"bergen"` |
| `p5` | — | `"bergen"` (zwaar) |
| p1 + `(ITT)` in naam | — | `"tijdrit"` |
| — | `stage_type() == "TTT"` | `"ploegentijdrit"` |

### Extra detail-methoden via `Stage(url)`
Alle volgende methoden werken op een `Stage`-object (responstijd ~0.2s per etappe):

```python
s = Stage("race/giro-d-italia/2026/stage-1")
s.distance()        # → 147.0 (float, km)
s.departure()       # → "Nessebar" (str)
s.arrival()         # → "Burgas" (str)
s.vertical_meters() # → 872 (int)
s.stage_type()      # → "RR" | "ITT" | "TTT"
s.profile_icon()    # → "p1" t/m "p5"
s.date()            # → "2026-05-08"
```

### Mapping naar ons datamodel
| Bron | Ons veld | Transformatie |
|---|---|---|
| `Stage.distance()` | `stages.afstand` | Direct (float) |
| `Stage.departure()` | `stages.startplaats` | Direct |
| `Stage.arrival()` | `stages.finishplaats` | Direct |
| `Stage.vertical_meters()` | `stages.hoogteverschil` | Direct (int) |
| `Stage.profile_icon()` + `Stage.stage_type()` | `stages.terreintype` | Zie mapping boven |
| `Stage.stage_type() == "TTT"` | `stages.weging_tijdrit` | True als TTT of ITT |

### Validatiecriteria
- [x] 21 etappes opgehaald ✅
- [x] `stage_url` aanwezig (voor detail-calls)
- [x] `profile_icon` aanwezig (p1-p5)
- [x] `date` aanwezig
- [x] Response-tijd overview: 0.09s
- [x] Stage detail-methoden werken correct (geverifieerd voor etappe 1)

---

## C. Etapperesultaten — `Stage` klassementen

**Status: ✅ OK**

### `results()` — etappe-uitslag

Geeft **alle** renners terug (finishers én uitvallers), gesorteerd op rank.

| Veld | Type | Voorbeeld |
|---|---|---|
| `rider_name` | str | `"Magnier Paul"` |
| `rider_url` | str | `"rider/paul-magnier"` |
| `rider_number` | int | `131` |
| `team_name` | str | `"Soudal Quick-Step"` |
| `team_url` | str | `"team/soudal-quick-step-2026"` |
| `rank` | int \| None | `1` / `None` (bij DNF) |
| `status` | str | `"DF"` / `"DNF"` / `"DNS"` |
| `age` | int | `22` |
| `nationality` | str | `"FR"` |
| `time` | str | `"3:21:08"` |
| `bonus` | str | `"0:00:10"` |
| `pcs_points` | int | `80` |
| `uci_points` | float | `180.0` |
| `breakaway_kms` | int | `0` |

**Status-waarden:**
- `"DF"` = finisher (rank is integer)
- `"DNF"` = Did Not Finish (rank = None)
- `"DNS"` = Did Not Start (rank = None)
- `"OTL"` = Outside Time Limit (vermoedelijk, niet gezien in test)

**Niet-beschikbare etappe:** `Stage(url).results()` gooit `"Results table not in page HTML"` als de etappe nog niet gereden is. Dit is de verwachte fout — vangen met `try/except`.

### `gc()` — Algemeen klassement

Geeft het **volledige** klassement (alle geklasseerde renners). Wij slicen top-5.

| Veld | Relevant |
|---|---|
| `rank` | ✅ |
| `rider_url` | ✅ (→ rider_id) |
| `rider_name` | ✅ |
| `team_name` | ✅ |
| `time` | ✅ |
| `prev_rank` | ✅ (vorige positie) |

### `points()`, `kom()`, `youth()` — overige klassementen

Zelfde veldstructuur als `gc()`, plus `points`-veld (cumulatieve punten). Wij slicen:
- `points()` → top 5
- `kom()` → top 5  
- `youth()` → top 4

### TTT-herkenning
```python
s.stage_type()  # → "TTT" bij ploegentijdrit
```
Werkt via de `stage_type()` methode op het Stage-object.

### Validatiecriteria
- [x] `results()` geverifieerd voor etappes 1, 2, 3 ✅
- [x] DNF/DNS correct gedetecteerd: rank=None, status="DNF"/"DNS" ✅
- [x] `gc()` werkt ✅
- [x] `points()` werkt ✅
- [x] `kom()` werkt ✅
- [x] `youth()` werkt ✅
- [x] Niet-gereden etappe: verwachte exception, correct af te vangen ✅

---

## D. Renner-profiel — `Rider`

**Status: ✅ OK (na URL-correctie)**

### URL-conventie — BELANGRIJK
De correcte URL-prefix is **`rider/`**, NIET `cyclist/`:

```python
# ✅ Correct
r = Rider("rider/tadej-pogacar")

# ❌ Fout (geeft "HTML from given URL is invalid")
r = Rider("cyclist/tadej-pogacar")
```

De fout in de eerste testrun was een bug in het testscript, geen library-probleem.

### `points_per_speciality()`
```python
r = Rider("rider/tadej-pogacar")
r.points_per_speciality()
# → {'one_day_races': 9983, 'gc': 7594, 'time_trial': 3287, 'sprint': 360, 'climber': 9989, 'hills': 4418}
```

| Library-sleutel | Ons veld | Voorbeeld (Pogacar) |
|---|---|---|
| `gc` | `pcs_gc` | 7594 |
| `time_trial` | `pcs_tt` | 3287 |
| `sprint` | `pcs_sprint` | 360 |
| `climber` | `pcs_climber` | 9989 |
| `hills` | `pcs_hills` | 4418 |
| `one_day_races` | `pcs_one_day` | 9983 |

### `birthdate()`
```python
r.birthdate()  # → "1998-09-21" (ISO formaat)
```
Leeftijd berekenen: `(date.today() - date.fromisoformat(bd)).days // 365`

### Rate limiting
Bij 1 seconde interval geen HTTP 429 gedetecteerd. Verwachte responstijd per renner: ~1-2s.  
**Aanbeveling: minstens 1s `time.sleep()` tussen requests. Voor bulk-import (180 renners) ≈ 3-4 minuten.**

### Validatiecriteria
- [x] Correct URL-formaat: `rider/{slug}` ✅
- [x] Alle 6 specialisatiescores aanwezig ✅
- [x] `birthdate()` geeft ISO datumstring ✅
- [x] Geen rate-limit fouten bij 1s interval ✅

---

## Beschikbare Stage-methoden (volledig overzicht)

Alle methoden op een `Stage`-object:
```
arrival, avg_speed_winner, avg_temperature, climbs, date, departure,
distance, gc, is_one_day_race, kom, pcs_points_scale, points,
profile_icon, profile_score, race_category, race_startlist_quality_score,
relative_url, results, stage_type, start_time, teams, uci_points_scale,
update_html, url, vertical_meters, won_how, youth
```

Interessant voor later:
- `climbs()` — klimmen per etappe (voor US-1.2, Sprint 5)
- `teams()` — ploegresultaten (nuttig voor TTT)
- `won_how` — sprint/solo/small_group

---

## Samenvatting per criterium

| Criterium | Status | Opmerking |
|---|---|---|
| Library installeerbaar | ✅ | versie 0.2.7 |
| Startlijst ≥ 180 renners | ✅ | 184 renners |
| Velden startlijst compleet | ✅ | rider_url, name, team, nationality, number |
| Etappeoverzicht 21 etappes | ✅ | via Race.stages() |
| Terreintype-mapping duidelijk | ✅ | p1-p5 + stage_type() |
| Afstand/start/finish | ⚠️ | Niet in Race.stages(), wel via Stage(url) |
| results() ≥ 3 etappes | ✅ | Etappes 1, 2, 3 getest |
| DNF/DNS herkenning | ✅ | rank=None, status="DNF"/"DNS" |
| gc/points/kom/youth | ✅ | Alle 4 werken |
| TTT-herkenning | ✅ | stage_type() == "TTT" |
| Rider.points_per_speciality() | ✅ | Gebruik rider/ prefix |
| Rider.birthdate() | ✅ | ISO datumstring |
| Rate limiting veilig bij 1s | ✅ | Geen HTTP 429 |
| Blockers | **Geen** | ✅ GO |

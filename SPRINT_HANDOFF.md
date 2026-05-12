# Sprint Handoff

---

## Sprint 3 → Sprint 4

**Datum:** 2026-05-12
**Branch:** `main` (commit `7ec3f88`, gemerged vanuit `claude/inspiring-beaver-8b640e`)
**Volgende sprint:** Sprint 4 — Mobiel herontwerp Team-tab (design-sprint met Claude Design)

---

### Wat er gedaan is in Sprint 3

#### 1. DNS/OTL fix — scoreberekening

**Probleem:** Een opgestelde renner met status `DNS` kreeg ten onrechte teampunten.

**Spelregel (correct):**
- `DNS` → scoort helemaal niets (ook geen teampunten)
- `DNF` / `OTL` → scoort nog teampunten voor die etappe

**Wat gewijzigd:**
- `frontend/src/hooks/useStageScores.ts` — extra query op `stage_results` waar `status = 'DNS'`; bouwt `dnsRidersMap: Record<string, Set<number>>`; geeft dit door aan `calculatePersonalizedScores`
- `frontend/src/utils/scoreUtils.ts` — `calculatePersonalizedScores` accepteert nu `dnsRiders` parameter (default `{}`); zerout kopman-bonus én teampunten voor DNS-rijders

Status-waarden in de database zijn **uppercase**: `"DNS"`, `"DNF"`, `"OTL"`, `"DF"` (finisher default).

#### 2. Multi-device team-toegang

**Probleem:** Team was aan localStorage gebonden; op een nieuw apparaat was het niet terug te vinden zonder uitnodigingslink in de URL.

**Wat gewijzigd (`frontend/src/components/CommunityDashboard.tsx`):**
- Nieuw formulier "Al lid? Groepscode invoeren →" onder het aanmaakformulier
- Accepteert zowel bare UUID als volledige uitnodigingslink (URL-parsing)
- "Deel / Ander Apparaat" knop met tooltip die uitlegt dat de link ook voor ander apparaat werkt
- Nadat de gebruiker inlogt met naam + groepscode: het eerder ingediende team verschijnt automatisch via de bestaande `mySubmittedTeam` banner

**Architectuurkeuze:** geen Supabase Auth — de bestaande `group_id + user_name` sleutel in `submitted_teams` is voldoende voor de kleine vriendengroep.

---

### Huidige staat na Sprint 3

**Supabase project:** `tegssdqwvzpmlwzhtfiw` (eu-central-1, ACTIVE_HEALTHY)
**race_edition_id:** `dfaabe0c-d838-4942-96dd-0071fce726b7`

| Etappe | stage_results | stage_scores | Status |
|--------|--------------|--------------|--------|
| 1–3 | ✅ Compleet | ✅ Berekend + geverifieerd | OK |
| 4 | ⚠️ Onvolledig | ❌ Nog niet | Herimporten zodra PCS beschikbaar |
| 5–21 | ❌ Niet beschikbaar | ❌ Niet beschikbaar | Wachten op etappes |

**Dagelijkse workflow (geen code nodig):**
```
1. python scripts/import_stage_results.py N    (of Admin UI)
2. python scripts/calculate_scores.py N        (of Admin UI)
3. Verificeer in TeamMatrix → Scores-modus
```

---

### Sprint 4 — Mobiel herontwerp Team-tab

#### Doel
De huidige Team-tab combineert teambuilding, dagelijkse opstelling (X/K), budget en scores op één scherm. Op mobiel geeft dit te veel rommel en te veel scroll. De sprint maakt een ontwerp dat de functies splitst.

#### Start met Claude Design (MCP)

**De volgende sessie opent met Claude Design** voor het genereren van wireframes/mockups.

Gebruik het MCP-tool `generate-design` of `generate-design-structured` met de volgende context:

**Context voor het design-prompt:**
- App: fantasy cycling tool, dark theme (Tailwind: `neutral-950` achtergrond, `amber-500` accent)
- Huidige component: `TeamMatrix.tsx` — één grote tabel die combineert: 20 renners beheren, X/K-opstelling per etappe klikken, scores bekijken, budget tracker
- Huidige mobiele view: `MobileTeamView.tsx` — kaartjes per renner met horizontal scroll voor etappes
- Pijnpunten: te veel op één scherm, geen duidelijk score-overzicht, eindeloos scrollen

**Gewenste structuur (ter discussie in design):**

| Sub-tab | Inhoud | Gebruik |
|---|---|---|
| **Team** 🏃 | 20 renners invullen + budget | Eenmalig |
| **Opstelling** 📋 | X/K per etappe instellen | Dagelijks |
| **Scores** 📊 | Score-overzicht per etappe | Volgend |

**Betrokken bestanden voor implementatie (later):**
- `frontend/src/components/TeamMatrix.tsx` — bevat nu alle logica (opsplitsen)
- `frontend/src/components/MobileTeamView.tsx` — vervangen of uitbreiden
- `frontend/src/App.tsx` — tab `'teambuilder'` is het ingangspunt
- `frontend/src/context/TeamContext.tsx` — state voor slots/lineup/budget

**Deliverable Sprint 4:** design + componentenstructuur, géén implementatie. Volgende sprint is de implementatie.

---

### Roadmap — Overig openstaand werk

#### Hoge prioriteit (Giro 2026, nog lopend)

| Item | US | Wanneer |
|---|---|---|
| Eindklassement score-berekening | US-3.2 | Na etappe 21 |
| Scorebord vriendengroep | US-3.3 | Na etappe 21 |
| "Alleen hoogste trui" herverificatie | — | Zodra relevante etappe gespeeld |

**Eindklassement aanpak (te bepalen):** aparte `final_scores` tabel of `stage_number = 0` in `stage_scores`. Telt voor alle 20 teamleden (niet alleen dagopstelling). Puntentabel:
- GC top 20: `[100,80,60,50,40,36,32,28,24,22,20,18,16,14,12,10,8,6,4,2]`
- Punten top 10: `[80,60,40,30,20,16,12,8,4,2]`
- Berg top 10: `[80,60,40,30,20,16,12,8,4,2]`
- Jong top 5: `[60,40,30,20,10]`
- Eindteampunten: GC-winnaar=24, Punten=18, KOM=18, Jong=9

#### Middelhoge prioriteit (vóór Tour de France 2026)

| Item | US | Toelichting |
|---|---|---|
| Scraper → `procyclingstats` | US-1.1, 1.2 | `import_riders.py` + `import_stages.py` refactoren; library al geverifieerd in Sprint 0 |
| Multi-ronde configuratie | US-1.4 | Race-URL configureerbaar (niet hardcoded Giro 2026) |
| PCS-specialisatiescores | US-1.3 | `Rider(url).points_per_speciality()` voor alle renners; velden al in schema |

#### Lagere prioriteit (na de ronde)

| Item | Toelichting |
|---|---|
| Optimale team-analyse (US-5.1, 5.2) | Beste 9+kopman per etappe, beste team van 20 binnen budget |
| Renner-vergelijker (US-6.1–6.3) | PCS-scores als radarchart, side-by-side vergelijker |
| Historisch archief (US-7.1, 7.2) | Team + scores per ronde-editie bewaren |

#### Technische schuld / backlog

- **RLS uitschakelen**: `groups` en `votes` tabellen hebben geen Row Level Security (was al een bekende openstaande punt in Sprint 0)
- **Dagelijkse opstelling syncen** (US-4.1 uitbreiding): de X/K-opstelling staat nu alleen in localStorage; zodra multi-device authopslag uitgebreid wordt kan dit ook gesynct worden

---

### Bestandsoverzicht Sprint 3

```
frontend/src/hooks/useStageScores.ts     — DNS riderStatusMap + dnsRidersMap state
frontend/src/utils/scoreUtils.ts          — dnsRiders parameter + DNS-check in scoring
frontend/src/components/
  CommunityDashboard.tsx                  — manual join form, URL-parsing, knoplabel
```

---

<details>
<summary>Sprint 2 → Sprint 3 (ingeklapt)</summary>

**Datum:** 2026-05-12
**Branch:** `main` (commit `d535385`)
**Volgende sprint:** Sprint 3 — Eindklassement + dagelijkse workflow

---

## Wat er gedaan is in Sprint 2

### 1. `stage_scores` tabel (Supabase)

Nieuwe tabel voor rider-onafhankelijke basispunten per (rijder, etappe):

```sql
CREATE TABLE stage_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  race_edition_id uuid NOT NULL,
  stage_number integer NOT NULL,
  rider_id text NOT NULL,
  punten_etappe integer NOT NULL DEFAULT 0,
  punten_gc integer NOT NULL DEFAULT 0,
  punten_punten integer NOT NULL DEFAULT 0,
  punten_kom integer NOT NULL DEFAULT 0,
  punten_jong integer NOT NULL DEFAULT 0,
  UNIQUE (race_edition_id, stage_number, rider_id)
);
```

### 2. `scripts/calculate_scores.py`

Berekent basispunten per (rijder, etappe) en slaat ze op in `stage_scores`:
- Etapperesultaten: ranks 1–20 → `[50,44,40,36,32,30,28,26,24,22,20,18,16,14,12,10,8,6,4,2]`
- Klassementspunten: GC top 5 `[10,8,6,4,2]`, Punten top 5 `[8,6,4,2,1]`, KOM top 5 `[8,6,4,2,1]`, Jong top 5 `[6,4,3,2,1]`
- TTT-etappes: ploegtijdrit-punten op basis van `stage_ttt_results`
- Idempotent (delete-then-insert per etappe)

**Gebruik:**
```
python scripts/calculate_scores.py 4     # één etappe
python scripts/calculate_scores.py all   # alle etappes met data
```

### 3. Admin UI — "Score Berekeningen" sectie

In `frontend/src/components/AdminDashboard.tsx`:
- 21 etappe-buttons (groen = scores al berekend)
- "Bereken alle scores" bulk-knop
- Output-log toont Python stdout

**Nieuw endpoint in `frontend/server.js`:**
```
POST /api/calculate-scores/:nummer   (nummer = 1-21 of "all", timeout 5 min)
```

### 4. Score-logica (TypeScript, client-side)

**`frontend/src/utils/scoreUtils.ts`** — berekent gepersonaliseerde scores per slot/etappe:
- Kopman-bonus: etappepunten ×2 (alleen etappe, niet klassement of team)
- Teampunten: etappewinst (10) + jersey-punten per ploeg (cumulatief per trui, zie algoritme-correctie hieronder)
- `score_max_mogelijk`: huidige score − actuele kopmanbonus + max etappepunten onder opgestelden

**`frontend/src/hooks/useStageScores.ts`** — React hook:
- Haalt `stage_scores` + rang-1 rijen uit alle klassementtabellen + `stage_results` op
- Bouwt `jerseyHolders` per etappe
- Herberekent automatisch bij wijziging opstelling (via `slots` uit TeamContext)

### 5. Score-modus in TeamMatrix

**`frontend/src/components/TeamMatrix.tsx`** uitgebreid:
- Toggle [Opstelling] / [Scores] boven de matrix
- Score-modus: kleurcodering per cel (groen = punten), grijs = niet opgesteld maar scoorde wel
- Browser-native `title`-tooltip met punten-breakdown per cel
- Totaalkolom rechts
- Footer: "Score" rij (jouw score per etappe) + "Max mogelijk" rij (oranje als suboptimaal)

---

## Kritieke algoritme-correctie (geverifieerd)

**Probleem:** De eerste implementatie gebruikte "alleen hoogste trui per jersey-houder" voor teampunten. Dit was verkeerd.

**Correct algoritme (geverifieerd etappes 1–3):**

1. Jersey-drager zelf krijgt **geen teampunten** van zijn eigen trui(en)
2. Ploeggenoten van de jersey-drager krijgen de punten van **elke trui apart** (cumulatief)
   - Ploeg A heeft GC-leider (8) én Punten-leider (6) → ploeggenoot krijgt 8 + 6 = 14 teampunten
3. Etappewinst (10) is apart van klassementsleiderschap en telt ook voor ploeggenoten

**Voorbeeld (etappe 1, geverifieerd):**
- Magnier (Soudal, niet opgesteld in jouw team): wint etappe + leidt GC + punten + jong
- Zana (Soudal, opgesteld): krijgt 10 (etappewinst) + 8 (GC) + 6 (punten) + 3 (jong) = 27 teampunten

**Let op:** de scorito-regel "alleen hoogste trui" in de spelregels verwijst naar het geval dat één rider tegelijk GC én punten leidt — dan telt alleen de hoogste trui. In de praktijk blijkt Scorito dit **per jersey-type** te berekenen (cumulatief per ploeg), niet per rider. Verificatie van etappes 1–3 bevestigt de cumulatieve aanpak.

---

## Huidige staat na Sprint 2

**Supabase project:** `tegssdqwvzpmlwzhtfiw` (eu-central-1)
**race_edition_id:** `dfaabe0c-d838-4942-96dd-0071fce726b7`

### stage_scores

| Etappe | Rows | Status |
|--------|------|--------|
| 1 | ✅ Berekend | Geverifieerd correct |
| 2 | ✅ Berekend | Geverifieerd correct |
| 3 | ✅ Berekend | Geverifieerd correct |
| 4 | ⚠️ Niet berekend | stage_results onvolledig (PCS niet beschikbaar per 2026-05-12) |

### stage_results

| Etappe | Status |
|--------|--------|
| 1–3 | ✅ Compleet |
| 4 | ⚠️ Onvolledig — herimporten zodra PCS beschikbaar |

---

## Dagelijkse workflow (elke etappe)

Na elke gereden etappe:
1. **Importeer etappe**: Admin UI → "Importeer etappe N" (of `python scripts/import_stage_results.py N`)
2. **Bereken scores**: Admin UI → "Bereken scores etappe N" (of `python scripts/calculate_scores.py N`)
3. **Verificeer** in de app: score-modus in TeamMatrix, check of cijfers kloppen

Volgorde maakt uit: importeren vóór berekenen.

---

## Bestandsoverzicht Sprint 2

```
scripts/calculate_scores.py              — nieuw: basispunten berekenen per etappe
frontend/server.js                        — POST /api/calculate-scores/:nummer toegevoegd
frontend/src/components/
  AdminDashboard.tsx                      — "Score Berekeningen" sectie toegevoegd
  TeamMatrix.tsx                          — score-modus toggle, footer, totaalkolom
frontend/src/utils/
  scoreUtils.ts                           — nieuw: client-side scoringslogica
  supabaseClient.ts                       — RACE_EDITION_ID toegevoegd als export
frontend/src/hooks/
  useStageScores.ts                       — nieuw: React hook voor score-ophaling
```

---

## Sprint 3 — Openstaande acties

### Prioriteit 1: Dagelijks bijhouden (nu direct)
- [ ] Etappe 4 herimporten zodra PCS beschikbaar (check procyclingstats)
- [ ] Etappe 4 scores berekenen na import
- [ ] Na elke etappe: importeren + berekenen (zie dagelijkse workflow)

### Prioriteit 2: Eindklassement (na etappe 21)

Eindklassement telt voor **alle 20 teamleden** (niet alleen de 9 opgestelden). Puntentabel:

| Klassement | Punten |
|---|---|
| GC top 20 | 100/80/60/50/40/36/32/28/24/22, daarna -2 t/m 20e (2 pt) |
| Puntenklassement top 10 | 80/60/40/30/20/16/12/8/4/2 |
| Bergklassement top 10 | 80/60/40/30/20/16/12/8/4/2 |
| Jongerenklassement top 5 | 60/40/30/20/10 |
| Eindklassement teampunten | GC-winnaar=24, Puntenleider=18, KOM-leider=18, Jongerenleider=9 |

Aanpak: aparte `final_scores` tabel of uitbreiding van `stage_scores` met `stage_number = 0` (of `null`) als eindklassementmarker. Nader te bepalen.

### Prioriteit 3: Bekende edge cases (laag risico)

- **DNS/OTL en teampunten**: een DNS-rijder in je opstelling krijgt momenteel nog teampunten die etappe (want frontend checkt alleen `lineup = X|K`, niet de status). Scorito geeft DNS-rijders géén teampunten. Fix: `useStageScores` ophalen van `stage_results` status per (rider, etappe), doorgeven aan `calculatePersonalizedScores`.
- **"Alleen hoogste trui" herverificatie**: huidige implementatie is cumulatief per jersey-type. Als in een latere etappe een niet-uitgesloten rider tegelijk GC én punten leidt (én in het opgestelde team zit), controleer dan of Scorito ook cumulatief telt.

---

## Supabase-verbinding

Project: `tegssdqwvzpmlwzhtfiw` (eu-central-1, ACTIVE_HEALTHY)
URL: `https://tegssdqwvzpmlwzhtfiw.supabase.co`
Credentials: `scripts/.env` (aanmaken via `scripts/.env.example`)

---

## Eerder handoff-context (Sprint 1)

<details>
<summary>Sprint 1 → Sprint 2 (ingeklapt)</summary>

**Wat gedaan in Sprint 1:**
- `scripts/import_stage_results.py` — PCS → Supabase import per etappe
- Tabellen: `stage_results`, `stage_gc`, `stage_points_classification`, `stage_kom_classification`, `stage_youth_classification`, `stage_ttt_results`
- Admin UI "Etappe Resultaten" sectie + `POST /api/import-stage/:nummer` endpoint
- 184 rijders in `riders.json` (incl. Mihkels + Stannard)

**Scorito puntentabel (dagelijks):**
- Etappe top 20: `[50,44,40,36,32,30,28,26,24,22,20,18,16,14,12,10,8,6,4,2]`
- Kopman-bonus: etappepunten ×2, ALLEEN etappe
- GC top 5: `[10,8,6,4,2]` | Punten top 5: `[8,6,4,2,1]` | KOM top 5: `[8,6,4,2,1]` | Jong top 5: `[6,4,3,2,1]`
- Teampunten: etappewinst=10, GC=8, Punten=6, KOM=6, Jong=3
- DNF: scoort nog teampunten die etappe | DNS: scoort niets
- TTT: top 8 ploegen `[40,32,28,24,20,16,12,8]`, geen kopman-bonus/teampunten

</details>

---

</details>

---

*Laatste update: 2026-05-12 (Sprint 3 → Sprint 4)*

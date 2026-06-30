# PROJECT_CONTEXT — Scorito GT Puzzler

> Gedeeld door Antigravity en Claude Code. Update dit bij grote wijzigingen.

## Doel
Tool voor het samenstellen en analyseren van een Scorito-team voor grote rondes (Giro, Tour, Vuelta).
Gedeployd op Netlify. GitHub: `github.com/coenvisker-main/scorito-gt-puzzler`

## Status
In heropbouw richting **Tour de France 2026** (app was gebouwd rond de inmiddels afgelopen Giro d'Italia
2026). Supabase-project stond gepauzeerd (INACTIVE) — moet als eerste hersteld worden. Zie
`SPRINT_HANDOFF.md` (bovenste sectie "Planning → Sprint 0") voor de actuele sprintreeks en
`C:\Users\chvis\.claude\plans\c-users-chvis-projects-scorito-data-scr-twinkling-hopcroft.md` voor het
volledige plan. Zie ook `backlog.md` voor losse, niet-sprintgebonden features.

## Architectuur
- `frontend/` — hoofdapplicatie (webinterface)
- `scripts/` — Python datascripts (PCS data importeren, etappe-inschattingen)
- `netlify.toml` — Netlify deploy config
- `requirements.txt` — Python dependencies

## Workflow
```bash
# Lokaal draaien
cd frontend && npm install && npm run dev

# Deploy (via Netlify of push naar main)
git push origin main
```

## Openstaande prioriteiten
Sprint 0 (infra herstellen + Giro afsluiten) — zie `SPRINT_HANDOFF.md`. Daarna multi-ronde architectuur,
Tour-data, PCS-renneranalyse, Scorito-prijskoppeling (Sprints 1–4 in het plan-bestand). Kleinere losse
features: zie `backlog.md`.

## Laatste wijzigingen
_2026-06-30: planningssessie — nieuwe sprintreeks (Sprint 0–4) opgezet voor Tour de France 2026-heropbouw;
geen code gewijzigd, alleen documentatie/plan. Zie `SPRINT_HANDOFF.md`._

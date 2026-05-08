# PROJECT_CONTEXT — Scorito GT Puzzler

> Gedeeld door Antigravity en Claude Code. Update dit bij grote wijzigingen.

## Doel
Tool voor het samenstellen en analyseren van een Scorito-team voor grote rondes (Giro, Tour, Vuelta).
Gedeployd op Netlify. GitHub: `github.com/coenvisker-main/scorito-gt-puzzler`

## Status
In actieve ontwikkeling. Zie `backlog.md` voor openstaande features.

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
Zie `backlog.md` — kortetermijn: etappe sortering, startlijst pop-up, US-03 analyse.

## Laatste wijzigingen
_[bijwerken bij relevante commits]_

# Backlog & Toekomstplannen

Dit document houdt wensen en ideeën bij die buiten de scope van de huidige iteraties vallen, maar later waardevol kunnen zijn.

> Voor de actieve sprintreeks (Tour de France 2026-heropbouw, Sprint 0–4) zie `SPRINT_HANDOFF.md` en
> `C:\Users\chvis\.claude\plans\c-users-chvis-projects-scorito-data-scr-twinkling-hopcroft.md`. De items
> hieronder zijn bewust *niet* in die sprintreeks opgenomen.

## 🚴 Na de PCS-renneranalyse (bewust uitgesteld, zie Sprint 3 in het plan)
- [ ] **Renner-vergelijker:** Side-by-side vergelijking + radarchart van PCS-specialisatiescores tussen renners (US-6.1–6.3).
- [ ] **Optimale team-analyse:** Beste 9 + kopman per etappe, en beste team van 20 binnen budget berekenen (US-5.1, 5.2).
- [ ] **Historisch archief:** Team + scores per ronde-editie structureel bewaarbaar/terugkijkbaar maken (US-7.1, 7.2) — los van de basis-archieffunctie die Sprint 1 van de multi-ronde-architectuur al biedt.

## 🔒 Technische schuld
- [ ] **RLS inschakelen:** `groups`- en `votes`-tabellen in Supabase hebben geen Row Level Security. Niet urgent voor een kleine vriendengroep, wel een aandachtspunt zodra de groep groeit of de app breder gedeeld wordt.

## 🚀 Korte Termijn (Volgende Iteraties)
- [ ] **Etappe Sortering:** Mogelijkheid om de matrix te sorteren op een etappe-kolom (renners met X of K bovenaan).
- [ ] **Startlijst Pop-up:** Een modaal scherm met alle renners gegroepeerd per ploeg, met een "+" knop om ze direct in een leeg slot te schieten.
- [ ] **US-03 Analyse:** Herintroduceren van de type-wegingen en het berekenen van verwachte scores in de matrix.

## 🎨 UI & Visuals
- [ ] **Etappeprofielen:** Afbeeldingen van hoogteprofielen tonen bij de etappe-metadata.
- [ ] **Finish Details:** Informatie over aankomst bergop/heuvelop toevoegen aan de etappes.
- [ ] **Compacte Dashboard Modus:** Een nog compactere weergave van de etappe-metadata gericht op US-03.

## 📊 Data & Functionaliteit
- [ ] **Scorito Categorieën:** Officiële categorieën (A, B, C etc.) importeren zodra het spel live is.
- [ ] **Team Vergelijken:** Meerdere opgeslagen teams (versies) met elkaar kunnen vergelijken.
- [ ] **Captains Validatie:** Waarschuwing bij meer dan 1 "K" per rit (voor finale controle).

## 🛠 Verloren Functionaliteiten (Tijdens Herbouw)
- [ ] **Rennertype Icons:** Visuele iconen bij de verschillende types (GC, Klimmer, etc.).
- [ ] **Terrein Kleuring:** Achtergrondkleuren in de cellen op basis van de 'fit' van een renner bij de etappe.

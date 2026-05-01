# Scorito Grand Tour Puzzler — Uitbreiding: TCS-parcoursformule

**Type document:** Aanvulling op bestaande requirements (april 2026)  
**Betreft:** Vervanging van de bestaande parcoursformule (§3.2) door een uitgebreider wegingsmodel  
**Niet herhalen:** spelregels (§2), tech stack (§6), non-functional requirements (§5), bestaande user stories (US-01 t/m US-20), domeinmodel Ronde/Etappe/Renner/Team (§3.1)

---

## 1. Aanleiding

De huidige formule in §3.2 (Afgeleide berekeningen) berekent de optimale teamverdeling als:

```
Per type: Som(gewicht × etappe_weging) / totaal → × 20 renners, afgerond
```

Dit is een eenvoudige proportionele verdeling op basis van win-kansen alleen. De uitbreiding voegt drie extra waardebronnen toe die in Scorito significant bijdragen aan de totale score maar in de huidige formule niet zijn meegenomen:

- **Kopman-verdubbeling**: etappes waarop een type de meest logische kopmankeuze is, zijn meer waard dan etappes waarop het type slechts meedoet.
- **Dagelijkse trui-punten**: klassementsrenners en puntenklassement-rijders genereren elke dag passieve punten zolang ze een klassementsleider leveren.
- **Eindklassement-punten**: de grote puntenblokken na de laatste etappe zijn type-afhankelijk en substantieel (100 pt voor GC-winnaar).

---

## 2. Aanpassing data model

### 2.1 Wijziging bestaande entiteit: Etappe

De `RennerTypeWegingen` in het bestaande model (gewicht 0.0–1.0, som = 1.0 per etappe) blijft ongewijzigd als invoerformaat. **Geen aanpassing nodig aan het bestaande dataveld.**

Voor de formule converteert de backend de gewichten intern naar percentages (× 100) zodat de rekenparameters intuïtief leesbaar blijven. Dit hoeft niet opgeslagen te worden.

### 2.2 Nieuwe entiteit: `FormulaParams`

Gekoppeld aan een Ronde (één set per Ronde). Bevat de vier instelbare wegingsparameters van de TCS-formule.

| Veld | Type | Standaard | Beschrijving |
|---|---|---|---|
| `ronde_ref` | foreign key | — | Koppeling aan Ronde |
| `alpha` | float | 1.0 | Gewicht voor etappe win-kansen |
| `beta` | float | 15.0 | Bonuspunten per kopman-etappe |
| `gamma` | float | `n_etappes` | Dagenmultiplier voor trui-punten (auto: gelijk aan aantal etappes) |
| `delta` | float | 1.0 | Gewicht voor eindklassement-waarde |

> Als gamma niet handmatig is ingesteld, gebruikt de applicatie automatisch het aantal etappes van de ronde als waarde.

### 2.3 Nieuwe entiteit: `TypeConfig`

Gekoppeld aan een Ronde, één record per rennertype. Bevat de twee waarden die niet automatisch berekend kunnen worden en door de gebruiker (of beheerder) worden ingeschat.

| Veld | Type | Beschrijving |
|---|---|---|
| `ronde_ref` | foreign key | Koppeling aan Ronde |
| `type` | enum (bestaand) | GC \| Sprinter \| Sprint+ \| Klimmer \| Aanvaller \| Tijdrijder \| Wildcard |
| `daily_klassement_bonus` | float | Geschatte dagelijkse trui-punten voor een toptarief van dit type (D-waarde) |
| `expected_eindklassement` | float | Verwachte eindklassement-punten voor een toptarief van dit type (End-waarde) |

**Richtwaarden per type (vooringevuld bij aanmaken Ronde, aanpasbaar):**

| Type | D (dagbonus) | End (eindklassement) | Toelichting |
|---|---|---|---|
| GC | 8 | 100 | GC-trui dagelijks + groot eindklassement |
| Sprinter | 5 | 50 | Puntenklassement afhankelijk van sprint-etappes |
| Sprint+ | 3 | 25 | Deels puntenklassement |
| Klimmer | 2 | 30 | Bergklassement |
| Aanvaller | 1 | 10 | Nauwelijks klassementswaarde |
| Tijdrijder | 0 | 10 | Geen dagelijks klassement |
| Wildcard | 1 | 10 | Zelfde als aanvaller als default |

---

## 3. Vervanging bestaande formule (§3.2)

De volgende sectie vervangt "Optimale teamverdeling" in §3.2 volledig.

---

### 3.1 Formule: Type Coverage Score (TCS)

```
TCS(t) = W(t) × α  +  K(t) × β  +  D(t) × γ  +  End(t) × δ
```

#### Stap 1 — W(t): cumulatief win-gewicht

Per rennertype, sommeer de gewichten over alle etappes van de ronde. Gebruik hiervoor de bestaande `RennerTypeWegingen.gewicht` waarden, vermenigvuldigd met 100:

```
W(t) = Σ (gewicht[t][e] × 100)  voor alle etappes e
```

Voorbeeld: type GC heeft gewicht 0.55 op etappe 7 en 0.45 op etappe 9 → W(GC) = 100.

#### Stap 2 — K(t): aantal kopman-etappes

Per etappe bepaal je welk type de optimale kopmankeuze is: het type met het hoogste gewicht op die etappe.

```
kopman_type(e) = type met max(gewicht[e])
K(t) = aantal etappes waarop kopman_type(e) == t
```

**Tie-breaking bij gelijk gewicht:** gebruik de volgende prioriteit:
`GC > Klimmer > Aanvaller > Sprint+ > Sprinter > Tijdrijder > Wildcard`

#### Stap 3 — D(t) en End(t)

Direct ophalen uit `TypeConfig` voor de betreffende Ronde.

#### Stap 4 — Bereken TCS per type

Pas de formule toe met de waarden uit `FormulaParams`:

```
TCS(t) = W(t) × α  +  K(t) × β  +  D(t) × γ  +  End(t) × δ
total_TCS = Σ TCS(t)
```

#### Stap 5 — Raw slots

```
raw_slots(t) = team_size × (TCS(t) / total_TCS)
```

#### Stap 6 — Afronden (Hamilton/grootste-rest methode)

1. Begin met `floor(raw_slots(t))` per type.
2. Bereken `rest(t) = raw_slots(t) - floor(raw_slots(t))`.
3. Tel hoeveel slots nog uitgedeeld moeten worden: `resterend = team_size - Σ floor`.
4. Wijs resterende slots toe aan de types met de grootste restanten (aflopend).
5. Bij gelijk restant: prioriteer het type met de hoogste TCS.

#### Stap 7 — Correctieregels (businessregels)

Na de allocatie gelden de volgende minimale grenzen. Als een correctie nodig is, wordt de overtollige slot afgetrokken van het type met de meeste slots (ex aequo → laagste TCS):

| Regel | Waarde | Reden |
|---|---|---|
| Min. slots per type met K(t) > 0 | 1 | Je hebt een kopman nodig op die dag |
| Min. slots voor GC | 2 | Trui-punten vragen redundantie bij uitval |
| Max. slots per type | 6 | Diversiteitsprincipe |

---

### 3.2 Kopman-planning (afgeleide output)

Naast de slotallocatie berekent de applicatie per etappe het aanbevolen kopmantype. Dit is de `kopman_type(e)` waarde uit stap 2, weergegeven als overzicht:

```
Etappe 1  → Sprinter   (gewicht: 0.70)
Etappe 7  → GC         (gewicht: 0.55)
Etappe 10 → Tijdrijder (gewicht: 0.70)
…
```

Deze output wordt gebruikt in de UI (zie §4.2).

---

## 4. Aanvulling op bestaande User Stories

### US-13 (uitbreiding) — Parcoursfit inzicht

De bestaande US-13 toont per type het optimale aantal vs. het huidige aantal. De berekening achter "optimaal aantal" wordt vervangen door de TCS-formule uit §3.

**Nieuwe acceptatiecriteria (aanvullend op bestaande):**
- Gebruiker ziet welke vier componenten (W, K, D, End) de score van elk type opbouwen — minimaal als tooltip of uitklapbaar detail.
- Gebruiker kan α, β, γ, δ aanpassen via sliders; de aanbevolen verdeling herberekent real-time.
- Sliders tonen de standaardwaarden (α=1.0, β=15, γ=auto, δ=1.0) en een reset-knop.

---

### US-03 (uitbreiding) — Etappeweging instellen

De bestaande US-03 beschrijft het instellen van wegingen per etappe. Aanvullend moet de gebruiker (of beheerder) nu ook de TypeConfig-waarden (D en End per type) kunnen instellen.

**Nieuwe acceptatiecriteria (aanvullend op bestaande):**
- Scherm of sectie voor TypeConfig-invoer per Ronde: D-waarde en End-waarde per rennertype.
- Standaardwaarden zijn vooringevuld (zie §2.3).
- Aanpassing TypeConfig triggert herberekening van de TCS-verdeling.

---

### Nieuwe US-21 — Kopman-planning inzien

**Als gebruiker** wil ik per etappe kunnen zien welk rennertype de meest logische kopmankeuze is op basis van de parcoursanalyse, zodat ik mijn kopmankeuzes vooraf kan plannen.

**Acceptatiecriteria:**
- Per etappe: aanbevolen kopmantype + het bijbehorende gewicht als onderbouwing.
- Weergave als lijst of matrix naast het etappeoverzicht (Feature 1).
- Alleen leesbaar (geen invoer — de aanbeveling volgt automatisch uit de wegingen).
- Als de gebruiker een andere kopman-keuze wil maken, kan hij dat vastleggen via de bestaande kopman-kandidaat markering (US-16, fase 2) — de aanbeveling is niet blokkerend.

**Scope:** PoC (toevoegen aan bestaande PoC-scope naast US-01 t/m US-14).

---

## 5. Validatieregels (aanvullend)

| Situatie | Foutboodschap | Gedrag |
|---|---|---|
| `total_TCS = 0` (alle gewichten 0) | "Geen etappeweging ingevuld — stel eerst de gewichten in." | Berekening geblokkeerd |
| `beta < 0` of `beta > 50` | "Kopman-bonus (β) moet tussen 0 en 50 liggen." | Invoer geweigerd |
| `gamma < 1` | "Dagenmultiplier (γ) moet minimaal 1 zijn." | Invoer geweigerd |
| TypeConfig niet ingevuld voor een type | Gebruik standaardwaarden uit §2.3 (geen fout, stille fallback) | Berekening gaat door |

---

## 6. Verwacht resultaat ter validatie (Giro 2026)

Ter verificatie van de implementatie: met de volledige etappeweging van de Giro 2026 en standaard parameters levert de formule de volgende output.

**FormulaParams:** α=1.0, β=15, γ=21, δ=1.0  
**TypeConfig:** zie §2.3 richtwaarden

| Type | W(t) | K(t) | D×γ | End | TCS | Slots |
|---|---|---|---|---|---|---|
| GC | 365 | 6 | 168 | 100 | 723 | 5 |
| Sprinter | 330 | 4 | 105 | 50 | 545 | 3 |
| Sprint+ | 340 | 1 | 63 | 25 | 443 | 3 |
| Klimmer | 445 | 0 | 42 | 30 | 517 | 3 |
| Aanvaller | 550 | 9 | 21 | 10 | 716 | 5 |
| Tijdrijder | 70 | 1 | 0 | 10 | 95 | 1 |
| **Totaal** | **2100** | **21** | — | — | **3039** | **20** |

> Let op: W(t) is hier al vermenigvuldigd met 100 (gewichten × 100). De som van K(t) over alle types is gelijk aan het aantal etappes (21), wat als snelle validatiecheck dient.

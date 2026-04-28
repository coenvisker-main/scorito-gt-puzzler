import json
import re

# Price list from user input
price_data = [
    ("G. Pellizzari", "Red Bull - BORA", 4500000),
    ("J. Milan", "Lidl - Trek", 4000000),
    ("R. Carapaz", "EF Education", 3500000),
    ("T. Andresen", "Decathlon", 3500000),
    ("F. Gall", "Decathlon", 3500000),
    ("D. Gee", "Lidl - Trek", 3000000),
    ("A. Yates", "UAE Team", 3000000),
    ("S. Kuss", "Team Visma", 3000000),
    ("K. Groves", "Alpecin", 2500000),
    ("D. Piganzoli", "Team Visma", 2500000),
    ("T. Arensman", "INEOS", 2500000),
    ("J. Hindley", "Red Bull - BORA", 2500000),
    ("G. Ciccone", "Lidl - Trek", 2000000),
    ("M. Poole", "Team Picnic", 2000000),
    ("J. Vine", "UAE Team", 2000000),
    ("E. Affini", "Team Visma", 2000000),
    ("P. Magnier", "Soudal Quick-Step", 2000000),
    ("D. Groenewegen", "Unibet", 2000000),
    ("E. Mas", "Movistar", 2000000),
    ("B. O'Connor", "Team Jayco", 2000000),
    ("E. Vernon", "NSN Cycling", 2000000),
    ("L. Fortunato", "XDS Astana", 1500000),
    ("D. Caruso", "Bahrain", 1500000),
    ("E. Bernal", "INEOS", 1500000),
    ("E. Rubio", "Movistar", 1500000),
    ("C. van Uden", "Team Picnic", 1500000),
    ("W. Kelderman", "Team Visma", 1500000),
    ("B. Lemmen", "Team Visma", 1500000),
    ("T. Kielich", "Team Visma", 1500000),
    ("P. Ackermann", "Team Jayco", 1500000),
    ("S. Buitrago", "Bahrain", 1500000),
    ("V. Campenaerts", "Team Visma", 1500000),
    ("F. Ganna", "INEOS", 1500000),
    ("C. Scaroni", "XDS Astana", 1000000),
    ("M. Storer", "Tudor", 1000000),
    ("C. Strong", "NSN Cycling", 1000000),
    ("M. Govekar", "Bahrain", 1000000),
    ("J. Christen", "UAE Team", 1000000),
    ("M. Soler", "UAE Team", 1000000),
    ("L. Van Eetvelt", "Lotto", 1000000),
    ("D. van Poppel", "Red Bull - BORA", 1000000),
    ("A. Vlasov", "Red Bull - BORA", 1000000),
    ("D. Ulissi", "XDS Astana", 750000),
    ("E. Zambanini", "Bahrain", 750000),
    ("D. Ballerini", "XDS Astana", 750000),
    ("J. Narváez", "UAE Team", 750000),
    ("A. Segaert", "Bahrain", 750000),
    ("M. Sobrero", "Lidl - Trek", 750000),
    ("M. Walscheid", "Lidl - Trek", 750000),
    ("I. Arrieta", "UAE Team", 500000),
    ("W. Poels", "Unibet", 500000),
    ("C. Harper", "Pinarello", 500000),
    ("M. Maestri", "Team Polti", 500000),
    ("M. Tarozzi", "Bardiani", 500000),
    ("F. Busatto", "Alpecin", 500000),
    ("F. Zana", "Soudal Quick-Step", 500000),
    ("T. Gudmestad", "Decathlon", 500000),
    ("G. Moscon", "Red Bull - BORA", 500000),
    ("A. Eulalio", "Bahrain", 500000),
    ("D. Rafferty", "EF Education", 500000),
    ("K. Bouwman", "Team Jayco", 500000),
    ("L. Germani", "Groupama", 500000),
    ("J. Knox", "Team Picnic", 500000),
    ("D. Smith", "NSN Cycling", 500000),
    ("S. Battistella", "EF Education", 500000),
    ("A. Bettiol", "XDS Astana", 500000),
    ("F. Conca", "Team Jayco", 500000),
    ("D. De La Cruz", "Pinarello", 500000),
    ("H. de Vries", "Unibet", 500000),
    ("S. Gualdi", "Lotto", 500000),
    ("A. Hatherly", "Team Jayco", 500000),
    ("J. Kulset", "Uno-X", 500000),
    ("H. López", "XDS Astana", 500000),
    ("J. López", "Movistar", 500000),
    ("G. Martinez", "Team Picnic", 500000),
    ("L. Mezgec", "Team Jayco", 500000),
    ("A. Morgado", "UAE Team", 500000),
    ("G. Mühlberger", "Decathlon", 500000),
    ("O. Naesen", "Decathlon", 500000),
    ("N. Oliveira", "Movistar", 500000),
    ("A. Pinarello", "NSN Cycling", 500000),
    ("E. Reinders", "Unibet", 500000),
    ("J. Romo", "Movistar", 500000),
    ("M. Rondel", "Tudor", 500000),
    ("N. Schultz", "NSN Cycling", 500000),
    ("A. Skaarseth", "Uno-X", 500000),
    ("L. Slock", "Lotto", 500000),
    ("J. Stuyven", "Soudal Quick-Step", 500000),
    ("F. Turconi", "Bardiani", 500000),
    ("M. Valgren", "EF Education", 500000),
    ("F. van den Broek", "Team Picnic", 500000),
    ("F. Wandahl", "Red Bull - BORA", 500000),
    ("B. Zwiehoff", "Red Bull - BORA", 500000),
]

def parse_initials_lastname(scorito_name):
    """Convert 'G. Pellizzari' format to match against 'PELLIZZARI Giulio' format"""
    parts = scorito_name.strip().split(". ", 1)
    if len(parts) == 2:
        initial = parts[0].upper()
        lastname = parts[1].split(" ")[0].upper()  # take first word of remainder as lastname
        return initial, lastname
    return None, None

def get_lastname(naam):
    """Extract lastname from 'PELLIZZARI Giulio' format (first word, all caps)"""
    parts = naam.strip().split(" ")
    return parts[0].upper()

def get_firstname_initial(naam):
    """Extract first name initial from 'PELLIZZARI Giulio' format"""
    parts = naam.strip().split(" ")
    if len(parts) >= 2:
        return parts[1][0].upper()
    return ""

# Load riders
with open(r"c:\Users\chvis\.gemini\antigravity\scratch\scorito-rondes\frontend\src\data\riders.json", "r", encoding="utf-8") as f:
    riders = json.load(f)

# Track what gets updated
updated = []
not_found = []

for scorito_name, team_hint, new_price in price_data:
    # Parse initials + lastname
    initial, lastname = parse_initials_lastname(scorito_name)
    if not initial or not lastname:
        not_found.append((scorito_name, "could not parse"))
        continue
    
    # Find matching rider: match on lastname (case insensitive) + first name initial
    matches = []
    for rider in riders:
        rider_lastname = get_lastname(rider["naam"])
        rider_initial = get_firstname_initial(rider["naam"])
        
        # Normalize: strip accents for comparison
        def normalize(s):
            import unicodedata
            return unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode('ascii').upper()
        
        if normalize(rider_lastname) == normalize(lastname) and normalize(rider_initial) == normalize(initial):
            matches.append(rider)
    
    if len(matches) == 0:
        not_found.append((scorito_name, f"no match for {initial}. {lastname}"))
    elif len(matches) == 1:
        old_price = matches[0]["prijs"]
        matches[0]["prijs"] = new_price
        updated.append((scorito_name, matches[0]["naam"], old_price, new_price))
    else:
        # Multiple matches: try team hint to disambiguate
        team_matches = [r for r in matches if team_hint.lower() in r["ploeg"].lower()]
        if len(team_matches) == 1:
            old_price = team_matches[0]["prijs"]
            team_matches[0]["prijs"] = new_price
            updated.append((scorito_name, team_matches[0]["naam"], old_price, new_price))
        else:
            not_found.append((scorito_name, f"multiple matches: {[r['naam'] for r in matches]}"))

# Save updated file
with open(r"c:\Users\chvis\.gemini\antigravity\scratch\scorito-rondes\frontend\src\data\riders.json", "w", encoding="utf-8") as f:
    json.dump(riders, f, ensure_ascii=False, indent=4)

print(f"\n=== UPDATED {len(updated)} riders ===")
for scorito_name, naam, old_price, new_price in updated:
    change = "" if old_price == new_price else f"  [{old_price/1000:.0f}K -> {new_price/1000:.0f}K]"
    print(f"  {scorito_name:30s} -> {naam:35s}{change}")

print(f"\n=== NOT FOUND ({len(not_found)}) ===")
for name, reason in not_found:
    print(f"  {name:30s}: {reason}")

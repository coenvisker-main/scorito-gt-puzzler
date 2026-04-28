import json

# Load riders
with open(r"c:\Users\chvis\.gemini\antigravity\scratch\scorito-rondes\frontend\src\data\riders.json", "r", encoding="utf-8") as f:
    riders = json.load(f)

# Manual fixes for riders that weren't matched correctly
# Format: (id, correct_price)
manual_fixes = {
    "derek-gee": 3000000,               # D. Gee - GEE-WEST Derek in data
    "casper-van-uden": 1500000,         # C. van Uden
    "lennert-van-eetvelt": 1000000,     # L. Van Eetvelt
    "danny-van-poppel": 1000000,        # D. van Poppel (was incorrectly matched to van-den-broek)
    "frank-van-den-broek": 500000,      # F. van den Broek (was incorrectly priced at 1000000)
    "david-de-la-cruz": 500000,         # D. De La Cruz
    "hartthijs-de-vries": 500000,       # H. de Vries
    "guillermo-juan-martinez": 500000,  # G. Martinez
}

# F. Wandahl - need to check if exists in data
wandahl = next((r for r in riders if "WANDAHL" in r["naam"].upper()), None)
print(f"Wandahl in data: {wandahl}")

# M. Poole - check
poole = next((r for r in riders if "POOLE" in r["naam"].upper()), None)
print(f"Poole in data: {poole}")

updated = []
for rider in riders:
    if rider["id"] in manual_fixes:
        old = rider["prijs"]
        rider["prijs"] = manual_fixes[rider["id"]]
        updated.append((rider["id"], rider["naam"], old, rider["prijs"]))

print(f"\n=== MANUAL FIXES ({len(updated)}) ===")
for id_, naam, old, new in updated:
    print(f"  {naam:35s}: {old/1000:.0f}K -> {new/1000:.0f}K")

# Save
with open(r"c:\Users\chvis\.gemini\antigravity\scratch\scorito-rondes\frontend\src\data\riders.json", "w", encoding="utf-8") as f:
    json.dump(riders, f, ensure_ascii=False, indent=4)

print("\nDone!")

import json

with open(r"frontend\src\data\riders.json", "r", encoding="utf-8") as f:
    riders = json.load(f)

print(f"Total riders: {len(riders)}")
print()

check = ['PELLIZZARI', 'MILAN', 'CARAPAZ', 'GALL', 'GEE', 'YATES', 'GROVES', 'PIGANZOLI', 'VAN POPPEL', 'VAN DEN BROEK', 'VAN EETVELT', 'VAN UDEN', 'MARTINEZ', 'DE LA CRUZ']
for c in check:
    r = next((x for x in riders if c in x["naam"].upper()), None)
    if r:
        prijs_m = r["prijs"] / 1000000
        print(f'{r["naam"]:35s}: {prijs_m:.3f}M')
    else:
        print(f'{c:35s}: NOT FOUND')

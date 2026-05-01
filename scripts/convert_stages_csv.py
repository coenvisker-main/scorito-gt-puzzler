import csv

def run():
    csv_path = 'giro2026_etappe_inschattingen.csv'
    mapping = {}
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        # Use semicolon as delimiter based on previous view_file
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            nr = int(row['Etappe'])
            mapping[nr] = [
                {"type": "GC", "gewicht": int(row['Klassementsrenner']) / 100},
                {"type": "Sprinter", "gewicht": int(row['Pure Sprinter']) / 100},
                {"type": "Sprint+", "gewicht": int(row['Sprint+']) / 100},
                {"type": "Klimmer", "gewicht": int(row['Klimmer']) / 100},
                {"type": "Aanvaller", "gewicht": int(row['Aanvaller']) / 100},
                {"type": "Tijdrijder", "gewicht": int(row['Tijdrijder']) / 100},
                {"type": "Wildcard", "gewicht": 0.0}
            ]
            
    print("const STAGE_OVERRIDES: Record<number, RennerTypeWeging[]> = {")
    for nr, wegingen in mapping.items():
        print(f"  {nr}: {wegingen},")
    print("};")

if __name__ == "__main__":
    run()

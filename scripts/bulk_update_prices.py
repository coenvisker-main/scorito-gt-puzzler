import json
import csv
import re
import os

def parse_price(price_str):
    # Remove currency symbol and whitespace
    clean = price_str.replace('€', '').strip()
    if 'M' in clean:
        return int(float(clean.replace('M', '').strip()) * 1000000)
    if 'K' in clean:
        return int(float(clean.replace('K', '').strip()) * 1000)
    return 0

def normalize_name(name):
    # Convert "J. Vingegaard" to "vingegaard j"
    parts = name.lower().replace('.', '').split()
    if len(parts) >= 2:
        return parts[-1] + " " + parts[0]
    return name.lower()

def match_rider(csv_name, riders):
    csv_norm = normalize_name(csv_name)
    csv_parts = csv_norm.split() # e.g. ["vingegaard", "j"]
    
    for rider in riders:
        json_name = rider['naam'].lower()
        # Check if last name is in json name and first initial matches
        if csv_parts[0] in json_name:
            # If initial is provided, check it
            if len(csv_parts) > 1:
                initial = csv_parts[1][0]
                # JSON name is usually "LASTNAME Firstname"
                if initial in json_name:
                    return rider['id']
    return None

def run_update():
    json_path = 'frontend/src/data/riders.json'
    csv_path = 'renners_lijst.csv'
    
    if not os.path.exists(json_path) or not os.path.exists(csv_path):
        print("Error: Files not found.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        riders = json.load(f)

    updates_count = 0
    matched_ids = []

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            csv_name = row['Renner']
            csv_price = parse_price(row['Prijs'])
            
            rider_id = match_rider(csv_name, riders)
            if rider_id:
                for r in riders:
                    if r['id'] == rider_id:
                        r['prijs'] = csv_price
                        updates_count += 1
                        matched_ids.append(f"{csv_name} -> {rider_id} (€{csv_price})")
                        break
            else:
                print(f"Could not match: {csv_name}")

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(riders, f, indent=4)

    print(f"\nSuccessfully updated {updates_count} riders.")
    # print("\nMatches:")
    # for m in matched_ids:
    #    print(f"  {m}")

if __name__ == "__main__":
    run_update()

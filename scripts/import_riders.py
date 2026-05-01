import json
import os
import cloudscraper
from bs4 import BeautifulSoup
import time
import random

# Configuration
RACE_URL = "https://www.procyclingstats.com/race/giro-d-italia/2026/startlist"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "data", "riders.json")

def scrape_pcs():
    print(f"Scraping PCS: {RACE_URL}")
    
    # Load existing to persist edits
    existing_riders = {}
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                for r in data:
                    existing_riders[r['id']] = r
            except Exception:
                pass

    scraper = cloudscraper.create_scraper(browser={'browser': 'firefox', 'platform': 'windows', 'mobile': False})
    
    try:
        response = scraper.get(RACE_URL, timeout=15)
        if response.status_code != 200:
            print(f"Error: Status code {response.status_code}")
            return []
        html = response.text
    except Exception as e:
        print(f"Error fetching page: {e}")
        return []

    soup = BeautifulSoup(html, 'html.parser')
    riders = []

    # Find the main startlist container
    startlist_ul = soup.find('ul', class_='startlist_v4')
    if not startlist_ul:
        print("Could not find 'ul.startlist_v4'. Trying alternative selectors...")
        # Fallback to logic from pcs_test.html inspection
        team_items = soup.find_all('li', recursive=False) # This might be too broad
        # Let's be more specific based on the ridersCont class
        rider_containers = soup.find_all('div', class_='ridersCont')
    else:
        rider_containers = startlist_ul.find_all('div', class_='ridersCont')

    print(f"Found {len(rider_containers)} team containers.")

    for container in rider_containers:
        # Get Team Name
        team_a = container.find('a', class_='team')
        if not team_a:
            continue
        team_name = team_a.text.strip().replace(' (WT)', '').replace(' (PRT)', '')
        
        # Get Riders
        # Riders are in <li> inside the sibling <ul> or descendant <ul>
        rider_list = container.find('ul')
        if not rider_list:
            continue
            
        for li in rider_list.find_all('li'):
            a_rider = li.find('a', href=lambda x: x and x.startswith('rider/'))
            if not a_rider:
                continue
                
            name = a_rider.text.strip()
            # Clean name (PCS usually has LASTNAME Firstname)
            # But let's keep it as is for now or normalize if needed.
            
            rider_id = a_rider['href'].replace('rider/', '')
            
            # Check for youth GC indicator (*)
            is_youth = "*" in li.text
            
            # Default fallback for completely new riders
            price = 500000
            gtype = "Wildcard"
            scat = "Onbekend"
            
            # Check if rider already exists in our dataset
            if rider_id in existing_riders:
                existing = existing_riders[rider_id]
                price = existing.get("prijs", 500000)
                gtype = existing.get("gebruiker_type", "Wildcard")
                scat = existing.get("scorito_categorie", "Onbekend")
                # If scraper didn't find asterisk but existing record says they are youth, keep it
                if not is_youth:
                    is_youth = existing.get("is_jongere", False)

            riders.append({
                "id": rider_id,
                "naam": name,
                "ploeg": team_name,
                "scorito_categorie": scat, 
                "gebruiker_type": gtype,    
                "prijs": price,
                "is_actief": True,
                "is_jongere": is_youth
            })
            
    return riders

if __name__ == "__main__":
    riders_data = scrape_pcs()
    if riders_data:
        riders_data.sort(key=lambda x: (-x['prijs'], x['naam']))
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(riders_data, f, indent=4, ensure_ascii=False)
        print(f"Successfully saved {len(riders_data)} riders to {OUTPUT_FILE}")
    else:
        print("No riders found.")

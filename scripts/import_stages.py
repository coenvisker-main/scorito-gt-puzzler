import json
import os
import cloudscraper
from bs4 import BeautifulSoup
import time

# Configuration
RACE_URL = "https://www.procyclingstats.com/race/giro-d-italia/2026/route/stages"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "data", "stages.json")

def map_terrain(icon_classes, title, hm):
    title_lower = title.lower()
    if "(itt)" in title_lower or "(ttt)" in title_lower:
        return "tijdrit"
    
    # Check classes list
    if any(p in icon_classes for p in ['p5', 'p4']):
        return "bergen"
    if any(p in icon_classes for p in ['p3', 'p2']):
        return "heuvels"
    
    # Fallback to elevation if icon classes are tricky
    if hm > 3000:
        return "bergen"
    if hm > 1500:
        return "heuvels"
        
    return "vlak"

def scrape_stages():
    print(f"Scraping PCS Stages: {RACE_URL}")
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
    stages = []

    table = soup.find('table', class_='basic')
    if not table:
        print("Could not find stages table.")
        return []

    rows = table.find('tbody').find_all('tr')
    for row in rows:
        cols = row.find_all('td')
        if len(cols) < 7:
            continue
            
        date = cols[0].text.strip()
        
        icon_span = cols[1].find('span', class_='icon')
        icon_classes = icon_span.get('class', []) if icon_span else []
        
        stage_link = cols[2].find('a')
        stage_title = stage_link.text.strip() if stage_link else cols[2].text.strip()
        
        try:
            # Handle cases like "Stage 10 (ITT)"
            parts = stage_title.split(' ')
            num_str = "".join(filter(str.isdigit, parts[1]))
            number = int(num_str)
        except:
            continue
            
        departure = cols[3].text.strip()
        arrival = cols[4].text.strip()
        distance = cols[5].text.strip()
        vertical_meters_str = cols[6].text.strip().replace(',', '')
        vertical_meters = int(vertical_meters_str) if vertical_meters_str.isdigit() else 0
        
        terrain = map_terrain(icon_classes, stage_title, vertical_meters)

        stages.append({
            "nummer": number,
            "datum": f"2026-{date.split('/')[1]}-{date.split('/')[0]}",
            "startplaats": departure,
            "finishplaats": arrival,
            "afstand": float(distance.replace(',', '')),
            "terreintype": terrain,
            "hoogteverschil": vertical_meters,
            "weging_tijdrit": terrain == "tijdrit"
        })
        
    return stages

if __name__ == "__main__":
    stages_data = scrape_stages()
    if stages_data:
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(stages_data, f, indent=4, ensure_ascii=False)
        print(f"Successfully saved {len(stages_data)} stages to {OUTPUT_FILE}")
    else:
        print("No stages found.")

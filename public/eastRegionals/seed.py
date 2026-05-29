import json
import os
import requests
from datetime import datetime


SUPABASE_URL = os.getenv("SUPABASE_URL", "https://sclhzmgdafotyiynrjwr.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbGh6bWdkYWZvdHlpeW5yandyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE0MjIzMywiZXhwIjoyMDg2NzE4MjMzfQ.fOvYy0Jvahtgh5W6J11nP3tMnbzbzvofLDvW8b88kKk")

MEET_KEY = "ofsaa-east-regionals-2026"

INPUT_FILE = "live_results.json"

def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise Exception("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        races = json.load(f)

    updated_at = datetime.now().isoformat(timespec="seconds")
    meet_name = races[0]["meet_name"] if races else "East Regionals"

    posted = sum(1 for r in races if r.get("status") == "posted")
    total = len(races)
    not_posted = total - posted
    changed = sum(1 for r in races if r.get("just_changed"))

    flat_rows = []
    for race in races:
        for row in race.get("results", []):
            item = {
                "meet_name": race.get("meet_name", ""),
                "race_name": race.get("race_name", ""),
                "event_family": race.get("event_family", ""),
                "phase": race.get("phase", ""),
                "gender": race.get("gender", ""),
                "category": race.get("category", ""),
                "kind": race.get("kind", ""),
                "url": race.get("url", ""),
                "status": race.get("status", ""),
                "last_seen": race.get("last_seen", ""),
            }
            item.update(row)
            flat_rows.append(item)

    payload = {
        "meet_key": MEET_KEY,
        "meet_name": meet_name,
        "updated_at": updated_at,
        "summary": {
            "total": total,
            "posted": posted,
            "not_posted": not_posted,
            "changed": changed,
        },
        "races": races,
        "flat_rows": flat_rows,
    }

    row = {
        "meet_key": MEET_KEY,
        "meet_name": meet_name,
        "updated_at": updated_at,
        "payload": payload,
    }

    url = f"{SUPABASE_URL}/rest/v1/live_meet_snapshots"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    resp = requests.post(
        url,
        headers=headers,
        params={"on_conflict": "meet_key"},
        json=row,
        timeout=30
    )

    print(resp.status_code)
    print(resp.text)

if __name__ == "__main__":
    main()
"""
garmin_sync.py
==============
Pulls daily health metrics from Garmin Connect and writes them
to a Google Sheet (the 'garmin' tab).

Schedule with Windows Task Scheduler to run once a day.

Requirements:
    pip install garminconnect gspread google-auth

Setup:
    1. Fill in GARMIN_EMAIL and GARMIN_PASSWORD below
    2. Create a Google Cloud service account and download the JSON key
       - Go to console.cloud.google.com
       - Create a project (or use existing)
       - Enable Google Sheets API
       - IAM & Admin → Service Accounts → Create → download JSON key
       - Share your Google Sheet with the service account email
    3. Set GOOGLE_CREDS_FILE to the path of that JSON key
    4. Set SPREADSHEET_ID to your Google Sheet ID (from the URL)
    5. Run: python garmin_sync.py
"""

import json
import datetime
import time
import sys
import os

# ── CONFIG ────────────────────────────────────────────────────────────────────
GARMIN_EMAIL    = "timblackwell.com"
GARMIN_PASSWORD = "Timothy8"

GOOGLE_CREDS_FILE = r"C:\Users\Administrator\Documents\portfolio\claude\statstream-basketball\dadstats-651d29c2251c.json"
SPREADSHEET_ID    = "https://docs.google.com/spreadsheets/d/1FPF3IRb1N-95PGRE9NbyIlvrGLLzyVhsU1yK8s_KC3s/edit?gid=0#gid=0"
SHEET_NAME        = "garmin"

# How many days back to sync (on first run, set higher like 90)
DAYS_BACK = 7
# ─────────────────────────────────────────────────────────────────────────────

def get_garmin_data(email, password, days_back):
    from garminconnect import Garmin, GarminConnectConnectionError, GarminConnectTooManyRequestsError

    print(f"Connecting to Garmin Connect as {email}...")
    try:
        client = Garmin(email, password)
        client.login()
        print("  Connected.")
    except Exception as e:
        print(f"  Login failed: {e}")
        sys.exit(1)

    today = datetime.date.today()
    rows = []

    for i in range(days_back - 1, -1, -1):
        date = today - datetime.timedelta(days=i)
        date_str = date.isoformat()
        row = {"date": date_str}

        try:
            stats = client.get_stats(date_str)
            row["resting_hr"]     = stats.get("restingHeartRate")
            row["steps"]          = stats.get("totalSteps")
            row["stress_avg"]     = stats.get("averageStressLevel")
            row["body_battery_high"] = stats.get("bodyBatteryHighestValue")
            row["body_battery_low"]  = stats.get("bodyBatteryLowestValue")
            row["calories"]       = stats.get("totalKilocalories")
        except Exception as e:
            print(f"  {date_str}: stats error — {e}")

        try:
            sleep = client.get_sleep_data(date_str)
            daily = sleep.get("dailySleepDTO", {})
            secs  = daily.get("sleepTimeSeconds")
            row["sleep_hours"] = round(secs / 3600, 2) if secs else None
            row["sleep_score"] = daily.get("sleepScores", {}).get("overall", {}).get("value") if daily.get("sleepScores") else None
            row["deep_sleep_hours"] = round(daily.get("deepSleepSeconds", 0) / 3600, 2) if daily.get("deepSleepSeconds") else None
            row["rem_sleep_hours"]  = round(daily.get("remSleepSeconds", 0) / 3600, 2) if daily.get("remSleepSeconds") else None
        except Exception as e:
            print(f"  {date_str}: sleep error — {e}")

        try:
            hrv = client.get_hrv_data(date_str)
            row["hrv"] = hrv.get("hrvSummary", {}).get("lastNight") if hrv else None
        except Exception as e:
            print(f"  {date_str}: HRV error — {e}")

        rows.append(row)
        print(f"  {date_str}: rhr={row.get('resting_hr')} sleep={row.get('sleep_hours')}h hrv={row.get('hrv')} steps={row.get('steps')} stress={row.get('stress_avg')} battery={row.get('body_battery_high')}")
        time.sleep(0.5)  # be polite to Garmin's servers

    return rows

HEADERS = ["date","resting_hr","steps","stress_avg","body_battery_high",
           "body_battery_low","calories","sleep_hours","sleep_score",
           "deep_sleep_hours","rem_sleep_hours","hrv"]

def sync_to_sheets(rows, creds_file, spreadsheet_id, sheet_name):
    import gspread
    from google.oauth2.service_account import Credentials

    print(f"\nConnecting to Google Sheets...")
    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    creds  = Credentials.from_service_account_file(creds_file, scopes=scopes)
    gc     = gspread.authorize(creds)
    ss     = gc.open_by_key(spreadsheet_id)

    # Get or create the garmin sheet
    try:
        ws = ss.worksheet(sheet_name)
    except gspread.WorksheetNotFound:
        ws = ss.add_worksheet(title=sheet_name, rows=1000, cols=len(HEADERS))
        ws.append_row(HEADERS)
        print(f"  Created '{sheet_name}' tab.")

    # Read existing dates to avoid duplicates
    existing = ws.get_all_records()
    existing_dates = {str(r.get("date",""))[:10] for r in existing}
    print(f"  Sheet has {len(existing_dates)} existing dates.")

    # Write new rows
    added = 0
    for row in rows:
        date = row.get("date","")[:10]
        if date in existing_dates:
            # Update existing row
            cell = ws.find(date)
            if cell:
                ws.update(f"A{cell.row}",
                    [[row.get(h,"") or "" for h in HEADERS]])
        else:
            ws.append_row([row.get(h,"") or "" for h in HEADERS])
            added += 1
        time.sleep(0.1)

    print(f"  Done — {added} new rows added, {len(rows)-added} updated.")

if __name__ == "__main__":
    # Allow passing days_back as command line arg
    # e.g. python garmin_sync.py 90
    days = int(sys.argv[1]) if len(sys.argv) > 1 else DAYS_BACK

    print(f"Syncing last {days} days of Garmin data...\n")
    rows = get_garmin_data(GARMIN_EMAIL, GARMIN_PASSWORD, days)
    sync_to_sheets(rows, GOOGLE_CREDS_FILE, SPREADSHEET_ID, SHEET_NAME)
    print("\nSync complete.")

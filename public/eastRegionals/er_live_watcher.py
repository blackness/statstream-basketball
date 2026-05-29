import csv
import hashlib
import html
import json
import re
import sys
import time
from collections import defaultdict
from datetime import datetime

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright


BASE = "https://cstiming.com"
EVENT_ID = 22
START_URL = f"{BASE}/events/{EVENT_ID}/races/3297"

POLL_SECONDS = 120

STATE_OUT = "live_state.json"
RESULTS_JSON_OUT = "live_results.json"
RESULTS_CSV_OUT = "live_results_flat.csv"
HTML_OUT = "live_results.html"
CHANGES_LOG_OUT = "live_changes.log"


def clean_text(text):
    return re.sub(r"\s+", " ", text or "").strip()


def now_iso():
    return datetime.now().isoformat(timespec="seconds")


def log_line(message):
    line = f"[{now_iso()}] {message}"
    print(line)
    with open(CHANGES_LOG_OUT, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def safe_json_load(path, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default
    except Exception:
        return default


def save_json(data, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def save_csv(flat_rows, path):
    if not flat_rows:
        with open(path, "w", newline="", encoding="utf-8") as f:
            f.write("")
        return

    all_keys = []
    seen = set()
    for row in flat_rows:
        for k in row.keys():
            if k not in seen:
                seen.add(k)
                all_keys.append(k)

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=all_keys)
        writer.writeheader()
        writer.writerows(flat_rows)


def parse_event_meta(race_name: str):
    category = "Other"
    gender = "Other"
    kind = "Other"

    rn = race_name.lower()

    if "women" in rn:
        gender = "Women"
    elif "men" in rn:
        gender = "Men"
    elif "mixed" in rn:
        gender = "Mixed"

    if "novice" in rn:
        category = "Novice"
    elif "junior" in rn:
        category = "Junior"
    elif "senior" in rn:
        category = "Senior"
    elif "wheelchair" in rn:
        category = "Wheelchair"
    elif "ambulatory" in rn:
        category = "Ambulatory"
    elif "intellectually imp" in rn:
        category = "Intellectually Impaired"
    elif "open" in rn:
        category = "Open"

    field_keywords = ["jump", "vault", "shot put", "discus", "javelin", "throw"]
    if "relay" in rn:
        kind = "Relay"
    elif any(k in rn for k in field_keywords):
        kind = "Field"
    else:
        kind = "Track"

    return {
        "gender": gender,
        "category": category,
        "kind": kind,
    }


def parse_race_structure(race_name: str):
    rn = clean_text(race_name)

    gender = "Other"
    if rn.startswith("Women "):
        gender = "Women"
        rn2 = rn[len("Women "):]
    elif rn.startswith("Men "):
        gender = "Men"
        rn2 = rn[len("Men "):]
    elif rn.startswith("Mixed "):
        gender = "Mixed"
        rn2 = rn[len("Mixed "):]
    else:
        rn2 = rn

    category = "Other"

    if re.search(r"Intellectually Imp", rn2, re.IGNORECASE):
        category = "Intellectually Impaired"
        rn2 = re.sub(r"Intellectually Imp\.?", "", rn2, flags=re.IGNORECASE).strip()
    else:
        for cat in ["Novice", "Junior", "Senior", "Wheelchair", "Ambulatory", "Open"]:
            if re.search(rf"\b{re.escape(cat)}\b", rn2, re.IGNORECASE):
                category = cat
                rn2 = re.sub(rf"\b{re.escape(cat)}\b", "", rn2, flags=re.IGNORECASE).strip()
                break

    phase = ""
    if " - " in rn2:
        left, right = rn2.split(" - ", 1)
        event_family = left.strip()
        phase = right.strip()
    else:
        event_family = rn2.strip()

    event_family = re.sub(r"\s+", " ", event_family).strip()

    return {
        "gender": gender,
        "category": category,
        "event_family": event_family,
        "phase": phase,
    }


def extract_table_data(table):
    rows = []
    for tr in table.select("tr"):
        cells = [clean_text(c.get_text(" ", strip=True)) for c in tr.select("th, td")]
        if cells:
            rows.append(cells)
    return rows


def normalize_results(headers, rows):
    results = []
    for row in rows:
        item = {}
        for i, h in enumerate(headers):
            item[h] = row[i] if i < len(row) else ""
        results.append(item)
    return results


def make_rows_hash(headers, results):
    payload = json.dumps(
        {
            "headers": headers,
            "results": results,
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def is_meaningful_results(headers, results):
    if not headers or not results:
        return False

    if len(results) == 0:
        return False

    has_any_nonempty = False
    for row in results:
        vals = [str(v).strip() for v in row.values()]
        if any(v for v in vals):
            has_any_nonempty = True
            break

    return has_any_nonempty


def flatten_races(all_races):
    flat = []
    for race in all_races:
        for row in race["results"]:
            item = {
                "meet_name": race["meet_name"],
                "race_name": race["race_name"],
                "event_family": race.get("event_family", ""),
                "phase": race.get("phase", ""),
                "gender": race["gender"],
                "category": race["category"],
                "kind": race["kind"],
                "url": race["url"],
                "status": race.get("status", ""),
                "last_seen": race.get("last_seen", ""),
            }
            item.update(row)
            flat.append(item)
    return flat


def build_school_summary(flat_rows):
    school_totals = defaultdict(lambda: {
        "entries": 0,
        "top3": 0,
        "wins": 0,
        "events": set(),
    })

    for row in flat_rows:
        school = row.get("School", "").strip()
        place = row.get("Place", "").strip()
        event = row.get("race_name", "").strip()

        if not school:
            continue

        school_totals[school]["entries"] += 1
        if event:
            school_totals[school]["events"].add(event)

        if place.isdigit():
            p = int(place)
            if p == 1:
                school_totals[school]["wins"] += 1
            if p <= 3:
                school_totals[school]["top3"] += 1

    summary = []
    for school, info in school_totals.items():
        summary.append({
            "school": school,
            "entries": info["entries"],
            "top3": info["top3"],
            "wins": info["wins"],
            "events": len(info["events"]),
        })

    summary.sort(key=lambda x: (-x["wins"], -x["top3"], -x["entries"], x["school"]))
    return summary


def render_school_summary_table(summary):
    rows = []
    for s in summary:
        rows.append(
            f"<tr><td>{html.escape(s['school'])}</td><td>{s['wins']}</td><td>{s['top3']}</td><td>{s['entries']}</td><td>{s['events']}</td></tr>"
        )
    return f"""
    <table class="summary-table">
      <thead>
        <tr><th>School</th><th>Wins</th><th>Top 3</th><th>Entries</th><th>Scoring Events</th></tr>
      </thead>
      <tbody>{''.join(rows)}</tbody>
    </table>
    """


def render_race_table(headers, results):
    if not headers or not results:
        return "<p class='empty'>No result table found yet.</p>"

    thead = "<tr>" + "".join(f"<th>{html.escape(h)}</th>" for h in headers) + "</tr>"
    body = []

    for row in results:
        place = str(row.get("Place", "")).strip()
        tr_class = ""
        if place == "1":
            tr_class = "gold"
        elif place == "2":
            tr_class = "silver"
        elif place == "3":
            tr_class = "bronze"

        body.append(
            f"<tr class='{tr_class}'>" +
            "".join(f"<td>{html.escape(str(row.get(h, '')))}</td>" for h in headers) +
            "</tr>"
        )

    return f"<table class='results-table'><thead>{thead}</thead><tbody>{''.join(body)}</tbody></table>"


def get_event_family_sort_key(event_family: str):
    ef = clean_text(event_family).lower()

    track_order = [
        "100 meter",
        "80 meter hurdles",
        "100 meter hurdles",
        "200 meter",
        "400 meter",
        "300 meter hurdles",
        "400 meter hurdles",
        "800 meter",
        "1500 meter",
        "3000 meter",
        "2000 meter steeplechase",
        "4x100 meter relay",
        "4x400 meter relay",
        "mixed 4x400 meter relay",
    ]

    field_order = [
        "high jump",
        "pole vault",
        "long jump",
        "triple jump",
        "shot put",
        "discus throw",
        "javelin throw",
    ]

    para_order = [
        "100 meter ambulatory",
        "100 meter wheelchair",
        "200 meter wheelchair",
        "400 meter ambulatory",
        "shot put ambulatory",
        "shot put wheelchair",
        "long jump ambulatory",
    ]

    combined = track_order + field_order + para_order

    for idx, name in enumerate(combined):
        if ef == name:
            return (idx, ef)

    meter_match = re.search(r"(\d+)\s*meter", ef)
    if meter_match:
        dist = int(meter_match.group(1))
        hurdles = "hurdles" in ef
        relay = "relay" in ef
        steeple = "steeple" in ef

        if relay:
            base = 5000
        elif hurdles:
            base = 2000 + dist
        elif steeple:
            base = 3000 + dist
        else:
            base = 1000 + dist
        return (base, ef)

    if "jump" in ef or "vault" in ef:
        return (6000, ef)
    if "shot put" in ef or "discus" in ef or "javelin" in ef or "throw" in ef:
        return (7000, ef)

    return (9999, ef)


def group_races_by_event_family(all_races):
    grouped = defaultdict(list)

    for race in all_races:
        family = race.get("event_family") or race.get("race_name") or "Other"
        grouped[family].append(race)

    category_order = {
        "Novice": 1,
        "Junior": 2,
        "Senior": 3,
        "Wheelchair": 4,
        "Ambulatory": 5,
        "Intellectually Impaired": 6,
        "Open": 7,
        "Other": 99,
    }

    gender_order = {
        "Women": 1,
        "Men": 2,
        "Mixed": 3,
        "Other": 99,
    }

    phase_order = {
        "": 0,
        "Preliminaries": 1,
        "Semi-Finals": 2,
        "Semifinals": 2,
        "Finals": 3,
        "Final": 3,
    }

    grouped_list = []
    for family, races in grouped.items():
        races_sorted = sorted(
            races,
            key=lambda r: (
                category_order.get(r.get("category", "Other"), 99),
                gender_order.get(r.get("gender", "Other"), 99),
                phase_order.get(r.get("phase", ""), 50),
                r.get("race_name", "")
            )
        )
        grouped_list.append((family, races_sorted))

    grouped_list.sort(key=lambda x: get_event_family_sort_key(x[0]))
    return grouped_list


def render_html(all_races, flat_rows, html_path, last_poll_at, summary_counts):
    meet_name = all_races[0]["meet_name"] if all_races else f"Event {EVENT_ID}"
    school_summary = build_school_summary(flat_rows)
    grouped = group_races_by_event_family(all_races)

    nav = []
    sections = []

    for idx, (family, races) in enumerate(grouped):
        anchor = f"family-{idx}".replace(" ", "-").lower()
        nav.append(f"<a class='nav-link' href='#{anchor}'>{html.escape(family)}</a>")

    for idx, (family, races) in enumerate(grouped):
        anchor = f"family-{idx}".replace(" ", "-").lower()
        sections.append(f"<section class='category-block' id='{anchor}'>")
        sections.append(f"<h2>{html.escape(family)}</h2>")

        for race in races:
            phase_chip = ""
            if race.get("phase"):
                phase_chip = f'<span class="chip">{html.escape(race.get("phase", ""))}</span>'

            status = race.get("status", "unknown")
            status_chip = f'<span class="chip status status-{html.escape(status)}">{html.escape(status)}</span>'

            updated_chip = ""
            if race.get("just_changed"):
                updated_chip = '<span class="chip status status-updated">changed this poll</span>'

            sections.append(f"""
            <article class="race-card">
              <div class="race-header">
                <div>
                  <h4>{html.escape(race["race_name"])}</h4>
                  <div class="chips">
                    <span class="chip">{html.escape(race.get("gender", "Other"))}</span>
                    <span class="chip">{html.escape(race.get("category", "Other"))}</span>
                    <span class="chip">{html.escape(race.get("kind", "Other"))}</span>
                    {phase_chip}
                    {status_chip}
                    {updated_chip}
                  </div>
                  <div class="meta-line">
                    Last seen: {html.escape(race.get("last_seen", ""))}
                  </div>
                </div>
                <a class="source-link" href="{html.escape(race["url"])}" target="_blank">View source</a>
              </div>
              {render_race_table(race["headers"], race["results"])}
            </article>
            """)

        sections.append("</section>")

    page = f"""
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>{html.escape(meet_name)} - Live Watcher</title>
<style>
:root {{
  --bg:#0b1220; --panel:#111827; --panel2:#0f172a; --border:#334155; --text:#e5e7eb;
  --muted:#94a3b8; --link:#93c5fd; --gold:rgba(245,158,11,.18); --silver:rgba(148,163,184,.18);
  --bronze:rgba(180,83,9,.18); --ok:#16a34a; --warn:#ca8a04; --dim:#475569; --chg:#2563eb;
}}
* {{ box-sizing:border-box; }}
body {{ margin:0; font-family:Arial,sans-serif; background:var(--bg); color:var(--text); }}
header {{ position:sticky; top:0; z-index:50; background:var(--panel2); border-bottom:1px solid var(--border); padding:16px 20px; }}
h1 {{ margin:0 0 10px 0; font-size:28px; }}
.sub {{ color:var(--muted); font-size:14px; margin-bottom:12px; }}
.toolbar {{ display:flex; gap:10px; flex-wrap:wrap; }}
input {{
  background:#1e293b; color:white; border:1px solid #475569;
  border-radius:8px; padding:10px 12px; font-size:14px;
}}
#search {{ min-width:280px; flex:1; }}
.layout {{ display:grid; grid-template-columns:300px 1fr; gap:20px; padding:20px; }}
aside {{
  position:sticky; top:132px; align-self:start; max-height:calc(100vh - 152px);
  overflow:auto; background:var(--panel); border:1px solid var(--border);
  border-radius:12px; padding:12px;
}}
.nav-link {{
  display:block; color:var(--link); text-decoration:none;
  padding:6px 2px; font-size:14px; border-bottom:1px solid #172033;
}}
.nav-link:hover {{ color:white; }}
.summary-card, .category-block, .race-card {{
  background:var(--panel); border:1px solid var(--border); border-radius:12px;
}}
.summary-card {{ padding:16px; margin-bottom:20px; }}
.category-block {{ padding:16px; margin-bottom:24px; }}
.category-block > h2 {{
  margin-top:0; border-bottom:1px solid var(--border); padding-bottom:10px;
}}
.race-card {{ padding:16px; margin-bottom:18px; }}
.race-header {{
  display:flex; justify-content:space-between; gap:12px;
  align-items:flex-start; margin-bottom:12px;
}}
.race-header h4 {{ margin:0 0 8px 0; font-size:20px; }}
.chips {{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:6px; }}
.chip {{
  background:#1e293b; color:#dbeafe; border:1px solid #334155;
  border-radius:999px; padding:4px 10px; font-size:12px;
}}
.status-posted {{ border-color: var(--ok); color: #bbf7d0; }}
.status-not_posted {{ border-color: var(--dim); color: #cbd5e1; }}
.status-updated {{ border-color: var(--chg); color: #bfdbfe; }}
.meta-line {{ color: var(--muted); font-size: 12px; }}
.source-link {{
  color:var(--link); text-decoration:none; white-space:nowrap; font-size:14px;
}}
table {{ width:100%; border-collapse:collapse; background:#0b1220; }}
th, td {{
  border:1px solid var(--border); padding:8px 10px; text-align:left;
  font-size:14px; vertical-align:top;
}}
th {{ background:#1e293b; }}
tr.gold td {{ background:var(--gold); }}
tr.silver td {{ background:var(--silver); }}
tr.bronze td {{ background:var(--bronze); }}
.hidden {{ display:none !important; }}
.empty {{ color:var(--muted); font-style:italic; }}
.stat-row {{ display:flex; gap:12px; flex-wrap:wrap; margin:10px 0 0; }}
.stat {{
  background:#111827; border:1px solid var(--border); border-radius:10px; padding:10px 12px;
  min-width:120px;
}}
.stat-label {{ color:var(--muted); font-size:12px; }}
.stat-value {{ font-size:20px; font-weight:bold; margin-top:4px; }}
@media (max-width:1000px) {{
  .layout {{ grid-template-columns:1fr; }}
  aside {{ position:static; max-height:none; }}
  .race-header {{ flex-direction:column; }}
}}
</style>
</head>
<body>
<header>
  <h1>{html.escape(meet_name)} - Live Watcher</h1>
  <div class="sub">
    Last poll: {html.escape(last_poll_at)} • Poll interval: {POLL_SECONDS}s
  </div>
  <div class="stat-row">
    <div class="stat"><div class="stat-label">Total events</div><div class="stat-value">{summary_counts['total']}</div></div>
    <div class="stat"><div class="stat-label">Posted</div><div class="stat-value">{summary_counts['posted']}</div></div>
    <div class="stat"><div class="stat-label">Not posted</div><div class="stat-value">{summary_counts['not_posted']}</div></div>
    <div class="stat"><div class="stat-label">Changed this poll</div><div class="stat-value">{summary_counts['changed']}</div></div>
  </div>
  <div class="toolbar" style="margin-top:12px;">
    <input id="search" placeholder="Search athlete, school, bib, event...">
  </div>
</header>

<div class="layout">
  <aside>
    {''.join(nav)}
  </aside>

  <main>
    <section class="summary-card">
      <h2>School Summary</h2>
      {render_school_summary_table(school_summary)}
    </section>
    {''.join(sections)}
  </main>
</div>

<script>
const searchEl = document.getElementById('search');

function applyFilters() {{
  const q = (searchEl.value || '').toLowerCase();

  document.querySelectorAll('.category-block').forEach(block => {{
    const blockText = block.innerText.toLowerCase();
    block.classList.toggle('hidden', q && !blockText.includes(q));
  }});
}}

searchEl.addEventListener('input', applyFilters);
</script>
</body>
</html>
"""
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(page)


def extract_race_page(browser, url: str):
    page = browser.new_page()
    page.goto(url, wait_until="networkidle")
    html_text = page.content()
    page.close()

    soup = BeautifulSoup(html_text, "html.parser")

    title = clean_text(soup.title.get_text(" ", strip=True)) if soup.title else url
    meet_name = None

    for tag in soup.select("h1, h2"):
        txt = clean_text(tag.get_text(" ", strip=True))
        if "ofsaa" in txt.lower() or "track" in txt.lower():
            meet_name = txt
            break

    if not meet_name:
        meet_name = "Meet Results"

    race_name = None
    btn = soup.select_one("button[role='combobox']")
    if btn:
        race_name = clean_text(btn.get_text(" ", strip=True))

    if not race_name and " - " in title:
        race_name = title.split(" - ")[0].strip()

    table = soup.find("table")
    headers = []
    results = []

    if table:
        rows = extract_table_data(table)
        if rows:
            headers = rows[0]
            results = normalize_results(headers, rows[1:])

    race_name = race_name or title
    meta = parse_event_meta(race_name)
    structure = parse_race_structure(race_name)

    meaningful = is_meaningful_results(headers, results)
    status = "posted" if meaningful else "not_posted"
    rows_hash = make_rows_hash(headers, results) if meaningful else ""

    return {
        "url": url,
        "title": title,
        "meet_name": meet_name,
        "race_name": race_name,
        "headers": headers,
        "results": results,
        "status": status,
        "rows_hash": rows_hash,
        "row_count": len(results),
        **meta,
        **structure,
    }


def discover_race_links(page):
    page.goto(START_URL, wait_until="networkidle")
    page.locator("#race-dropdown-button").click()
    page.wait_for_selector("#race-dropdown-list")
    page.wait_for_timeout(1000)

    race_links = page.eval_on_selector_all(
        f'#race-dropdown-list a[role="option"][href*="/events/{EVENT_ID}/races/"]',
        """els => els.map(a => ({
            name: a.innerText.trim(),
            url: a.href
        }))"""
    )

    seen = set()
    deduped = []
    for r in race_links:
        if r["url"] not in seen:
            seen.add(r["url"])
            deduped.append(r)

    return deduped


def merge_with_state(old_state, scraped_race, checked_at):
    url = scraped_race["url"]
    old = old_state.get(url, {})

    just_changed = False
    first_posted_at = old.get("first_posted_at")
    previous_status = old.get("status", "unknown")
    previous_hash = old.get("rows_hash", "")

    if scraped_race["status"] == "posted" and not first_posted_at:
        first_posted_at = checked_at

    if scraped_race["status"] == "posted":
        if previous_status != "posted":
            just_changed = True
        elif previous_hash and previous_hash != scraped_race["rows_hash"]:
            just_changed = True

    merged = {
        **scraped_race,
        "first_seen_at": old.get("first_seen_at", checked_at),
        "last_seen": checked_at,
        "first_posted_at": first_posted_at,
        "previous_status": previous_status,
        "just_changed": just_changed,
    }

    return merged


def build_summary_counts(all_races):
    total = len(all_races)
    posted = sum(1 for r in all_races if r.get("status") == "posted")
    not_posted = sum(1 for r in all_races if r.get("status") != "posted")
    changed = sum(1 for r in all_races if r.get("just_changed"))
    return {
        "total": total,
        "posted": posted,
        "not_posted": not_posted,
        "changed": changed,
    }


def one_poll_cycle(browser, state):
    checked_at = now_iso()
    page = browser.new_page()

    try:
        race_links = discover_race_links(page)
    finally:
        page.close()

    log_line(f"Discovered {len(race_links)} race links")

    new_state = dict(state)
    all_races = []

    for i, race in enumerate(race_links, 1):
        log_line(f"[{i}/{len(race_links)}] Checking {race['name']}")
        try:
            scraped = extract_race_page(browser, race["url"])
            merged = merge_with_state(state, scraped, checked_at)
            new_state[race["url"]] = merged
            all_races.append(merged)

            if merged["just_changed"]:
                if merged["previous_status"] != "posted":
                    log_line(f"NEW POSTED: {merged['race_name']} ({merged['url']})")
                else:
                    log_line(f"UPDATED: {merged['race_name']} ({merged['url']})")
        except Exception as e:
            log_line(f"ERROR on {race['url']}: {e}")

    all_races.sort(key=lambda r: get_event_family_sort_key(r.get("event_family", r.get("race_name", ""))))

    flat_rows = flatten_races([r for r in all_races if r.get("status") == "posted"])
    summary_counts = build_summary_counts(all_races)

    save_json(new_state, STATE_OUT)
    save_json(all_races, RESULTS_JSON_OUT)
    save_csv(flat_rows, RESULTS_CSV_OUT)
    render_html(all_races, flat_rows, HTML_OUT, checked_at, summary_counts)

    log_line(
        f"Poll complete: total={summary_counts['total']} posted={summary_counts['posted']} "
        f"not_posted={summary_counts['not_posted']} changed={summary_counts['changed']}"
    )

    return new_state


def main():
    log_line("Starting live watcher")
    state = safe_json_load(STATE_OUT, {})

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        try:
            while True:
                try:
                    state = one_poll_cycle(browser, state)
                except KeyboardInterrupt:
                    raise
                except Exception as e:
                    log_line(f"Watcher cycle failed: {e}")

                log_line(f"Sleeping {POLL_SECONDS} seconds...")
                time.sleep(POLL_SECONDS)

        except KeyboardInterrupt:
            log_line("Stopping live watcher")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
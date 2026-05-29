type SummaryCounts = {
  total: number;
  posted: number;
  not_posted: number;
  changed: number;
};

type Race = {
  url: string;
  title: string;
  meet_name: string;
  race_name: string;
  headers: string[];
  results: Record<string, string>[];
  status: string;
  rows_hash?: string;
  row_count?: number;
  gender?: string;
  category?: string;
  kind?: string;
  event_family?: string;
  phase?: string;
  last_seen?: string;
  just_changed?: boolean;
};

type Payload = {
  meet_key: string;
  meet_name: string;
  updated_at: string;
  summary: SummaryCounts;
  races: Race[];
  flat_rows: Record<string, string>[];
};

async function getData(): Promise<Payload | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/east-regionals-live`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

function escapeKey(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-");
}

function getEventSortKey(eventFamily: string) {
  const ef = eventFamily.toLowerCase();

  const ordered = [
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
    "high jump",
    "pole vault",
    "long jump",
    "triple jump",
    "shot put",
    "discus throw",
    "javelin throw",
  ];

  const idx = ordered.findIndex((x) => x === ef);
  return idx === -1 ? 9999 : idx;
}

function groupRacesByEvent(races: Race[]) {
  const grouped = new Map<string, Race[]>();

  for (const race of races) {
    const family = race.event_family || race.race_name || "Other";
    if (!grouped.has(family)) grouped.set(family, []);
    grouped.get(family)!.push(race);
  }

  const categoryOrder: Record<string, number> = {
    Novice: 1,
    Junior: 2,
    Senior: 3,
    Wheelchair: 4,
    Ambulatory: 5,
    "Intellectually Impaired": 6,
    Open: 7,
    Other: 99,
  };

  const genderOrder: Record<string, number> = {
    Women: 1,
    Men: 2,
    Mixed: 3,
    Other: 99,
  };

  const phaseOrder: Record<string, number> = {
    "": 0,
    Preliminaries: 1,
    "Semi-Finals": 2,
    Semifinals: 2,
    Finals: 3,
    Final: 3,
  };

  return [...grouped.entries()]
    .map(([family, races]) => [
      family,
      [...races].sort((a, b) => {
        const catA = categoryOrder[a.category || "Other"] ?? 99;
        const catB = categoryOrder[b.category || "Other"] ?? 99;
        if (catA !== catB) return catA - catB;

        const genA = genderOrder[a.gender || "Other"] ?? 99;
        const genB = genderOrder[b.gender || "Other"] ?? 99;
        if (genA !== genB) return genA - genB;

        const phA = phaseOrder[a.phase || ""] ?? 50;
        const phB = phaseOrder[b.phase || ""] ?? 50;
        if (phA !== phB) return phA - phB;

        return a.race_name.localeCompare(b.race_name);
      }),
    ] as const)
    .sort((a, b) => {
      const keyA = getEventSortKey(a[0]);
      const keyB = getEventSortKey(b[0]);
      if (keyA !== keyB) return keyA - keyB;
      return a[0].localeCompare(b[0]);
    });
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "posted"
      ? "#166534"
      : status === "not_posted"
      ? "#475569"
      : "#1d4ed8";

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid #334155",
        background: "#1e293b",
        color: status === "posted" ? "#bbf7d0" : "#cbd5e1",
      }}
    >
      {status}
    </span>
  );
}

export default async function EastRegionalsLivePage() {
  const data = await getData();

  if (!data) {
    return (
      <main style={{ padding: 24, color: "white", background: "#0b1220", minHeight: "100vh" }}>
        <h1>East Regionals Live</h1>
        <p>Could not load live meet data.</p>
      </main>
    );
  }

  const grouped = groupRacesByEvent(data.races || []);

  return (
    <main
      style={{
        background: "#0b1220",
        color: "#e5e7eb",
        minHeight: "100vh",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>{data.meet_name} - Live</h1>
        <p style={{ color: "#94a3b8" }}>
          Updated: {data.updated_at}
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <StatCard label="Total events" value={data.summary?.total ?? 0} />
          <StatCard label="Posted" value={data.summary?.posted ?? 0} />
          <StatCard label="Not posted" value={data.summary?.not_posted ?? 0} />
          <StatCard label="Changed this poll" value={data.summary?.changed ?? 0} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 20,
          }}
        >
          <aside
            style={{
              position: "sticky",
              top: 20,
              alignSelf: "start",
              maxHeight: "calc(100vh - 40px)",
              overflow: "auto",
              background: "#111827",
              border: "1px solid #334155",
              borderRadius: 12,
              padding: 12,
            }}
          >
            {grouped.map(([family]) => (
              <a
                key={family}
                href={`#${escapeKey(family)}`}
                style={{
                  display: "block",
                  color: "#93c5fd",
                  textDecoration: "none",
                  padding: "6px 4px",
                  borderBottom: "1px solid #172033",
                  fontSize: 14,
                }}
              >
                {family}
              </a>
            ))}
          </aside>

          <section>
            {grouped.map(([family, races]) => (
              <div
                key={family}
                id={escapeKey(family)}
                style={{
                  background: "#111827",
                  border: "1px solid #334155",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <h2 style={{ marginTop: 0, borderBottom: "1px solid #334155", paddingBottom: 8 }}>
                  {family}
                </h2>

                {races.map((race) => (
                  <article
                    key={race.url}
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "flex-start",
                        marginBottom: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <h3 style={{ margin: "0 0 8px 0" }}>{race.race_name}</h3>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                          <Chip label={race.gender || "Other"} />
                          <Chip label={race.category || "Other"} />
                          <Chip label={race.kind || "Other"} />
                          {race.phase ? <Chip label={race.phase} /> : null}
                          <StatusPill status={race.status} />
                          {race.just_changed ? <Chip label="changed this poll" accent /> : null}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>
                          Last seen: {race.last_seen || "-"}
                        </div>
                      </div>

                      <a
                        href={race.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#93c5fd", textDecoration: "none" }}
                      >
                        View source
                      </a>
                    </div>

                    {race.status !== "posted" || !race.headers?.length ? (
                      <p style={{ color: "#94a3b8", fontStyle: "italic" }}>
                        No result table found yet.
                      </p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            background: "#0b1220",
                          }}
                        >
                          <thead>
                            <tr>
                              {race.headers.map((h) => (
                                <th
                                  key={h}
                                  style={{
                                    textAlign: "left",
                                    padding: "8px 10px",
                                    border: "1px solid #334155",
                                    background: "#1e293b",
                                    fontSize: 14,
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {race.results.map((row, idx) => {
                              const place = String(row["Place"] || "").trim();
                              let bg = "#0b1220";
                              if (place === "1") bg = "rgba(245,158,11,.18)";
                              else if (place === "2") bg = "rgba(148,163,184,.18)";
                              else if (place === "3") bg = "rgba(180,83,9,.18)";

                              return (
                                <tr key={idx}>
                                  {race.headers.map((h) => (
                                    <td
                                      key={h}
                                      style={{
                                        padding: "8px 10px",
                                        border: "1px solid #334155",
                                        fontSize: 14,
                                        background: bg,
                                      }}
                                    >
                                      {row[h] ?? ""}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}

function Chip({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid #334155",
        background: "#1e293b",
        color: accent ? "#bfdbfe" : "#dbeafe",
      }}
    >
      {label}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 12,
        minWidth: 140,
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}
"use client";

import { useApp } from "@/components/Providers";
import { money } from "@/lib/format";
import type { Asset, TabungRecord } from "@/lib/types";

// Helper to group Tabung Jumaat records by month
function getMonthlyTabungData(records: TabungRecord[]) {
  const monthsMap: Record<string, { collections: number; distributions: number }> = {};

  // Sort records oldest to newest for chronological chart order
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));

  sortedRecords.forEach((rec) => {
    if (!rec.date) return;
    const parts = rec.date.split("-"); // YYYY-MM-DD
    if (parts.length < 2) return;
    const key = `${parts[0]}-${parts[1]}`; // YYYY-MM

    if (!monthsMap[key]) {
      monthsMap[key] = { collections: 0, distributions: 0 };
    }

    const amt = Number(rec.amount || 0);
    if (rec.type === "COLLECTION") {
      monthsMap[key].collections += amt;
    } else if (rec.type === "DISTRIBUTION") {
      monthsMap[key].distributions += amt;
    }
  });

  const keys = Object.keys(monthsMap).sort();
  // Limit to last 6 months to keep it neat
  const recentKeys = keys.slice(-6);

  return recentKeys.map((key) => {
    const { collections, distributions } = monthsMap[key];
    return {
      month: key,
      collections,
      distributions,
      net: collections - distributions
    };
  });
}

// Format month key YYYY-MM to readable BM/EN string
function formatMonthKey(key: string, lang: "bm" | "en") {
  const parts = key.split("-");
  if (parts.length < 2) return key;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;

  const monthsBM = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];
  const monthsEN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const monthName = lang === "bm" ? monthsBM[monthIdx] : monthsEN[monthIdx];
  return `${monthName} ${year}`;
}

export function TabungChart({ records }: { records: TabungRecord[] }) {
  const { language } = useApp();
  const data = getMonthlyTabungData(records);

  if (data.length === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
        {language === "bm" ? "Tiada data kutipan ditemui." : "No collection data found."}
      </div>
    );
  }

  // Find max value to scale heights properly
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.collections, d.distributions)),
    100 // baseline min max
  );

  const scale = 120 / maxVal; // Max height in SVG is 120px

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "1.1rem", margin: 0, color: "var(--brand-2)" }}>
          {language === "bm" ? "Trend Bulanan Tabung Jumaat" : "Monthly Tabung Jumaat Trend"}
        </h3>
        <div style={{ display: "flex", gap: "12px", fontSize: "0.8rem" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "12px", height: "12px", background: "var(--accent)", display: "inline-block", borderRadius: "2px" }} />
            {language === "bm" ? "Kutipan" : "Collections"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "12px", height: "12px", background: "#c084fc", display: "inline-block", borderRadius: "2px" }} />
            {language === "bm" ? "Agihan" : "Distributions"}
          </span>
        </div>
      </div>

      {/* Accessible Inline SVG Bar Chart */}
      <svg
        viewBox="0 0 450 180"
        width="100%"
        height="auto"
        aria-label="Monthly Tabung Jumaat Collection and Distribution Chart"
        role="img"
        style={{ overflow: "visible", display: "block" }}
      >
        <title>{language === "bm" ? "Trend Bulanan Tabung Jumaat" : "Monthly Tabung Jumaat Trend"}</title>

        {/* Y Axis Gridlines */}
        <line x1="85" y1="20" x2="440" y2="20" stroke="var(--line)" strokeDasharray="3 3" />
        <line x1="85" y1="80" x2="440" y2="80" stroke="var(--line)" strokeDasharray="3 3" />
        <line x1="85" y1="140" x2="440" y2="140" stroke="var(--line)" />

        {/* Labels for Y axis */}
        <text x="80" y="24" textAnchor="end" fontSize="9" fill="var(--muted)">{money(maxVal)}</text>
        <text x="80" y="84" textAnchor="end" fontSize="9" fill="var(--muted)">{money(maxVal / 2)}</text>
        <text x="80" y="144" textAnchor="end" fontSize="9" fill="var(--muted)">RM0</text>

        {data.map((d, i) => {
          // X offsets for grouped bars
          const groupWidth = 60;
          const barWidth = 18;
          const startX = 105 + i * groupWidth + 10;

          const colHeight = d.collections * scale;
          const distHeight = d.distributions * scale;

          return (
            <g key={d.month}>
              {/* Collection Bar */}
              <rect
                x={startX}
                y={140 - colHeight}
                width={barWidth}
                height={colHeight}
                fill="var(--accent)"
                rx="2"
              />
              <text x={startX + barWidth / 2} y={135 - colHeight} textAnchor="middle" fontSize="8" fontWeight="bold" fill="var(--text)">
                {Math.round(d.collections)}
              </text>

              {/* Distribution Bar */}
              <rect
                x={startX + barWidth + 4}
                y={140 - distHeight}
                width={barWidth}
                height={distHeight}
                fill="#c084fc"
                rx="2"
              />
              <text x={startX + barWidth + 4 + barWidth / 2} y={135 - distHeight} textAnchor="middle" fontSize="8" fontWeight="bold" fill="var(--text)">
                {Math.round(d.distributions)}
              </text>

              {/* Month label */}
              <text
                x={startX + barWidth + 2}
                y="160"
                textAnchor="middle"
                fontSize="9.5"
                fill="var(--text)"
                fontWeight="600"
              >
                {formatMonthKey(d.month, language)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Accessible data summary table */}
      <div style={{ marginTop: "8px", borderTop: "1px solid var(--line)", paddingTop: "8px" }}>
        <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
              <th style={{ textAlign: "left", padding: "4px" }}>{language === "bm" ? "Bulan" : "Month"}</th>
              <th style={{ textAlign: "right", padding: "4px" }}>{language === "bm" ? "Kutipan" : "Collections"}</th>
              <th style={{ textAlign: "right", padding: "4px" }}>{language === "bm" ? "Agihan" : "Distributions"}</th>
              <th style={{ textAlign: "right", padding: "4px" }}>Net</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month} style={{ borderBottom: "1px dashed var(--line)" }}>
                <td style={{ padding: "6px 4px", fontWeight: "bold" }}>{formatMonthKey(d.month, language)}</td>
                <td style={{ padding: "6px 4px", textAlign: "right", color: "green", fontWeight: 600 }}>{money(d.collections)}</td>
                <td style={{ padding: "6px 4px", textAlign: "right", color: "#c084fc", fontWeight: 600 }}>{money(d.distributions)}</td>
                <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: "bold" }}>{money(d.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AssetUtilisationChart({ assets }: { assets: Asset[] }) {
  const { language } = useApp();

  const total = assets.length;
  const available = assets.filter((a) => a.status === "AVAILABLE").length;
  const onLoan = assets.filter((a) => a.status === "ON_LOAN").length;
  const damaged = assets.filter((a) => a.status === "DAMAGED").length;
  const maintenance = assets.filter((a) => a.status === "MAINTENANCE").length;

  if (total === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
        {language === "bm" ? "Tiada rekod aset ditemui." : "No asset records found."}
      </div>
    );
  }

  const statuses = [
    { label: language === "bm" ? "Tersedia" : "Available", count: available, color: "#166534", bg: "#f0fdf4" },
    { label: language === "bm" ? "Dipinjam" : "On Loan", count: onLoan, color: "#0369a1", bg: "#f0f9ff" },
    { label: language === "bm" ? "Rosak" : "Damaged", count: damaged, color: "#991b1b", bg: "#fef2f2" },
    { label: language === "bm" ? "Penyelenggaraan" : "Maintenance", count: maintenance, color: "#854d0e", bg: "#fef9c3" }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h3 style={{ fontSize: "1.1rem", margin: 0, color: "var(--brand-2)" }}>
        {language === "bm" ? "Status Ketersediaan iAset" : "iAset Availability Status"}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {statuses.map((st) => {
          const percentage = total > 0 ? (st.count / total) * 100 : 0;
          return (
            <div key={st.label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: "bold" }}>
                <span>{st.label}</span>
                <span style={{ color: st.color }}>
                  {st.count} ({Math.round(percentage)}%)
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "16px",
                  background: "var(--soft-bg)",
                  border: "1px solid var(--line)",
                  borderRadius: "9999px",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    width: `${percentage}%`,
                    height: "100%",
                    background: st.color,
                    borderRadius: "9999px",
                    transition: "width 0.4s ease"
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "12px", borderTop: "1px solid var(--line)", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--muted)" }}>
        <span>{language === "bm" ? "Jumlah Aset Berdaftar:" : "Total Registered Assets:"}</span>
        <strong>{total}</strong>
      </div>
    </div>
  );
}

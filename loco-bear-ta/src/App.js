import { useState, useEffect, useCallback } from "react";

const MOCK_DATA = {
  avgTat: 16,
  tatCount: 2,
  openPositions: [
    { id: 1, role: "Marketing Manager", centre: "Bangalore", step: 4, daysOpen: 12, hr: "Nisarga D.", status: "interview", priority: "high", joiningStatus: "", doj: "", _receiveDate: "2026-06-01", _closeDate: "" },
    { id: 2, role: "Games Experience Executive", centre: "Loco Lane", step: 3, daysOpen: 8, hr: "Nisarga D.", status: "screening", priority: "medium", joiningStatus: "", doj: "", _receiveDate: "2026-06-05", _closeDate: "" },
    { id: 3, role: "Performance Marketing", centre: "Bangalore", step: 5, daysOpen: 18, hr: "Bosky P.", status: "final", priority: "high", joiningStatus: "", doj: "", _receiveDate: "2026-05-25", _closeDate: "2026-06-10" },
    { id: 4, role: "Senior TA Executive", centre: "Dubai", step: 2, daysOpen: 5, hr: "Wilfred W.", status: "tracker", priority: "medium", joiningStatus: "", doj: "", _receiveDate: "2026-06-08", _closeDate: "" },
    { id: 5, role: "Event Coordinator", centre: "Raipur", step: 1, daysOpen: 3, hr: "HR Raipur", status: "new", priority: "low", joiningStatus: "", doj: "", _receiveDate: "2026-06-10", _closeDate: "" },
    { id: 6, role: "Event Coordinator", centre: "Raipur", step: 1, daysOpen: 3, hr: "HR Raipur", status: "new", priority: "low", joiningStatus: "", doj: "", _receiveDate: "2026-06-10", _closeDate: "" },
    { id: 7, role: "Brand Executive", centre: "Rebounce", step: 6, daysOpen: 22, hr: "Pallavi V.", status: "offer", priority: "high", joiningStatus: "", doj: "", _receiveDate: "2026-05-20", _closeDate: "2026-06-05" },
    { id: 8, role: "Operations Lead", centre: "Brigade", step: 3, daysOpen: 10, hr: "Bosky P.", status: "screening", priority: "medium", joiningStatus: "", doj: "", _receiveDate: "2026-06-03", _closeDate: "" },
  ],
};

const STEP_LABELS = ["", "Hiring Request", "TA Tracker", "Candidate Tracker", "Interview Tracker", "Feedback", "Offer/Reject", "Closed"];
const STATUS_CONFIG = {
  new:       { color: "#6366f1", bg: "rgba(99,102,241,0.12)",  label: "NEW" },
  tracker:   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  label: "TRACKER" },
  screening: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  label: "SCREENING" },
  interview: { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  label: "INTERVIEW" },
  final:     { color: "#f97316", bg: "rgba(249,115,22,0.12)",  label: "FINAL" },
  offer:     { color: "#10b981", bg: "rgba(16,185,129,0.12)",  label: "OFFER" },
  closed:    { color: "#6b7280", bg: "rgba(107,114,128,0.12)", label: "CLOSED" },
};
const CENTRE_COLOURS = ["#6366f1","#e85d3a","#f59e0b","#10b981","#8b5cf6","#3b82f6","#f97316","#ec4899"];

// ── ROBUST DATE PARSER ────────────────────────────────────────────────────────
// Handles all the mixed formats found in the sheet:
//   MM-DD-YYYY  (09-17-2025)
//   DD/MM/YYYY  (23/01/2026)  — day > 12 is a dead giveaway
//   MM/DD/YYYY  (02/25/2026)  — month <= 12, day > 12
//   D-Mon-YYYY  (5-May-2026)
//   Mon-D-YYYY  (May-5-2026)
//   MM-DD-YYYY with single digits (9-12-2025, 10-1-2025)
//   Excel serial numbers
//   "On hold", typos → returns null
function parseFlexibleDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === "on hold" || s.toLowerCase() === "tbd") return null;

  // Excel serial number
  if (/^\d{4,6}$/.test(s)) {
    const serial = parseInt(s);
    if (serial > 40000 && serial < 60000) {
      return new Date(new Date(1899, 11, 30).getTime() + serial * 86400000);
    }
  }

  // Named month formats: "5-May-2026", "May-5-2026", "30-Apr-2026"
  const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
  const namedMonth = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})$/);
  if (namedMonth) {
    const [, d, m, y] = namedMonth;
    const mo = MONTHS[m.slice(0,3).toLowerCase()];
    if (mo !== undefined) return new Date(parseInt(y), mo, parseInt(d));
  }
  const namedMonthRev = s.match(/^([A-Za-z]{3,})[-\s](\d{1,2})[-\s](\d{4})$/);
  if (namedMonthRev) {
    const [, m, d, y] = namedMonthRev;
    const mo = MONTHS[m.slice(0,3).toLowerCase()];
    if (mo !== undefined) return new Date(parseInt(y), mo, parseInt(d));
  }

  // Numeric formats: split on / or -
  const sep = s.includes("/") ? "/" : "-";
  const parts = s.split(sep).map(p => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return null;

  let [a, b, c] = parts;

  // If last part is 4-digit year → a and b are day/month or month/day
  if (c > 1900) {
    const year = c;
    if (a > 12) {
      // a must be day, b is month → DD/MM/YYYY or DD-MM-YYYY
      return new Date(year, b - 1, a);
    } else if (b > 12) {
      // b must be day, a is month → MM/DD/YYYY or MM-DD-YYYY
      return new Date(year, a - 1, b);
    } else {
      // Ambiguous: both a and b ≤ 12
      // Your sheet uses MM-DD-YYYY for dash format and DD/MM/YYYY for slash format
      if (sep === "-") return new Date(year, a - 1, b); // MM-DD-YYYY
      else return new Date(year, b - 1, a);              // DD/MM/YYYY
    }
  }

  // If first part is 4-digit year → YYYY/MM/DD or YYYY-MM-DD
  if (a > 1900) {
    return new Date(a, b - 1, c);
  }

  return null;
}

function dateDiffDays(d1, d2) {
  if (!d1 || !d2) return null;
  const diff = Math.floor((d2 - d1) / 86400000);
  return diff >= 0 ? diff : null;
}
// ─────────────────────────────────────────────────────────────────────────────

function getTheme(dark) {
  return dark ? {
    bg:"#0a0a0f", bgGrad:"radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,93,58,0.08), transparent)",
    sidebar:"rgba(255,255,255,0.02)", sidebarBdr:"rgba(255,255,255,0.06)",
    card:"rgba(255,255,255,0.03)", cardBdr:"rgba(255,255,255,0.07)",
    header:"rgba(10,10,15,0.92)", headerBdr:"rgba(255,255,255,0.05)",
    input:"rgba(255,255,255,0.05)", inputBdr:"rgba(255,255,255,0.1)",
    text:"#e0e0e8", textSub:"#888", textMuted:"#444",
    navActive:"rgba(232,93,58,0.1)", navInactive:"transparent", navText:"#555",
    rowHover:"rgba(255,255,255,0.02)", tableHead:"rgba(255,255,255,0.04)", tableBdr:"rgba(255,255,255,0.04)",
    stepFill:"rgba(255,255,255,0.08)", barBg:"rgba(255,255,255,0.07)",
    modalBg:"#13131a", modalBdr:"rgba(255,255,255,0.1)", scrollThumb:"rgba(255,255,255,0.1)",
    pipeEmpty:"rgba(255,255,255,0.02)", pipeBdr:"rgba(255,255,255,0.05)", pipeNum:"#2a2a3a",
    btnSecBg:"rgba(255,255,255,0.04)", btnSecBdr:"rgba(255,255,255,0.08)", btnSecTxt:"#777",
    userName:"#ccc", logoSub:"#444", navLabel:"#333", timeColor:"#333",
  } : {
    bg:"#f4f5f7", bgGrad:"radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,93,58,0.05), transparent)",
    sidebar:"#ffffff", sidebarBdr:"rgba(0,0,0,0.08)",
    card:"#ffffff", cardBdr:"rgba(0,0,0,0.08)",
    header:"rgba(244,245,247,0.95)", headerBdr:"rgba(0,0,0,0.08)",
    input:"#f9fafb", inputBdr:"rgba(0,0,0,0.15)",
    text:"#111827", textSub:"#6b7280", textMuted:"#9ca3af",
    navActive:"rgba(232,93,58,0.08)", navInactive:"transparent", navText:"#9ca3af",
    rowHover:"rgba(0,0,0,0.02)", tableHead:"rgba(0,0,0,0.03)", tableBdr:"rgba(0,0,0,0.05)",
    stepFill:"rgba(0,0,0,0.08)", barBg:"rgba(0,0,0,0.07)",
    modalBg:"#ffffff", modalBdr:"rgba(0,0,0,0.1)", scrollThumb:"rgba(0,0,0,0.15)",
    pipeEmpty:"rgba(0,0,0,0.02)", pipeBdr:"rgba(0,0,0,0.06)", pipeNum:"#d1d5db",
    btnSecBg:"rgba(0,0,0,0.04)", btnSecBdr:"rgba(0,0,0,0.1)", btnSecTxt:"#6b7280",
    userName:"#374151", logoSub:"#9ca3af", navLabel:"#d1d5db", timeColor:"#9ca3af",
  };
}

function extractSheetId(url) {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

async function fetchSheetData(sheetId, sheetName = "Sheet1") {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(csvUrl);
  const text = await res.text();
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { values.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  }).filter(row => Object.values(row).some(v => v !== ""));
}

function inferStepFromRow(row) {
  const doj = row["DOJ"] || "";
  const signLetter = row["Received Sign Letter Date"] || "";
  const posClose = row["Position close date / Offer Letter release date"] || row["Position close date"] || "";
  const offerCand = row["Offer Candidate name"] || "";
  const action = (row["Action"] || "").toLowerCase();
  const openPos = row["Open position"];
  if (doj && String(doj).trim()) return 7;
  if (signLetter && String(signLetter).trim()) return 7;
  if (posClose && String(posClose).trim()) return 6;
  if (offerCand && String(offerCand).trim()) return 6;
  if (action.includes("final") || action.includes("offer")) return 5;
  if (action.includes("interview") || action.includes("round")) return 4;
  if (action.includes("screen") || action.includes("profile")) return 3;
  if (openPos && parseInt(openPos) > 0) return 2;
  return 1;
}

function inferStatusFromStep(step) {
  if (step === 7) return "closed";
  if (step === 6) return "offer";
  if (step === 5) return "final";
  if (step === 4) return "interview";
  if (step === 3) return "screening";
  if (step === 2) return "tracker";
  return "new";
}

function calcDaysOpen(row) {
  const dateStr = row["Position receive date"] || row["Position Receive Date"] || "";
  if (!dateStr) return 0;
  const d = parseFlexibleDate(dateStr);
  if (!d || isNaN(d)) return 0;
  return Math.max(0, Math.floor((new Date() - d) / 86400000));
}

function parseSheetToPositions(rows) {
  const allMapped = rows.map((row, i) => {
    const step = inferStepFromRow(row);
    const daysOpen = calcDaysOpen(row);
    const status = inferStatusFromStep(step);
    const centre = (row["Centers"] || row["Centre"] || row["Center"] || "Unknown").toString().trim();

    const rawReceive = row["Position receive date"] || "";
    const rawClose   = row["Position close date / Offer Letter release date"] || "";

    return {
      id: i + 1,
      role: (row["Role"] || row["Role "] || "").trim(),
      centre, step, daysOpen,
      hr: (row["Ownership"] || row["Lead"] || row["Hiring Manager"] || "Unknown HR").trim(),
      status,
      priority: daysOpen > 21 ? "high" : daysOpen > 10 ? "medium" : "low",
      openPositions: parseInt(row["Open position"] || 0) || 0,
      totalReq: parseInt(row["Total Requirements"] || 1) || 1,
      positionClosed: parseInt(row["Position Closed"] || 0) || 0,
      expectedClosure: row["Expected Closure Date"] || "",
      _action: row["Action"] || "",
      offerCandidate: row["Offer Candidate name"] || "",
      yetToJoin: parseInt(row["Yet to join"] || row["Yet to Join"] || 0) || 0,
      hiringManager: row["Hiring Manager"] || "",
      uniqueId: row["Unique TA ID"] || "",
      payscaleMin: row["Payscale Minimum"] || "",
      payscaleMax: row["Payscale Maximum"] || "",
      doj: row["DOJ"] || "",
      joiningStatus: (row["Joining Status"] || "").toString().trim(),
      _receiveDate: rawReceive,
      _closeDate:   rawClose,
      // Parsed Date objects for TAT calculation
      _parsedReceive: parseFlexibleDate(rawReceive),
      _parsedClose:   parseFlexibleDate(rawClose),
    };
  }).filter(p => p.role && p.role !== "");

  // TAT: rows with both dates parseable and close >= receive
  const tatRows = allMapped.filter(p => {
    if (!p._parsedReceive || !p._parsedClose) return false;
    if (isNaN(p._parsedReceive) || isNaN(p._parsedClose)) return false;
    return p._parsedClose >= p._parsedReceive;
  });

  const avgTat = tatRows.length > 0
    ? Math.round(
        tatRows.reduce((sum, p) => sum + Math.floor((p._parsedClose - p._parsedReceive) / 86400000), 0)
        / tatRows.length
      )
    : null;

  // Active positions: only "in progress"
  const active = allMapped.filter(p => {
    const action = (p._action || "").toLowerCase().trim();
    return action === "in progress" || action === "inprogress";
  });

  active._avgTat = avgTat;
  active._tatCount = tatRows.length;
  return active;
}

// ── COMPONENTS ────────────────────────────────────────────────────────────────

function Logo({ T }) {
  return (
    <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${T.sidebarBdr}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg,#e85d3a,#f59e0b)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "800", color: "white", fontFamily: "'Syne',sans-serif", boxShadow: "0 4px 12px rgba(232,93,58,0.35)" }}>L</div>
        <div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: T.text, fontFamily: "'Syne',sans-serif", letterSpacing: "0.06em" }}>LOCO BEAR</div>
          <div style={{ fontSize: "9px", color: T.logoSub, letterSpacing: "0.12em" }}>TA OPERATIONS</div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ tab, active, onClick, T }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: "9px", padding: "9px 12px", borderRadius: "8px", border: "none", cursor: "pointer", background: active ? T.navActive : T.navInactive, color: active ? "#e85d3a" : T.navText, fontSize: "12px", fontWeight: active ? "600" : "400", marginBottom: "2px", textAlign: "left", transition: "all 0.15s", borderLeft: active ? "2px solid #e85d3a" : "2px solid transparent", fontFamily: "'DM Sans',sans-serif" }}>
      <span style={{ fontSize: "13px", width: "16px", textAlign: "center" }}>{tab.icon}</span>
      {tab.label}
      {tab.badge > 0 && <span style={{ marginLeft: "auto", background: "#e85d3a", color: "white", borderRadius: "10px", padding: "1px 6px", fontSize: "9px", fontWeight: "700" }}>{tab.badge}</span>}
    </button>
  );
}

function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 1000, background: type === "error" ? "linear-gradient(135deg,#e85d3a,#dc2626)" : "linear-gradient(135deg,#e85d3a,#f59e0b)", color: "white", padding: "12px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", boxShadow: "0 8px 24px rgba(232,93,58,0.4)", maxWidth: "340px", lineHeight: "1.4" }}>
      {type === "error" ? "❌ " : "✅ "}{message}
    </div>
  );
}

function PositionModal({ title, positions, onClose, T, showDoj, showOffer }) {
  const [filter, setFilter] = useState("all");
  if (!positions) return null;

  const isSpecial = showDoj || showOffer;
  const displayPositions = showOffer
    ? (filter === "all" ? positions : positions.filter(p => (p.joiningStatus || "").toLowerCase() === filter))
    : positions;

  const statusColor = (s) => (s || "").toLowerCase() === "joined" ? "#10b981" : (s || "").toLowerCase() === "not joined" ? "#e85d3a" : "#f59e0b";
  const colCount = showOffer ? 6 : showDoj ? 4 : 8;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: T.modalBg, border: `1px solid ${T.modalBdr}`, borderRadius: "16px", width: "90%", maxWidth: isSpecial ? "780px" : "900px", maxHeight: "82vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.cardBdr}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: T.text, fontFamily: "'Syne',sans-serif" }}>{title}</div>
            <div style={{ fontSize: "11px", color: T.textSub, marginTop: "2px" }}>{positions.length} record{positions.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={onClose} style={{ background: T.btnSecBg, border: `1px solid ${T.btnSecBdr}`, borderRadius: "8px", color: T.textSub, fontSize: "13px", padding: "6px 12px", cursor: "pointer" }}>✕ Close</button>
        </div>

        {showOffer && (
          <div style={{ padding: "12px 24px", borderBottom: `1px solid ${T.cardBdr}`, display: "flex", gap: "8px" }}>
            {[
              { key: "all",        label: "All",          count: positions.length },
              { key: "joined",     label: "✅ Joined",     count: positions.filter(p => (p.joiningStatus||"").toLowerCase()==="joined").length },
              { key: "not joined", label: "❌ Not Joined", count: positions.filter(p => (p.joiningStatus||"").toLowerCase()==="not joined").length },
              { key: "offered",    label: "🕐 Offered",    count: positions.filter(p => (p.joiningStatus||"").toLowerCase()==="offered").length },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: "5px 14px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: "600", background: filter === f.key ? "#e85d3a" : T.btnSecBg, color: filter === f.key ? "white" : T.textSub, transition: "all 0.15s" }}>
                {f.label} <span style={{ opacity: 0.7, fontSize: "10px" }}>({f.count})</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ overflow: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, background: T.modalBg, zIndex: 1 }}>
              <tr style={{ background: T.tableHead }}>
                {showOffer
                  ? ["Name", "Role", "Centre", "DOJ", "Joining Status", "Remarks"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "9px", color: T.textMuted, fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: `1px solid ${T.tableBdr}`, whiteSpace: "nowrap" }}>{h}</th>)
                  : showDoj
                  ? ["Name / Role", "Centre", "DOJ", "Joining Status"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "9px", color: T.textMuted, fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: `1px solid ${T.tableBdr}`, whiteSpace: "nowrap" }}>{h}</th>)
                  : ["Role", "Centre", "HR Owner", "Date Received", "Days Open", "Status", "Offer Candidate"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "9px", color: T.textMuted, fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: `1px solid ${T.tableBdr}`, whiteSpace: "nowrap" }}>{h}</th>)
                }
              </tr>
            </thead>
            <tbody>
              {displayPositions.length === 0 && <tr><td colSpan={colCount} style={{ padding: "40px", textAlign: "center", color: T.textMuted }}>No records found</td></tr>}
              {displayPositions.map((pos, i) => {
                if (showOffer) {
                  const sc = statusColor(pos.joiningStatus);
                  const isNotJoined = (pos.joiningStatus || "").toLowerCase() === "not joined";
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.tableBdr}`, background: isNotJoined ? "rgba(232,93,58,0.03)" : "transparent" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                      onMouseLeave={e => e.currentTarget.style.background = isNotJoined ? "rgba(232,93,58,0.03)" : "transparent"}>
                      <td style={{ padding: "13px 14px" }}><div style={{ fontSize: "12px", fontWeight: "700", color: T.text }}>{pos.name || "—"}</div></td>
                      <td style={{ padding: "13px 14px", fontSize: "11px", color: T.textSub }}>{pos.role || "—"}</td>
                      <td style={{ padding: "13px 14px", fontSize: "11px", color: T.textSub }}>{pos.centre || "—"}</td>
                      <td style={{ padding: "13px 14px" }}><span style={{ fontSize: "12px", fontWeight: "700", color: "#8b5cf6" }}>{pos.doj || "—"}</span></td>
                      <td style={{ padding: "13px 14px" }}><span style={{ padding: "4px 11px", borderRadius: "20px", fontSize: "10px", fontWeight: "700", background: `${sc}18`, color: sc, whiteSpace: "nowrap" }}>{pos.joiningStatus || "Offered"}</span></td>
                      <td style={{ padding: "13px 14px", fontSize: "11px", color: isNotJoined ? "#e85d3a" : T.textMuted, fontStyle: pos.remarks ? "normal" : "italic", maxWidth: "220px" }}>{pos.remarks || (isNotJoined ? "No reason provided" : "—")}</td>
                    </tr>
                  );
                }
                if (showDoj) {
                  const sc = statusColor(pos.joiningStatus);
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.tableBdr}` }} onMouseEnter={e => e.currentTarget.style.background = T.rowHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: T.text }}>{pos.name || pos.offerCandidate || "—"}</div>
                        <div style={{ fontSize: "10px", color: T.textSub, marginTop: "2px" }}>{pos.role || "—"}</div>
                      </td>
                      <td style={{ padding: "13px 14px", fontSize: "11px", color: T.textSub }}>{pos.centre || "—"}</td>
                      <td style={{ padding: "13px 14px" }}><div style={{ fontSize: "12px", fontWeight: "700", color: "#8b5cf6" }}>{pos.doj || pos.expectedClosure || "—"}</div></td>
                      <td style={{ padding: "13px 14px" }}><span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: "700", background: `${sc}18`, color: sc }}>{pos.joiningStatus || "Offered"}</span></td>
                    </tr>
                  );
                }
                const sc = STATUS_CONFIG[pos.status] || STATUS_CONFIG.new;
                const isOverdue = pos.expectedClosure && new Date(pos.expectedClosure) < new Date() && pos.status !== "closed";
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.tableBdr}`, background: isOverdue ? "rgba(232,93,58,0.04)" : "transparent" }} onMouseEnter={e => e.currentTarget.style.background = T.rowHover} onMouseLeave={e => e.currentTarget.style.background = isOverdue ? "rgba(232,93,58,0.04)" : "transparent"}>
                    <td style={{ padding: "12px 14px", fontSize: "12px", fontWeight: "600", color: T.text }}>{pos.role}</td>
                    <td style={{ padding: "12px 14px", fontSize: "11px", color: T.textSub }}>{pos.centre}</td>
                    <td style={{ padding: "12px 14px", fontSize: "11px", color: T.textSub }}>{pos.hr}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: "11px", color: T.text, fontWeight: "600" }}>{pos._receiveDate || "—"}</div>
                      {pos._receiveDate && <div style={{ fontSize: "9px", color: T.textMuted, marginTop: "2px" }}>{pos.daysOpen}d ago</div>}
                    </td>
                    <td style={{ padding: "12px 14px" }}><span style={{ fontSize: "12px", fontWeight: "700", color: pos.daysOpen > 14 ? "#e85d3a" : pos.daysOpen > 7 ? "#f59e0b" : "#10b981" }}>{pos.daysOpen}d open</span></td>
                    <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "9px", fontWeight: "700", background: sc.bg, color: sc.color }}>{sc.label}</span></td>
                    <td style={{ padding: "12px 14px", fontSize: "11px", color: T.textSub }}>{pos.offerCandidate || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CentreBreakdown({ positions, T, onCentreClick }) {
  const active = positions.filter(p => p.status !== "closed");
  const total = active.length;
  const centreMap = {};
  active.forEach(p => { const key = (p.centre || "Unknown").trim(); centreMap[key] = (centreMap[key] || 0) + 1; });
  const sorted = Object.entries(centreMap).sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ background: T.card, border: `1px solid ${T.cardBdr}`, borderRadius: "14px", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: T.text, fontFamily: "'Syne',sans-serif" }}>Open positions by centre</div>
        <span style={{ fontSize: "10px", color: T.textSub }}>{total} active · click to view</span>
      </div>
      {sorted.length === 0 && <div style={{ fontSize: "12px", color: T.textMuted, textAlign: "center", padding: "20px 0" }}>No active positions</div>}
      {sorted.map(([centre, count], i) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const colour = CENTRE_COLOURS[i % CENTRE_COLOURS.length];
        return (
          <div key={centre} onClick={() => onCentreClick(centre)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 8px", borderRadius: "8px", cursor: "pointer", borderBottom: i < sorted.length - 1 ? `1px solid ${T.tableBdr}` : "none", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: colour, flexShrink: 0 }} />
            <div style={{ fontSize: "11px", color: T.textSub, minWidth: "90px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{centre}</div>
            <div style={{ flex: 1, height: "4px", background: T.barBg, borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "2px", width: `${pct}%`, background: colour, transition: "width 0.4s ease" }} />
            </div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: T.text, minWidth: "18px", textAlign: "right" }}>{count}</span>
            <span style={{ fontSize: "10px", color: T.textMuted, minWidth: "32px", textAlign: "right" }}>{pct}%</span>
            <span style={{ fontSize: "10px", color: colour }}>→</span>
          </div>
        );
      })}
    </div>
  );
}

function DashboardTab({ data, isLive, onOpenModal, onOpenDojModal, onOpenOfferModal, offerEntries, T }) {
  const today = new Date();
  const useOfferSheet = Array.isArray(offerEntries);

  const joined    = useOfferSheet ? offerEntries.filter(e => (e.joiningStatus || "").toLowerCase() === "joined")     : data.openPositions.filter(p => (p.joiningStatus || "").toLowerCase() === "joined");
  const notJoined = useOfferSheet ? offerEntries.filter(e => (e.joiningStatus || "").toLowerCase() === "not joined") : data.openPositions.filter(p => (p.joiningStatus || "").toLowerCase() === "not joined");
  const offered   = useOfferSheet ? offerEntries.filter(e => (e.joiningStatus || "").toLowerCase() === "offered")    : data.openPositions.filter(p => p.offerCandidate && p.offerCandidate.toString().trim() !== "" && p.doj && p.doj.toString().trim() !== "" && (p.joiningStatus || "").trim() === "");
  const total     = joined.length + notJoined.length;
  const ratio     = total > 0 ? Math.round((joined.length / total) * 100) : 0;
  const allOffered = [...joined, ...notJoined, ...offered];
  const yetToJoin = offered;
  const overduePositions = data.openPositions.filter(p => { if (!p.expectedClosure) return false; const d = new Date(p.expectedClosure); return !isNaN(d) && d < today && p.status !== "closed"; });

  const handleCentreClick = (centre) => {
    const centrePositions = data.openPositions.filter(p => p.status !== "closed" && (p.centre || "Unknown").trim() === centre);
    onOpenModal(`${centre} — Open Positions`, centrePositions, false);
  };

  const StatCard = ({ label, value, sub, color, icon, onClick, clickable }) => (
    <div onClick={onClick} style={{ background: T.card, border: `1px solid ${T.cardBdr}`, borderRadius: "14px", padding: "20px", borderTop: `3px solid ${color}`, cursor: clickable ? "pointer" : "default", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { if (clickable) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${color}22`; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ fontSize: "20px", marginBottom: "10px" }}>{icon}</div>
      <div style={{ fontSize: "28px", fontWeight: "800", color, fontFamily: "'Syne',sans-serif" }}>{value}</div>
      <div style={{ fontSize: "11px", color: T.textSub, marginTop: "5px" }}>{label}</div>
      <div style={{ fontSize: "10px", color: T.textMuted, marginTop: "2px" }}>{sub}</div>
      {clickable && <div style={{ fontSize: "9px", color, marginTop: "8px", opacity: 0.7 }}>Click to view →</div>}
    </div>
  );

  return (
    <div>
      {isLive ? (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "6px 14px", borderRadius: "20px", marginBottom: "20px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "11px", color: "#10b981", fontWeight: "600" }}>Live data from Google Sheets</span>
        </div>
      ) : (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "6px 14px", borderRadius: "20px", marginBottom: "20px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: "600" }}>⚡ Showing demo data — go to Settings to connect your Google Sheets</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "14px" }}>
        <StatCard label="Active Open Positions" value={data.openPositions.filter(p => p.status !== "closed").length} sub="across all centres" color="#6366f1" icon="📋" clickable={true} onClick={() => onOpenModal("Active Positions", data.openPositions.filter(p => p.status !== "closed"), false)} />
        <StatCard label="Offer → Joining Ratio" value={`${ratio}%`} sub={`${joined.length} joined · ${notJoined.length} not joining · ${offered.length} pending`} color="#06b6d4" icon="🤝" clickable={allOffered.length > 0} onClick={() => allOffered.length > 0 && onOpenOfferModal("Offer → Joining Tracker", allOffered)} />
        <StatCard label="Yet to Join" value={yetToJoin.length} sub={useOfferSheet ? "status = Offered in joining tracker" : "offer & DOJ set, status pending"} color="#8b5cf6" icon="🕐" clickable={yetToJoin.length > 0} onClick={() => yetToJoin.length > 0 && onOpenDojModal("Yet to Join — DOJ Details", yetToJoin)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "24px" }}>
        <StatCard label="Overdue Positions" value={overduePositions.length} sub="past expected closure date" color="#e85d3a" icon="⚠️" clickable={overduePositions.length > 0} onClick={() => overduePositions.length > 0 && onOpenModal("Overdue Positions", overduePositions, false)} />
        <StatCard
          label="Average TAT"
          value={data.avgTat != null ? `${data.avgTat}d` : "—"}
          sub={`based on ${data.tatCount || 0} closed/offered roles`}
          color="#10b981" icon="⏱️" clickable={false}
        />
        <StatCard
          label="Recently Added Roles"
          value={(() => {
            const sorted = [...data.openPositions].filter(p => p._parsedReceive && !isNaN(p._parsedReceive)).sort((a, b) => b._parsedReceive - a._parsedReceive);
            return sorted.slice(0, 5).length;
          })()}
          sub="top 5 most recently received"
          color="#f59e0b" icon="🆕" clickable={true}
          onClick={() => {
            const sorted = [...data.openPositions].filter(p => p._parsedReceive && !isNaN(p._parsedReceive)).sort((a, b) => b._parsedReceive - a._parsedReceive);
            onOpenModal("Recently Added Roles", sorted.slice(0, 5), false);
          }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <CentreBreakdown positions={data.openPositions} T={T} onCentreClick={handleCentreClick} />
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.cardBdr}`, borderRadius: "14px", padding: "20px" }}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: T.text, fontFamily: "'Syne',sans-serif", marginBottom: "16px" }}>Hiring Pipeline — Positions by Step</div>
        <div style={{ display: "flex", gap: "8px" }}>
          {STEP_LABELS.slice(1).map((step, i) => {
            const count = data.openPositions.filter(p => p.step === i + 1).length;
            return (
              <div key={i} style={{ flex: 1, textAlign: "center", cursor: count > 0 ? "pointer" : "default" }} onClick={() => count > 0 && onOpenModal(`Step ${i+1}: ${step}`, data.openPositions.filter(p => p.step === i + 1), false)}>
                <div style={{ background: count > 0 ? "rgba(232,93,58,0.12)" : T.pipeEmpty, border: count > 0 ? "1px solid rgba(232,93,58,0.3)" : `1px solid ${T.pipeBdr}`, borderRadius: "10px", padding: "12px 4px", transition: "transform 0.15s" }}
                  onMouseEnter={e => { if (count > 0) e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: count > 0 ? "#e85d3a" : T.pipeNum, fontFamily: "'Syne',sans-serif" }}>{count}</div>
                  <div style={{ fontSize: "8px", color: T.textMuted, marginTop: "5px", lineHeight: "1.4" }}>{step}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PositionsTab({ data, T }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? data.openPositions : data.openPositions.filter(p => p.status === filter);
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {["all", "new", "screening", "interview", "final", "offer"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", background: filter === f ? "#e85d3a" : T.btnSecBg, color: filter === f ? "white" : T.textSub, transition: "all 0.15s" }}>{f}</button>
        ))}
      </div>
      <div style={{ background: T.card, border: `1px solid ${T.cardBdr}`, borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.tableHead }}>
              {["Role","Centre","HR Owner","Step Progress","Days Open","Status","Priority"].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "9px", color: T.textMuted, fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${T.tableBdr}`, fontFamily: "'Syne',sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: T.textMuted, fontSize: "13px" }}>No positions found</td></tr>}
            {filtered.map(pos => {
              const sc = STATUS_CONFIG[pos.status] || STATUS_CONFIG.new;
              return (
                <tr key={pos.id} style={{ borderBottom: `1px solid ${T.tableBdr}` }} onMouseEnter={e => e.currentTarget.style.background = T.rowHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "13px 14px", fontSize: "12px", fontWeight: "600", color: T.text }}>{pos.role}</td>
                  <td style={{ padding: "13px 14px", fontSize: "11px", color: T.textSub }}>{pos.centre}</td>
                  <td style={{ padding: "13px 14px", fontSize: "11px", color: T.textSub }}>{pos.hr}</td>
                  <td style={{ padding: "13px 14px", minWidth: "140px" }}>
                    <div style={{ display: "flex", gap: "3px", marginBottom: "4px" }}>{[1,2,3,4,5,6,7].map(s => <div key={s} style={{ flex: 1, height: "4px", borderRadius: "2px", background: s < pos.step ? "#e85d3a" : s === pos.step ? "#f59e0b" : T.stepFill }} />)}</div>
                    <div style={{ fontSize: "9px", color: T.textMuted }}>Step {pos.step} — {STEP_LABELS[pos.step]}</div>
                  </td>
                  <td style={{ padding: "13px 14px" }}><span style={{ fontSize: "13px", fontWeight: "700", fontFamily: "'Syne',sans-serif", color: pos.daysOpen > 14 ? "#e85d3a" : pos.daysOpen > 7 ? "#f59e0b" : "#10b981" }}>{pos.daysOpen}d</span></td>
                  <td style={{ padding: "13px 14px" }}><span style={{ padding: "3px 9px", borderRadius: "20px", fontSize: "9px", fontWeight: "700", background: sc.bg, color: sc.color, letterSpacing: "0.06em" }}>{sc.label}</span></td>
                  <td style={{ padding: "13px 14px" }}><span style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: pos.priority === "high" ? "#e85d3a" : pos.priority === "medium" ? "#f59e0b" : T.textMuted }}>{pos.priority}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab({ config, onSave, onTest, T }) {
  const [form, setForm] = useState(config);
  const [testing, setTesting] = useState({});
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTest = async (key) => {
    setTesting(t => ({ ...t, [key]: "testing" }));
    const urlMap = { taTracker: "taTrackerUrl", candidateTracker: "candidateTrackerUrl", interviewTracker: "interviewTrackerUrl", offerTracker: "offerTrackerUrl" };
    const ok = await onTest(key, form[urlMap[key] || key]);
    setTesting(t => ({ ...t, [key]: ok ? "ok" : "fail" }));
    setTimeout(() => setTesting(t => ({ ...t, [key]: null })), 3000);
  };

  const testIcon = k => ({ testing: "⏳", ok: "✅", fail: "❌" }[testing[k]] || "Test");
  const iS = { width: "100%", background: T.input, border: `1px solid ${T.inputBdr}`, borderRadius: "8px", padding: "10px 14px", color: T.text, fontSize: "12px", fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box" };
  const lS = { fontSize: "11px", color: T.textSub, marginBottom: "6px", display: "block", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase" };
  const bB = { padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600", fontFamily: "'DM Sans',sans-serif" };

  const Field = ({ label, fkey, testKey, placeholder, hint }) => (
    <div style={{ marginBottom: "18px" }}>
      <label style={lS}>{label}</label>
      <div style={{ display: "flex", gap: "8px" }}>
        <input style={iS} placeholder={placeholder} value={form[fkey] || ""} onChange={e => update(fkey, e.target.value)} />
        {testKey && <button onClick={() => handleTest(testKey)} style={{ ...bB, background: testing[testKey] === "ok" ? "rgba(16,185,129,0.15)" : T.btnSecBg, border: `1px solid ${T.inputBdr}`, color: testing[testKey] === "ok" ? "#10b981" : T.textSub, padding: "10px 14px", whiteSpace: "nowrap" }}>{testIcon(testKey)}</button>}
      </div>
      {hint && <div style={{ fontSize: "10px", color: T.textMuted, marginTop: "5px", lineHeight: "1.5" }}>{hint}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: "680px" }}>
      <h2 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: "700", color: T.text, fontFamily: "'Syne',sans-serif" }}>Connect Your Data</h2>
      <p style={{ margin: "0 0 24px", fontSize: "12px", color: T.textSub, lineHeight: "1.6" }}>Paste your Google Sheet links below. Make sure each sheet is set to <strong style={{ color: T.text }}>"Anyone with the link — Viewer"</strong>.</p>

      <div style={{ background: T.card, border: `1px solid rgba(59,130,246,0.2)`, borderRadius: "14px", padding: "20px", marginBottom: "20px" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#818cf8", marginBottom: "10px" }}>📌 How to make your sheet public (read-only):</div>
        {["Open your Google Sheet","Click 'Share' (top right)","Click 'Change to anyone with the link'","Set to 'Viewer' (not Editor)","Copy link and paste below"].map((s, i) => (
          <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "6px", alignItems: "flex-start" }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "rgba(99,102,241,0.2)", color: "#818cf8", fontSize: "10px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>{i + 1}</div>
            <div style={{ fontSize: "11px", color: T.textSub }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.cardBdr}`, borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: T.text, fontFamily: "'Syne',sans-serif", marginBottom: "18px", paddingBottom: "12px", borderBottom: `1px solid ${T.cardBdr}` }}>📊 Google Sheets Trackers</div>
        <Field label="TA Tracker URL" fkey="taTrackerUrl" testKey="taTracker" placeholder="https://docs.google.com/spreadsheets/d/..." hint="Your main open positions tracker" />
        <Field label="Sheet Tab Name" fkey="taTrackerSheet" placeholder="Sheet1" hint="Exact name of the tab inside the spreadsheet" />
        <Field label="Candidate Tracker URL" fkey="candidateTrackerUrl" testKey="candidateTracker" placeholder="https://docs.google.com/spreadsheets/d/..." hint="Step 3 — all screened/shortlisted profiles" />
        <Field label="Interview Tracker URL" fkey="interviewTrackerUrl" testKey="interviewTracker" placeholder="https://docs.google.com/spreadsheets/d/..." hint="Step 4 — candidates in interview rounds" />
        <Field label="Offer & Joining Tracker URL" fkey="offerTrackerUrl" testKey="offerTracker" placeholder="https://docs.google.com/spreadsheets/d/..." hint="Separate sheet with Name, Role, Centre, Offered released date, DOJ, Joining Status — powers the Joining Ratio and Yet to Join cards" />
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.cardBdr}`, borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: T.text, fontFamily: "'Syne',sans-serif", marginBottom: "18px", paddingBottom: "12px", borderBottom: `1px solid ${T.cardBdr}` }}>🔔 Alert Settings</div>
        <Field label="Your Email" fkey="alertEmail" placeholder="dinesh.t@locobear.com" hint="Daily morning digest of overdue tracker updates" />
        <Field label="Centre HR Emails (comma separated)" fkey="centreHREmails" placeholder="nisarga.d@locobear.com, bosky.p@locobear.com" hint="Reminder emails sent to these automatically" />
        <div>
          <label style={lS}>Alert me if no update for...</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {[1, 2, 3].map(d => (
              <button key={d} onClick={() => update("overdueThreshold", d)} style={{ ...bB, background: form.overdueThreshold === d ? "rgba(232,93,58,0.2)" : T.btnSecBg, border: `1px solid ${form.overdueThreshold === d ? "rgba(232,93,58,0.4)" : T.inputBdr}`, color: form.overdueThreshold === d ? "#e85d3a" : T.textSub, padding: "8px 18px" }}>
                {d} day{d > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={() => onSave(form)} style={{ ...bB, background: "linear-gradient(135deg,#e85d3a,#f59e0b)", color: "white", padding: "12px 28px", boxShadow: "0 4px 14px rgba(232,93,58,0.3)", fontSize: "13px" }}>💾 Save & Connect</button>
        <button onClick={() => setForm(config)} style={{ ...bB, background: T.btnSecBg, border: `1px solid ${T.btnSecBdr}`, color: T.textSub }}>Reset</button>
      </div>
    </div>
  );
}

const DEFAULT_CONFIG = { taTrackerUrl: "", taTrackerSheet: "Sheet1", candidateTrackerUrl: "", interviewTrackerUrl: "", offerTrackerUrl: "", alertEmail: "", overdueThreshold: 1, centreHREmails: "" };

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(() => { try { return JSON.parse(localStorage.getItem("ta_dark") ?? "true"); } catch { return true; } });
  const [config, setConfig] = useState(() => { try { return JSON.parse(localStorage.getItem("ta_config")) || DEFAULT_CONFIG; } catch { return DEFAULT_CONFIG; } });
  const [data, setData] = useState(MOCK_DATA);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [time, setTime] = useState(new Date());
  const [offerEntries, setOfferEntries] = useState(null);

  const T = getTheme(darkMode);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    try { localStorage.setItem("ta_dark", JSON.stringify(next)); } catch {}
  };

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 60000); return () => clearInterval(t); }, []);

  const showToast = useCallback((message, type = "success") => setToast({ message, type }), []);
  const openModal = useCallback((title, positions, showDoj = false) => setModal({ title, positions, showDoj }), []);
  const openOfferModal = useCallback((title, entries) => {
    const positions = entries.map((e, i) => ({
      id: i, name: e.name || "", role: e.role || "", centre: e.centre || "",
      doj: e.doj || "", joiningStatus: e.joiningStatus || "Offered", remarks: e.remarks || "",
    }));
    setModal({ title, positions, showOffer: true });
  }, []);

  const openDojModal = useCallback((title, entries) => {
    const positions = entries.map((e, i) => ({
      id: i, name: e.name || e.offerCandidate || "", role: e.role || "",
      centre: e.centre || "", doj: e.doj || e.expectedClosure || "", joiningStatus: e.joiningStatus || "Offered",
    }));
    setModal({ title, positions, showDoj: true });
  }, []);

  const loadOfferData = useCallback(async (cfg) => {
    if (!cfg.offerTrackerUrl) return;
    try {
      const sheetId = extractSheetId(cfg.offerTrackerUrl);
      if (!sheetId) return;
      const rows = await fetchSheetData(sheetId, "Sheet1");
      const entries = rows.filter(r => r["Name"] && r["Name"].trim() !== "").map(r => ({
        name: (r["Name"] || "").trim(),
        role: (r["Role"] || "").trim(),
        centre: (r["Centre"] || "").trim(),
        offerDate: (r["Offered released date"] || "").trim(),
        doj: (r["DOJ"] || "").trim(),
        joiningStatus: (r["Joining Status"] || "").trim(),
        remarks: (r["Remarks"] || "").trim(),
      }));
      setOfferEntries(entries);
      setToast({ message: `Offer tracker loaded — ${entries.length} entries`, type: "success" });
    } catch {
      setToast({ message: "Could not load Offer & Joining sheet. Check sharing settings.", type: "error" });
    }
  }, []);

  const loadLiveData = useCallback(async (cfg) => {
    if (!cfg.taTrackerUrl) return;
    setLoading(true);
    try {
      const sheetId = extractSheetId(cfg.taTrackerUrl);
      if (!sheetId) throw new Error("Invalid URL");
      const rows = await fetchSheetData(sheetId, cfg.taTrackerSheet || "Sheet1");
      const positions = parseSheetToPositions(rows);
      if (positions.length > 0) {
        setData(prev => ({ ...prev, openPositions: positions, avgTat: positions._avgTat, tatCount: positions._tatCount }));
        setIsLive(true);
        setToast({ message: `Loaded ${positions.length} positions from Google Sheets!`, type: "success" });
      } else {
        setToast({ message: "Sheet connected but no data found. Check your column names match.", type: "error" });
      }
    } catch {
      setToast({ message: "Could not load sheet. Make sure sharing is 'Anyone with the link'.", type: "error" });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (config.taTrackerUrl) loadLiveData(config);
    if (config.offerTrackerUrl) loadOfferData(config);
  }, []);

  const handleSave = async (newConfig) => {
    setConfig(newConfig);
    try { localStorage.setItem("ta_config", JSON.stringify(newConfig)); } catch {}
    showToast("Settings saved! Connecting to your sheets...");
    await loadLiveData(newConfig);
    await loadOfferData(newConfig);
    setActiveTab("dashboard");
  };

  const handleTest = async (key, url) => {
    if (!url) return false;
    try {
      const sheetId = extractSheetId(url);
      if (!sheetId) return false;
      const rows = await fetchSheetData(sheetId, config.taTrackerSheet || "Sheet1");
      return rows.length > 0;
    } catch { return false; }
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard",     icon: "⊞", badge: 0 },
    { id: "positions", label: "Open Positions", icon: "◈", badge: 0 },
    { id: "settings",  label: "Settings",       icon: "⚙", badge: !config.taTrackerUrl ? 1 : 0 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, backgroundImage: T.bgGrad, fontFamily: "'DM Sans', sans-serif", color: T.text, display: "flex" }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.scrollThumb};border-radius:2px}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}input::placeholder{color:${T.textMuted}}input:focus{border-color:rgba(232,93,58,0.4)!important}`}</style>

      <div style={{ width: "220px", minHeight: "100vh", background: T.sidebar, borderRight: `1px solid ${T.sidebarBdr}`, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <Logo T={T} />
        <nav style={{ padding: "14px 10px", flex: 1 }}>
          <div style={{ fontSize: "8px", color: T.navLabel, letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 10px 8px", fontFamily: "'Syne',sans-serif" }}>Navigation</div>
          {tabs.map(tab => <NavItem key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} T={T} />)}
        </nav>
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.sidebarBdr}` }}>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#e85d3a", fontFamily: "'Syne',sans-serif" }}>{time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
          <div style={{ fontSize: "9px", color: T.timeColor, marginTop: "2px" }}>{time.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</div>
        </div>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.sidebarBdr}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg,#e85d3a,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: "white", fontFamily: "'Syne',sans-serif" }}>D</div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: T.userName }}>Dinesh T.</div>
              <div style={{ fontSize: "9px", color: isLive ? "#10b981" : T.textSub }}>{isLive ? "🟢 Live data" : "⚫ Demo data"}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", minHeight: "100vh" }}>
        <div style={{ padding: "18px 28px", borderBottom: `1px solid ${T.headerBdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, background: T.header, backdropFilter: "blur(12px)" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: T.text, fontFamily: "'Syne',sans-serif" }}>
              {tabs.find(t => t.id === activeTab)?.label}
              {loading && <span style={{ fontSize: "11px", color: "#f59e0b", marginLeft: "10px", fontFamily: "'DM Sans',sans-serif", fontWeight: "400" }}>⏳ Loading...</span>}
            </h1>
            <div style={{ fontSize: "10px", color: T.textMuted, marginTop: "2px" }}>{time.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {config.taTrackerUrl && <button onClick={() => { loadLiveData(config); loadOfferData(config); }} style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "11px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", cursor: "pointer", fontWeight: "500" }}>🔄 Refresh</button>}
            <button onClick={toggleTheme} title={darkMode ? "Switch to Light" : "Switch to Dark"} style={{ padding: "7px 12px", borderRadius: "8px", fontSize: "14px", background: T.btnSecBg, border: `1px solid ${T.btnSecBdr}`, color: T.btnSecTxt, cursor: "pointer", lineHeight: 1 }}>{darkMode ? "☀️" : "🌙"}</button>
            <button onClick={() => setActiveTab("settings")} style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: "600", background: "linear-gradient(135deg,#e85d3a,#f59e0b)", border: "none", color: "white", cursor: "pointer", boxShadow: "0 3px 10px rgba(232,93,58,0.3)" }}>
              {config.taTrackerUrl ? "⚙ Settings" : "⚡ Connect Data"}
            </button>
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {activeTab === "dashboard" && <DashboardTab data={data} isLive={isLive} onOpenModal={openModal} onOpenDojModal={openDojModal} onOpenOfferModal={openOfferModal} offerEntries={offerEntries} T={T} />}
          {activeTab === "positions" && <PositionsTab data={data} T={T} />}
          {activeTab === "settings"  && <SettingsTab config={config} onSave={handleSave} onTest={handleTest} T={T} />}
        </div>
      </div>

      {modal && <PositionModal title={modal.title} positions={modal.positions} onClose={() => setModal(null)} T={T} showDoj={modal.showDoj} showOffer={modal.showOffer} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";

const MOCK_DATA = {
  openPositions: [
    { id: 1, role: "Marketing Manager", centre: "Bangalore", step: 4, daysOpen: 12, hr: "Nisarga D.", status: "interview", priority: "high" },
    { id: 2, role: "Games Experience Executive", centre: "Loco Lane", step: 3, daysOpen: 8, hr: "Nisarga D.", status: "screening", priority: "medium" },
    { id: 3, role: "Performance Marketing", centre: "Bangalore", step: 5, daysOpen: 18, hr: "Bosky P.", status: "final", priority: "high" },
    { id: 4, role: "Senior TA Executive", centre: "Dubai", step: 2, daysOpen: 5, hr: "Wilfred W.", status: "tracker", priority: "medium" },
    { id: 5, role: "Event Coordinator", centre: "Raipur", step: 1, daysOpen: 3, hr: "HR Raipur", status: "new", priority: "low" },
    { id: 6, role: "Event Coordinator", centre: "Raipur", step: 1, daysOpen: 3, hr: "HR Raipur", status: "new", priority: "low" },
    { id: 7, role: "Brand Executive", centre: "Rebounce", step: 6, daysOpen: 22, hr: "Pallavi V.", status: "offer", priority: "high" },
    { id: 8, role: "Operations Lead", centre: "Brigade", step: 3, daysOpen: 10, hr: "Bosky P.", status: "screening", priority: "medium" },
  ],
  compliance: [
    { name: "Nisarga D.", centre: "Bangalore", compliant: 4, overdue: 1, total: 5, percent: 80, lastUpdated: "Today, 9:30 AM" },
    { name: "Bosky P.", centre: "Brigade", compliant: 3, overdue: 0, total: 3, percent: 100, lastUpdated: "Today, 8:15 AM" },
    { name: "Wilfred W.", centre: "Dubai", compliant: 1, overdue: 2, total: 3, percent: 33, lastUpdated: "2 days ago" },
    { name: "HR Raipur", centre: "Raipur", compliant: 2, overdue: 1, total: 3, percent: 67, lastUpdated: "Yesterday" },
    { name: "Pallavi V.", centre: "Rebounce", compliant: 5, overdue: 0, total: 5, percent: 100, lastUpdated: "Today, 10:00 AM" },
  ],
  todayInterviews: [
    { time: "10:30 AM", role: "Marketing Manager", candidate: "Pratik Rao", round: "Round 1", interviewer: "Himanshu K.", status: "upcoming" },
    { time: "11:30 AM", role: "Games Experience Executive", candidate: "Maaz Altamash", round: "Round 1", interviewer: "Nisarga D.", status: "upcoming" },
    { time: "12:30 PM", role: "Performance Marketing", candidate: "Aswin J.", round: "Final Round", interviewer: "Himanshu K.", status: "upcoming" },
  ],
  alerts: [
    { id: 1, type: "error", message: "Wilfred W. — Interview Tracker not updated for 2 positions (Dubai)", time: "2h ago" },
    { id: 2, type: "warning", message: "HR Raipur — Candidate Tracker missing for Event Coordinator #2", time: "5h ago" },
    { id: 3, type: "warning", message: "Nisarga D. — Feedback pending for Performance Marketing Round 1", time: "1d ago" },
    { id: 4, type: "success", message: "Bosky P. — All trackers up to date ✓", time: "3h ago" },
    { id: 5, type: "success", message: "Pallavi V. — Brand Executive offer letter sent ✓", time: "1h ago" },
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
const ALERT_CONFIG = {
  error:   { border: "#e85d3a", bg: "rgba(232,93,58,0.07)",  icon: "🔴" },
  warning: { border: "#f59e0b", bg: "rgba(245,158,11,0.07)", icon: "🟡" },
  info:    { border: "#3b82f6", bg: "rgba(59,130,246,0.07)", icon: "🔵" },
  success: { border: "#10b981", bg: "rgba(16,185,129,0.07)", icon: "🟢" },
};

// Colour palette for centre dots/bars — cycles if more than 8 centres
const CENTRE_COLOURS = [
  "#6366f1", "#e85d3a", "#f59e0b", "#10b981",
  "#8b5cf6", "#3b82f6", "#f97316", "#ec4899",
];

function extractSheetId(url) {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

async function fetchSheetData(sheetId, sheetName = "Sheet1") {
  // CSV export bypasses any active filters — always returns all rows
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(csvUrl);
  const text = await res.text();

  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  const rows = lines.slice(1)
    .filter(line => line.trim() !== "")
    .map(line => {
      const values = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; }
        else { current += ch; }
      }
      values.push(current.trim());
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
    })
    .filter(row => Object.values(row).some(v => v !== ""));

  return rows;
}

function inferStepFromRow(row) {
  const positionClosedDate = row["Position close date / Offer Letter release date"] || row["Position close date"] || "";
  const offerCandidate = row["Offer Candidate name"] || "";
  const doj = row["DOJ"] || "";
  const signLetter = row["Received Sign Letter Date"] || "";
  const openPos = row["Open position"];
  const action = (row["Action"] || "").toLowerCase();

  if (doj && String(doj).trim()) return 7;
  if (signLetter && String(signLetter).trim()) return 7;
  if (positionClosedDate && String(positionClosedDate).trim()) return 6;
  if (offerCandidate && String(offerCandidate).trim()) return 6;
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
  try {
    if (typeof dateStr === "number") {
      const msPerDay = 86400000;
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateStr * msPerDay);
      return Math.floor((new Date() - date) / msPerDay);
    }
    const date = new Date(dateStr);
    if (isNaN(date)) return 0;
    return Math.floor((new Date() - date) / 86400000);
  } catch { return 0; }
}

function parseSheetToPositions(rows) {
  return rows.map((row, i) => {
    const step = inferStepFromRow(row);
    const daysOpen = calcDaysOpen(row);
    const status = inferStatusFromStep(step);

    // ── Centre: read directly from "Centers" or "Centre" column ──
    const centre = (
      row["Centers"] ||
      row["Centre"] ||
      row["Center"] ||
      "Unknown"
    ).toString().trim();

    return {
      id: i + 1,
      role: (row["Role"] || row["Role "] || "").trim(),
      centre,
      step,
      daysOpen,
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
    };
  }).filter(p => {
    if (!p.role || p.role === "") return false;
    const action = (p._action || "").toLowerCase().trim();
    // Keep "In Progress" rows for open positions
    // AND keep offer/joined rows for ratio calculation
    return (
      action === "in progress" ||
      action === "inprogress" ||
      action === "offer" ||
      action === "offered" ||
      action === "joined" ||
      action === "closed" ||
      (p.offerCandidate && p.offerCandidate.toString().trim() !== "")
    );
  });
}

const S = {
  app: { minHeight: "100vh", background: "#0a0a0f", fontFamily: "'DM Sans', sans-serif", color: "#e0e0e8", display: "flex", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,93,58,0.08), transparent)" },
  sidebar: { width: "220px", minHeight: "100vh", background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" },
  main: { flex: 1, overflow: "auto", minHeight: "100vh" },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px" },
  input: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px 14px", color: "#ddd", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" },
  label: { fontSize: "11px", color: "#555", marginBottom: "6px", display: "block", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase" },
  btn: { padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600", fontFamily: "'DM Sans', sans-serif" },
};

function Logo() {
  return (
    <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg,#e85d3a,#f59e0b)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "800", color: "white", fontFamily: "'Syne',sans-serif", boxShadow: "0 4px 12px rgba(232,93,58,0.35)" }}>L</div>
        <div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#fff", fontFamily: "'Syne',sans-serif", letterSpacing: "0.06em" }}>LOCO BEAR</div>
          <div style={{ fontSize: "9px", color: "#444", letterSpacing: "0.12em" }}>TA OPERATIONS</div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ tab, active, onClick }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: "9px", padding: "9px 12px", borderRadius: "8px", border: "none", cursor: "pointer", background: active ? "rgba(232,93,58,0.1)" : "transparent", color: active ? "#e85d3a" : "#555", fontSize: "12px", fontWeight: active ? "600" : "400", marginBottom: "2px", textAlign: "left", transition: "all 0.15s", borderLeft: active ? "2px solid #e85d3a" : "2px solid transparent", fontFamily: "'DM Sans',sans-serif" }}>
      <span style={{ fontSize: "13px", width: "16px", textAlign: "center" }}>{tab.icon}</span>
      {tab.label}
      {tab.badge > 0 && <span style={{ marginLeft: "auto", background: "#e85d3a", color: "white", borderRadius: "10px", padding: "1px 6px", fontSize: "9px", fontWeight: "700" }}>{tab.badge}</span>}
    </button>
  );
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function PositionModal({ title, positions, onClose }) {
  if (!positions) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "#13131a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", width: "90%", maxWidth: "900px", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#fff", fontFamily: "'Syne',sans-serif" }}>{title}</div>
            <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{positions.length} position{positions.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#888", fontSize: "13px", padding: "6px 12px", cursor: "pointer" }}>✕ Close</button>
        </div>
        <div style={{ overflow: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, background: "#13131a", zIndex: 1 }}>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                {["Role", "Centre", "HR Owner", "Step", "Days Open", "Expected Closure", "Status", "Offer Candidate"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "9px", color: "#444", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#333" }}>No positions found</td></tr>
              )}
              {positions.map((pos, i) => {
                const sc = STATUS_CONFIG[pos.status] || STATUS_CONFIG.new;
                const isOverdue = pos.expectedClosure && new Date(pos.expectedClosure) < new Date() && pos.status !== "closed";
                return (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: isOverdue ? "rgba(232,93,58,0.04)" : "transparent" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => e.currentTarget.style.background = isOverdue ? "rgba(232,93,58,0.04)" : "transparent"}>
                    <td style={{ padding: "12px 14px", fontSize: "12px", fontWeight: "600", color: "#ddd" }}>{pos.role}</td>
                    <td style={{ padding: "12px 14px", fontSize: "11px", color: "#666" }}>{pos.centre}</td>
                    <td style={{ padding: "12px 14px", fontSize: "11px", color: "#666" }}>{pos.hr}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: "2px" }}>
                        {[1,2,3,4,5,6,7].map(s => <div key={s} style={{ width: "14px", height: "3px", borderRadius: "2px", background: s <= pos.step ? "#e85d3a" : "rgba(255,255,255,0.08)" }} />)}
                      </div>
                      <div style={{ fontSize: "9px", color: "#555", marginTop: "3px" }}>Step {pos.step}</div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: pos.daysOpen > 14 ? "#e85d3a" : pos.daysOpen > 7 ? "#f59e0b" : "#10b981" }}>{pos.daysOpen}d</span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "11px", color: isOverdue ? "#e85d3a" : "#666", fontWeight: isOverdue ? "600" : "400" }}>
                      {pos.expectedClosure || "—"}
                      {isOverdue && <span style={{ marginLeft: "5px", fontSize: "9px" }}>⚠ OVERDUE</span>}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "9px", fontWeight: "700", background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "11px", color: "#777" }}>{pos.offerCandidate || "—"}</td>
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

function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 1000, background: type === "error" ? "linear-gradient(135deg,#e85d3a,#dc2626)" : "linear-gradient(135deg,#e85d3a,#f59e0b)", color: "white", padding: "12px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", boxShadow: "0 8px 24px rgba(232,93,58,0.4)", maxWidth: "320px", lineHeight: "1.4" }}>
      {type === "error" ? "❌ " : "✅ "}{message}
    </div>
  );
}

function SettingsTab({ config, onSave, onTest }) {
  const [form, setForm] = useState(config);
  const [testing, setTesting] = useState({});
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTest = async (key) => {
    setTesting(t => ({ ...t, [key]: "testing" }));
    const ok = await onTest(key, form[key === "taTracker" ? "taTrackerUrl" : key === "candidateTracker" ? "candidateTrackerUrl" : "interviewTrackerUrl"]);
    setTesting(t => ({ ...t, [key]: ok ? "ok" : "fail" }));
    setTimeout(() => setTesting(t => ({ ...t, [key]: null })), 3000);
  };

  const testIcon = k => ({ testing: "⏳", ok: "✅", fail: "❌" }[testing[k]] || "Test");

  const Field = ({ label, fkey, testKey, placeholder, hint }) => (
    <div style={{ marginBottom: "18px" }}>
      <label style={S.label}>{label}</label>
      <div style={{ display: "flex", gap: "8px" }}>
        <input style={S.input} placeholder={placeholder} value={form[fkey] || ""} onChange={e => update(fkey, e.target.value)} />
        {testKey && (
          <button onClick={() => handleTest(testKey)} style={{ ...S.btn, background: testing[testKey] === "ok" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: testing[testKey] === "ok" ? "#10b981" : "#888", padding: "10px 14px", whiteSpace: "nowrap" }}>
            {testIcon(testKey)}
          </button>
        )}
      </div>
      {hint && <div style={{ fontSize: "10px", color: "#444", marginTop: "5px", lineHeight: "1.5" }}>{hint}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: "680px" }}>
      <h2 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: "700", color: "#fff", fontFamily: "'Syne',sans-serif" }}>Connect Your Data</h2>
      <p style={{ margin: "0 0 24px", fontSize: "12px", color: "#555", lineHeight: "1.6" }}>Paste your Google Sheet links below. Make sure each sheet is set to <strong style={{ color: "#888" }}>"Anyone with the link — Viewer"</strong> in sharing settings.</p>

      <div style={{ ...S.card, marginBottom: "20px", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#818cf8", marginBottom: "10px" }}>📌 How to make your Google Sheet public (read-only):</div>
        {["Open your Google Sheet", "Click the 'Share' button (top right)", "Click 'Change to anyone with the link'", "Make sure it says 'Viewer' (not Editor)", "Click 'Copy link' and paste it below"].map((s, i) => (
          <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "6px", alignItems: "flex-start" }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "rgba(99,102,241,0.2)", color: "#818cf8", fontSize: "10px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>{i + 1}</div>
            <div style={{ fontSize: "11px", color: "#888" }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ ...S.card, marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff", fontFamily: "'Syne',sans-serif", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>📊 Google Sheets Trackers</div>
        <Field label="TA Tracker URL" fkey="taTrackerUrl" testKey="taTracker" placeholder="https://docs.google.com/spreadsheets/d/..." hint="Your main open positions tracker (Step 2 of TA Process)" />
        <Field label="Sheet Tab Name" fkey="taTrackerSheet" placeholder="Sheet1" hint="Exact name of the tab inside the spreadsheet — e.g. Sheet1, Open Positions, TA Tracker" />
        <Field label="Candidate Tracker URL" fkey="candidateTrackerUrl" testKey="candidateTracker" placeholder="https://docs.google.com/spreadsheets/d/..." hint="Step 3 — all screened/shortlisted profiles" />
        <Field label="Interview Tracker URL" fkey="interviewTrackerUrl" testKey="interviewTracker" placeholder="https://docs.google.com/spreadsheets/d/..." hint="Step 4 — candidates in interview rounds" />
      </div>

      <div style={{ ...S.card, marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff", fontFamily: "'Syne',sans-serif", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>🔔 Alert Settings</div>
        <Field label="Your Email (for daily compliance alerts)" fkey="alertEmail" placeholder="dinesh.t@locobear.com" hint="You'll receive a daily morning digest of overdue tracker updates" />
        <Field label="Centre HR Emails (comma separated)" fkey="centreHREmails" placeholder="nisarga.d@locobear.com, bosky.p@locobear.com, wilfred.w@locobear.com" hint="Reminder emails will be sent to these addresses automatically" />
        <div>
          <label style={S.label}>Alert me if no update for...</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {[1, 2, 3].map(d => (
              <button key={d} onClick={() => update("overdueThreshold", d)} style={{ ...S.btn, background: form.overdueThreshold === d ? "rgba(232,93,58,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${form.overdueThreshold === d ? "rgba(232,93,58,0.4)" : "rgba(255,255,255,0.08)"}`, color: form.overdueThreshold === d ? "#e85d3a" : "#666", padding: "8px 18px" }}>
                {d} day{d > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={() => onSave(form)} style={{ ...S.btn, background: "linear-gradient(135deg,#e85d3a,#f59e0b)", color: "white", padding: "12px 28px", boxShadow: "0 4px 14px rgba(232,93,58,0.3)", fontSize: "13px" }}>
          💾 Save & Connect
        </button>
        <button onClick={() => setForm(config)} style={{ ...S.btn, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#666" }}>
          Reset
        </button>
      </div>
    </div>
  );
}

// ── CENTRE BREAKDOWN CARD ─────────────────────────────────────────────────────
function CentreBreakdown({ positions }) {
  const active = positions.filter(p => p.status !== "closed");
  const total = active.length;

  // Build centre → count map, reading the "centre" field set during sheet parse
  const centreMap = {};
  active.forEach(p => {
    const key = (p.centre || "Unknown").trim();
    centreMap[key] = (centreMap[key] || 0) + 1;
  });

  const sorted = Object.entries(centreMap).sort((a, b) => b[1] - a[1]);

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "#fff", fontFamily: "'Syne',sans-serif" }}>Open positions by centre</div>
        <span style={{ fontSize: "10px", color: "#555" }}>{total} active</span>
      </div>

      {sorted.length === 0 && (
        <div style={{ fontSize: "12px", color: "#444", textAlign: "center", padding: "20px 0" }}>No active positions</div>
      )}

      {sorted.map(([centre, count], i) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const colour = CENTRE_COLOURS[i % CENTRE_COLOURS.length];
        return (
          <div key={centre} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: i < sorted.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
            {/* Colour dot */}
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: colour, flexShrink: 0 }} />
            {/* Centre name */}
            <div style={{ fontSize: "11px", color: "#bbb", minWidth: "90px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{centre}</div>
            {/* Bar */}
            <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "2px", width: `${pct}%`, background: colour, transition: "width 0.4s ease" }} />
            </div>
            {/* Count */}
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#ddd", minWidth: "18px", textAlign: "right" }}>{count}</span>
            {/* Percent */}
            <span style={{ fontSize: "10px", color: "#444", minWidth: "32px", textAlign: "right" }}>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

function DashboardTab({ data, isLive, onOpenModal }) {
  const today = new Date();

  const yetToJoin = data.openPositions.filter(p =>
    p.offerCandidate && p.offerCandidate.toString().trim() !== "" &&
    p.doj && p.doj.toString().trim() !== "" &&
    p.joiningStatus.trim() === ""
  );

  const overduePositions = data.openPositions.filter(p => {
    if (!p.expectedClosure) return false;
    const closureDate = new Date(p.expectedClosure);
    return !isNaN(closureDate) && closureDate < today && p.status !== "closed";
  });

  const avgCompliance = Math.round(data.compliance.reduce((a, c) => a + c.percent, 0) / data.compliance.length);

  const StatCard = ({ label, value, sub, color, icon, onClick, clickable }) => (
    <div onClick={onClick} style={{ ...S.card, borderTop: `3px solid ${color}`, cursor: clickable ? "pointer" : "default", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { if(clickable) { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 24px ${color}22`; }}}
      onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}>
      <div style={{ fontSize: "20px", marginBottom: "10px" }}>{icon}</div>
      <div style={{ fontSize: "28px", fontWeight: "800", color, fontFamily: "'Syne',sans-serif" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "#888", marginTop: "5px" }}>{label}</div>
      <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>{sub}</div>
      {clickable && <div style={{ fontSize: "9px", color: color, marginTop: "8px", opacity: 0.7 }}>Click to view →</div>}
    </div>
  );

  return (
    <div>
      {isLive && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "6px 14px", borderRadius: "20px", marginBottom: "20px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "11px", color: "#10b981", fontWeight: "600" }}>Live data from Google Sheets</span>
        </div>
      )}
      {!isLive && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "6px 14px", borderRadius: "20px", marginBottom: "20px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: "600" }}>⚡ Showing demo data — go to Settings to connect your Google Sheets</span>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "14px", marginBottom: "24px" }}>
        <StatCard
          label="Active Open Positions" value={data.openPositions.filter(p => p.status !== "closed").length}
          sub="across all centres" color="#6366f1" icon="📋"
          clickable={true}
          onClick={() => onOpenModal("Active Positions", data.openPositions.filter(p => p.status !== "closed"))}
        />
        {(() => {
          const offered    = data.openPositions.filter(p =>
            p.offerCandidate && p.offerCandidate.toString().trim() !== "" &&
            p.doj && p.doj.toString().trim() !== ""
          );
          const joined     = offered.filter(p => p.joiningStatus.toLowerCase() === "joined");
          const notJoining = offered.filter(p => p.joiningStatus.toLowerCase() === "not joined");
          const pending    = offered.filter(p => p.joiningStatus.trim() === "");
          const ratio      = offered.length > 0 ? Math.round((joined.length / offered.length) * 100) : 0;
          return (
            <StatCard
              label="Offer → Joining Ratio" value={`${ratio}%`}
              sub={`${joined.length} joined · ${notJoining.length} not joining · ${pending.length} pending`}
              color="#06b6d4" icon="🤝"
              clickable={offered.length > 0}
              onClick={() => offered.length > 0 && onOpenModal("Offer → Joining", offered)}
            />
          );
        })()}
        <StatCard
          label="Yet to Join" value={(() => {
            const offered = data.openPositions.filter(p =>
              p.offerCandidate && p.offerCandidate.toString().trim() !== "" &&
              p.doj && p.doj.toString().trim() !== ""
            );
            return offered.filter(p => p.joiningStatus.trim() === "").length;
          })()}
          sub="offer & DOJ set, status pending" color="#8b5cf6" icon="🕐"
          clickable={true}
          onClick={() => {
            const pending = data.openPositions.filter(p =>
              p.offerCandidate && p.offerCandidate.toString().trim() !== "" &&
              p.doj && p.doj.toString().trim() !== "" &&
              p.joiningStatus.trim() === ""
            );
            pending.length > 0 && onOpenModal("Yet to Join", pending);
          }}
        />
        <StatCard
          label="Overdue Positions" value={overduePositions.length}
          sub="past expected closure date" color="#e85d3a" icon="⚠️"
          clickable={overduePositions.length > 0}
          onClick={() => overduePositions.length > 0 && onOpenModal("Overdue Positions", overduePositions)}
        />
        <StatCard
          label="Avg Compliance" value={`${avgCompliance}%`}
          sub="across all Centre HRs" color="#10b981" icon="✅"
          clickable={false}
        />
      </div>

      {/* ── Centre Breakdown + Compliance ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

        {/* LEFT — Centre breakdown (mapped from Centers column) */}
        <CentreBreakdown positions={data.openPositions} />

        {/* RIGHT — Compliance snapshot */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#fff", fontFamily: "'Syne',sans-serif" }}>Compliance Snapshot</div>
          </div>
          {data.compliance.map((hr, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", color: "#bbb" }}>{hr.name}</span>
                <span style={{ fontSize: "11px", fontWeight: "700", color: hr.percent === 100 ? "#10b981" : hr.percent < 50 ? "#e85d3a" : "#f59e0b" }}>{hr.percent}%</span>
              </div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "2px", width: `${hr.percent}%`, background: hr.percent === 100 ? "#10b981" : hr.percent < 50 ? "#e85d3a" : "#f59e0b" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pipeline ── */}
      <div style={S.card}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "#fff", fontFamily: "'Syne',sans-serif", marginBottom: "16px" }}>Hiring Pipeline — Positions by Step</div>
        <div style={{ display: "flex", gap: "8px" }}>
          {STEP_LABELS.slice(1).map((step, i) => {
            const count = data.openPositions.filter(p => p.step === i + 1).length;
            return (
              <div key={i} style={{ flex: 1, textAlign: "center", cursor: count > 0 ? "pointer" : "default" }}
                onClick={() => count > 0 && onOpenModal(`Step ${i+1}: ${step}`, data.openPositions.filter(p => p.step === i + 1))}>
                <div style={{ background: count > 0 ? "rgba(232,93,58,0.12)" : "rgba(255,255,255,0.02)", border: count > 0 ? "1px solid rgba(232,93,58,0.3)" : "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "12px 4px" }}>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: count > 0 ? "#e85d3a" : "#2a2a3a", fontFamily: "'Syne',sans-serif" }}>{count}</div>
                  <div style={{ fontSize: "8px", color: "#444", marginTop: "5px", lineHeight: "1.4" }}>{step}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PositionsTab({ data }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? data.openPositions : data.openPositions.filter(p => p.status === filter);
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {["all", "new", "screening", "interview", "final", "offer"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", background: filter === f ? "#e85d3a" : "rgba(255,255,255,0.04)", color: filter === f ? "white" : "#666", transition: "all 0.15s" }}>{f}</button>
        ))}
      </div>
      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
              {["Role", "Centre", "HR Owner", "Step Progress", "Days Open", "Status", "Priority"].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "9px", color: "#444", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)", fontFamily: "'Syne',sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#333", fontSize: "13px" }}>No positions found</td></tr>}
            {filtered.map(pos => {
              const sc = STATUS_CONFIG[pos.status] || STATUS_CONFIG.new;
              return (
                <tr key={pos.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "13px 14px", fontSize: "12px", fontWeight: "600", color: "#ddd" }}>{pos.role}</td>
                  <td style={{ padding: "13px 14px", fontSize: "11px", color: "#666" }}>{pos.centre}</td>
                  <td style={{ padding: "13px 14px", fontSize: "11px", color: "#666" }}>{pos.hr}</td>
                  <td style={{ padding: "13px 14px", minWidth: "140px" }}>
                    <div style={{ display: "flex", gap: "3px", marginBottom: "4px" }}>
                      {[1,2,3,4,5,6,7].map(s => <div key={s} style={{ flex: 1, height: "4px", borderRadius: "2px", background: s < pos.step ? "#e85d3a" : s === pos.step ? "#f59e0b" : "rgba(255,255,255,0.08)" }} />)}
                    </div>
                    <div style={{ fontSize: "9px", color: "#555" }}>Step {pos.step} — {STEP_LABELS[pos.step]}</div>
                  </td>
                  <td style={{ padding: "13px 14px" }}><span style={{ fontSize: "13px", fontWeight: "700", fontFamily: "'Syne',sans-serif", color: pos.daysOpen > 14 ? "#e85d3a" : pos.daysOpen > 7 ? "#f59e0b" : "#10b981" }}>{pos.daysOpen}d</span></td>
                  <td style={{ padding: "13px 14px" }}><span style={{ padding: "3px 9px", borderRadius: "20px", fontSize: "9px", fontWeight: "700", background: sc.bg, color: sc.color, letterSpacing: "0.06em" }}>{sc.label}</span></td>
                  <td style={{ padding: "13px 14px" }}><span style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: pos.priority === "high" ? "#e85d3a" : pos.priority === "medium" ? "#f59e0b" : "#555" }}>{pos.priority}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComplianceTab({ data, onRemind }) {
  return (
    <div style={{ display: "grid", gap: "14px" }}>
      {data.compliance.map((hr, i) => (
        <div key={i} style={{ ...S.card, border: `1px solid ${hr.percent === 100 ? "rgba(16,185,129,0.2)" : hr.percent < 50 ? "rgba(232,93,58,0.2)" : "rgba(255,255,255,0.07)"}`, display: "flex", alignItems: "center", gap: "18px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "50%", flexShrink: 0, background: hr.percent === 100 ? "linear-gradient(135deg,#10b981,#059669)" : hr.percent < 50 ? "linear-gradient(135deg,#e85d3a,#dc2626)" : "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: "700", color: "white", fontFamily: "'Syne',sans-serif" }}>{hr.name.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#ddd" }}>{hr.name}</div>
                <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>{hr.centre} · {hr.lastUpdated}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "22px", fontWeight: "800", fontFamily: "'Syne',sans-serif", color: hr.percent === 100 ? "#10b981" : hr.percent < 50 ? "#e85d3a" : "#f59e0b" }}>{hr.percent}%</div>
                <div style={{ fontSize: "10px", color: "#555" }}>{hr.compliant}/{hr.total} steps done</div>
              </div>
            </div>
            <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "3px", width: `${hr.percent}%`, background: hr.percent === 100 ? "#10b981" : hr.percent < 50 ? "#e85d3a" : "#f59e0b" }} />
            </div>
            {hr.overdue > 0 && (
              <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "11px", color: "#e85d3a" }}>⚠ {hr.overdue} overdue update{hr.overdue > 1 ? "s" : ""}</span>
                <button onClick={() => onRemind(hr)} style={{ padding: "3px 11px", borderRadius: "5px", fontSize: "10px", fontWeight: "600", background: "rgba(232,93,58,0.12)", border: "1px solid rgba(232,93,58,0.25)", color: "#e85d3a", cursor: "pointer" }}>Send Reminder</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function InterviewsTab({ data }) {
  return (
    <div style={{ display: "grid", gap: "14px" }}>
      {data.todayInterviews.length === 0 && <div style={{ ...S.card, textAlign: "center", padding: "60px", color: "#444" }}>No interviews today</div>}
      {data.todayInterviews.map((iv, i) => (
        <div key={i} style={{ ...S.card, display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ textAlign: "center", padding: "12px 16px", background: "rgba(232,93,58,0.08)", borderRadius: "10px", borderBottom: "3px solid #e85d3a", flexShrink: 0 }}>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#e85d3a", fontFamily: "'Syne',sans-serif" }}>{iv.time.split(" ")[0]}</div>
            <div style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>{iv.time.split(" ")[1]}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#fff", fontFamily: "'Syne',sans-serif" }}>{iv.candidate}</div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "3px" }}>{iv.role}</div>
            <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Interviewer: {iv.interviewer}</div>
            <div style={{ marginTop: "10px" }}>
              <span style={{ padding: "3px 9px", borderRadius: "20px", fontSize: "10px", fontWeight: "700", background: iv.round === "Final Round" ? "rgba(249,115,22,0.15)" : "rgba(99,102,241,0.15)", color: iv.round === "Final Round" ? "#f97316" : "#818cf8" }}>{iv.round}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "11px", fontWeight: "600", background: "linear-gradient(135deg,#e85d3a,#f59e0b)", border: "none", color: "white", cursor: "pointer" }}>Join Meet</button>
            <button style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "11px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#888", cursor: "pointer" }}>📋 Profile</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsTab({ data, onRemind }) {
  return (
    <div style={{ display: "grid", gap: "10px" }}>
      {data.alerts.map(alert => {
        const c = ALERT_CONFIG[alert.type] || ALERT_CONFIG.info;
        return (
          <div key={alert.id} style={{ ...S.card, padding: "14px 16px", borderLeft: `4px solid ${c.border}`, background: c.bg, display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "16px" }}>{c.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", color: "#ccc", lineHeight: "1.5" }}>{alert.message}</div>
              <div style={{ fontSize: "10px", color: "#444", marginTop: "3px" }}>{alert.time}</div>
            </div>
            {alert.type !== "success" && (
              <button onClick={() => onRemind(alert)} style={{ padding: "6px 13px", borderRadius: "7px", fontSize: "10px", fontWeight: "600", background: `${c.border}20`, border: `1px solid ${c.border}40`, color: c.border, cursor: "pointer", whiteSpace: "nowrap" }}>Send Reminder</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

const DEFAULT_CONFIG = { taTrackerUrl: "", taTrackerSheet: "Sheet1", candidateTrackerUrl: "", interviewTrackerUrl: "", alertEmail: "", overdueThreshold: 1, centreHREmails: "" };

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [config, setConfig] = useState(() => { try { return JSON.parse(localStorage.getItem("ta_config")) || DEFAULT_CONFIG; } catch { return DEFAULT_CONFIG; } });
  const [data, setData] = useState(MOCK_DATA);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 60000); return () => clearInterval(t); }, []);
  const showToast = (message, type = "success") => setToast({ message, type });
  const openModal = (title, positions) => setModal({ title, positions });

  const loadLiveData = useCallback(async (cfg) => {
    if (!cfg.taTrackerUrl) return;
    setLoading(true);
    try {
      const sheetId = extractSheetId(cfg.taTrackerUrl);
      if (!sheetId) throw new Error("Invalid URL");
      const rows = await fetchSheetData(sheetId, cfg.taTrackerSheet || "Sheet1");
      const positions = parseSheetToPositions(rows);
      if (positions.length > 0) {
        setData(prev => ({ ...prev, openPositions: positions }));
        setIsLive(true);
        showToast(`Loaded ${positions.length} positions from Google Sheets!`);
      } else {
        showToast("Sheet connected but no data found. Check your column names match.", "error");
      }
    } catch (e) {
      showToast("Could not load sheet. Make sure sharing is set to 'Anyone with the link'.", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (config.taTrackerUrl) loadLiveData(config); }, []);

  const handleSave = async (newConfig) => {
    setConfig(newConfig);
    try { localStorage.setItem("ta_config", JSON.stringify(newConfig)); } catch {}
    showToast("Settings saved! Connecting to your sheets...");
    await loadLiveData(newConfig);
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

  const handleRemind = (target) => showToast(`Reminder sent to ${target.name || "HR team"}!`);

  const tabs = [
    { id: "dashboard",  label: "Dashboard",     icon: "⊞", badge: 0 },
    { id: "positions",  label: "Open Positions", icon: "◈", badge: 0 },
    { id: "compliance", label: "Compliance",     icon: "◉", badge: 0 },
    { id: "interviews", label: "Interviews",     icon: "◷", badge: data.todayInterviews.length },
    { id: "alerts",     label: "Alerts",         icon: "◬", badge: data.alerts.filter(a => a.type !== "success").length },
    { id: "settings",   label: "Settings",       icon: "⚙", badge: !config.taTrackerUrl ? 1 : 0 },
  ];

  return (
    <div style={S.app}>
      <style>{`* { box-sizing:border-box; } ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} input::placeholder{color:#333} input:focus{border-color:rgba(232,93,58,0.4)!important}`}</style>

      <div style={S.sidebar}>
        <Logo />
        <nav style={{ padding: "14px 10px", flex: 1 }}>
          <div style={{ fontSize: "8px", color: "#333", letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 10px 8px", fontFamily: "'Syne',sans-serif" }}>Navigation</div>
          {tabs.map(tab => <NavItem key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />)}
        </nav>
        <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#e85d3a", fontFamily: "'Syne',sans-serif" }}>{time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
          <div style={{ fontSize: "9px", color: "#333", marginTop: "2px" }}>{time.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</div>
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg,#e85d3a,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: "white", fontFamily: "'Syne',sans-serif" }}>D</div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#ccc" }}>Dinesh T.</div>
              <div style={{ fontSize: "9px", color: isLive ? "#10b981" : "#555" }}>{isLive ? "🟢 Live data" : "⚫ Demo data"}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={S.main}>
        <div style={{ padding: "18px 28px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, background: "rgba(10,10,15,0.92)", backdropFilter: "blur(12px)" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#fff", fontFamily: "'Syne',sans-serif" }}>
              {tabs.find(t => t.id === activeTab)?.label}
              {loading && <span style={{ fontSize: "11px", color: "#f59e0b", marginLeft: "10px", fontFamily: "'DM Sans',sans-serif", fontWeight: "400" }}>⏳ Loading...</span>}
            </h1>
            <div style={{ fontSize: "10px", color: "#333", marginTop: "2px" }}>{time.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {config.taTrackerUrl && <button onClick={() => loadLiveData(config)} style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "11px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", cursor: "pointer", fontWeight: "500" }}>🔄 Refresh</button>}
            <button onClick={() => handleRemind({ name: "all Centre HRs" })} style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#777", cursor: "pointer" }}>📧 Send All Reminders</button>
            <button onClick={() => setActiveTab("settings")} style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: "600", background: "linear-gradient(135deg,#e85d3a,#f59e0b)", border: "none", color: "white", cursor: "pointer", boxShadow: "0 3px 10px rgba(232,93,58,0.3)" }}>
              {config.taTrackerUrl ? "⚙ Settings" : "⚡ Connect Data"}
            </button>
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {activeTab === "dashboard"  && <DashboardTab  data={data} isLive={isLive} onOpenModal={openModal} />}
          {activeTab === "positions"  && <PositionsTab  data={data} />}
          {activeTab === "compliance" && <ComplianceTab data={data} onRemind={handleRemind} />}
          {activeTab === "interviews" && <InterviewsTab data={data} />}
          {activeTab === "alerts"     && <AlertsTab     data={data} onRemind={handleRemind} />}
          {activeTab === "settings"   && <SettingsTab   config={config} onSave={handleSave} onTest={handleTest} />}
        </div>
      </div>

      {modal && <PositionModal title={modal.title} positions={modal.positions} onClose={() => setModal(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

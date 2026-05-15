import { useState, useEffect } from "react";

// ── MOCK DATA (replace with Google Sheets API later) ──────────────────────────
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
    { time: "10:30 AM", role: "Marketing Manager", candidate: "Pratik Rao", round: "Round 1", interviewer: "Himanshu K.", meet: "#", status: "upcoming" },
    { time: "11:30 AM", role: "Games Experience Executive", candidate: "Maaz Altamash", round: "Round 1", interviewer: "Nisarga D.", meet: "#", status: "upcoming" },
    { time: "12:30 PM", role: "Performance Marketing", candidate: "Aswin J.", round: "Final Round", interviewer: "Himanshu K.", meet: "#", status: "upcoming" },
  ],
  alerts: [
    { id: 1, type: "error", message: "Wilfred W. — Interview Tracker not updated for 2 positions (Dubai)", time: "2h ago", action: "Send Reminder" },
    { id: 2, type: "warning", message: "HR Raipur — Candidate Tracker missing for Event Coordinator #2", time: "5h ago", action: "Send Reminder" },
    { id: 3, type: "warning", message: "Nisarga D. — Feedback pending for Performance Marketing Round 1", time: "1d ago", action: "Send Reminder" },
    { id: 4, type: "info", message: "Performance Marketing Final Round today at 12:30 PM — decision needed", time: "Just now", action: "View" },
    { id: 5, type: "success", message: "Bosky P. — All trackers up to date across all positions ✓", time: "3h ago", action: null },
    { id: 6, type: "success", message: "Pallavi V. — Brand Executive offer letter sent, awaiting response ✓", time: "1h ago", action: null },
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
  error:   { border: "#e85d3a", bg: "rgba(232,93,58,0.07)",   icon: "🔴" },
  warning: { border: "#f59e0b", bg: "rgba(245,158,11,0.07)",  icon: "🟡" },
  info:    { border: "#3b82f6", bg: "rgba(59,130,246,0.07)",  icon: "🔵" },
  success: { border: "#10b981", bg: "rgba(16,185,129,0.07)",  icon: "🟢" },
};

// ── STYLES ────────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "#0a0a0f",
    fontFamily: "'DM Sans', sans-serif",
    color: "#e0e0e8",
    display: "flex",
    backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,93,58,0.08), transparent)",
  },
  sidebar: {
    width: "220px",
    minHeight: "100vh",
    background: "rgba(255,255,255,0.02)",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    position: "sticky",
    top: 0,
    height: "100vh",
  },
  main: { flex: 1, overflow: "auto", minHeight: "100vh" },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "14px",
    padding: "20px",
  },
};

// ── COMPONENTS ────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "34px", height: "34px",
          background: "linear-gradient(135deg, #e85d3a 0%, #f59e0b 100%)",
          borderRadius: "9px", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "17px", fontWeight: "800",
          color: "white", fontFamily: "'Syne', sans-serif", boxShadow: "0 4px 12px rgba(232,93,58,0.35)",
        }}>L</div>
        <div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#fff", fontFamily: "'Syne', sans-serif", letterSpacing: "0.06em" }}>LOCO BEAR</div>
          <div style={{ fontSize: "9px", color: "#444", letterSpacing: "0.12em", marginTop: "1px" }}>TA OPERATIONS</div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ tab, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: "9px",
      padding: "9px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
      background: active ? "rgba(232,93,58,0.1)" : "transparent",
      color: active ? "#e85d3a" : "#555",
      fontSize: "12px", fontWeight: active ? "600" : "400",
      marginBottom: "2px", textAlign: "left", transition: "all 0.15s",
      borderLeft: active ? "2px solid #e85d3a" : "2px solid transparent",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <span style={{ fontSize: "13px", width: "16px", textAlign: "center" }}>{tab.icon}</span>
      {tab.label}
      {tab.badge > 0 && (
        <span style={{
          marginLeft: "auto", background: "#e85d3a", color: "white",
          borderRadius: "10px", padding: "1px 6px", fontSize: "9px", fontWeight: "700",
        }}>{tab.badge}</span>
      )}
    </button>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ ...S.card, borderTop: `3px solid ${color}`, transition: "transform 0.2s", cursor: "default" }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
      <div style={{ fontSize: "20px", marginBottom: "10px" }}>{icon}</div>
      <div style={{ fontSize: "28px", fontWeight: "800", color, fontFamily: "'Syne', sans-serif" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "#888", marginTop: "5px", fontWeight: "500" }}>{label}</div>
      <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>{sub}</div>
    </div>
  );
}

function StepBar({ step }) {
  return (
    <div>
      <div style={{ display: "flex", gap: "3px", marginBottom: "4px" }}>
        {[1,2,3,4,5,6,7].map(s => (
          <div key={s} style={{
            flex: 1, height: "4px", borderRadius: "2px",
            background: s < step ? "#e85d3a" : s === step ? "#f59e0b" : "rgba(255,255,255,0.08)",
          }} />
        ))}
      </div>
      <div style={{ fontSize: "9px", color: "#555" }}>Step {step} — {STEP_LABELS[step]}</div>
    </div>
  );
}

function Badge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span style={{
      padding: "3px 9px", borderRadius: "20px", fontSize: "9px", fontWeight: "700",
      background: c.bg, color: c.color, letterSpacing: "0.06em",
    }}>{c.label}</span>
  );
}

function AlertCard({ alert, onRemind }) {
  const c = ALERT_CONFIG[alert.type] || ALERT_CONFIG.info;
  return (
    <div style={{
      ...S.card, padding: "14px 16px",
      borderLeft: `4px solid ${c.border}`,
      background: c.bg,
      display: "flex", alignItems: "center", gap: "12px",
    }}>
      <span style={{ fontSize: "16px" }}>{c.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "12px", color: "#ccc", lineHeight: "1.5" }}>{alert.message}</div>
        <div style={{ fontSize: "10px", color: "#444", marginTop: "3px" }}>{alert.time}</div>
      </div>
      {alert.action && alert.action === "Send Reminder" && (
        <button onClick={() => onRemind(alert)} style={{
          padding: "6px 13px", borderRadius: "7px", fontSize: "10px", fontWeight: "600",
          background: `${c.border}20`, border: `1px solid ${c.border}40`,
          color: c.border, cursor: "pointer", whiteSpace: "nowrap",
        }}>{alert.action}</button>
      )}
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────────
function DashboardTab({ data }) {
  const overdueCount = data.compliance.reduce((a, c) => a + c.overdue, 0);
  const interviewCount = data.openPositions.filter(p => p.step >= 4).length;
  const avgCompliance = Math.round(data.compliance.reduce((a, c) => a + c.percent, 0) / data.compliance.length);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "24px" }}>
        <StatCard label="Open Positions" value={data.openPositions.length} sub="across all centres" color="#6366f1" icon="📋" />
        <StatCard label="In Interview Stage" value={interviewCount} sub="active pipeline" color="#8b5cf6" icon="🎯" />
        <StatCard label="Overdue Updates" value={overdueCount} sub="needs your attention" color="#e85d3a" icon="⚠️" />
        <StatCard label="Avg Compliance" value={`${avgCompliance}%`} sub="across all Centre HRs" color="#10b981" icon="✅" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        {/* Today's Interviews */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#fff", fontFamily: "'Syne', sans-serif" }}>Today's Interviews</div>
            <span style={{ fontSize: "10px", color: "#e85d3a", fontWeight: "600" }}>{data.todayInterviews.length} scheduled</span>
          </div>
          {data.todayInterviews.map((iv, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px", borderRadius: "8px",
              background: "rgba(255,255,255,0.03)", marginBottom: "7px",
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#e85d3a", width: "54px", flexShrink: 0 }}>{iv.time}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#ddd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{iv.candidate}</div>
                <div style={{ fontSize: "10px", color: "#555", marginTop: "1px" }}>{iv.role}</div>
              </div>
              <span style={{
                padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: "700",
                background: iv.round === "Final Round" ? "rgba(249,115,22,0.15)" : "rgba(99,102,241,0.15)",
                color: iv.round === "Final Round" ? "#f97316" : "#818cf8", whiteSpace: "nowrap",
              }}>{iv.round}</span>
            </div>
          ))}
        </div>

        {/* Compliance snapshot */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#fff", fontFamily: "'Syne', sans-serif" }}>Compliance Snapshot</div>
            <span style={{ fontSize: "10px", color: "#e85d3a", fontWeight: "600" }}>{overdueCount} overdue</span>
          </div>
          {data.compliance.map((hr, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", color: "#bbb" }}>{hr.name}</span>
                <span style={{ fontSize: "11px", fontWeight: "700", color: hr.percent === 100 ? "#10b981" : hr.percent < 50 ? "#e85d3a" : "#f59e0b" }}>{hr.percent}%</span>
              </div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: "2px", width: `${hr.percent}%`,
                  background: hr.percent === 100 ? "#10b981" : hr.percent < 50 ? "#e85d3a" : "#f59e0b",
                  transition: "width 1s ease",
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline */}
      <div style={S.card}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "#fff", fontFamily: "'Syne', sans-serif", marginBottom: "16px" }}>
          Hiring Pipeline — Positions by Step
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {STEP_LABELS.slice(1).map((step, i) => {
            const count = data.openPositions.filter(p => p.step === i + 1).length;
            return (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{
                  background: count > 0 ? "rgba(232,93,58,0.12)" : "rgba(255,255,255,0.02)",
                  border: count > 0 ? "1px solid rgba(232,93,58,0.3)" : "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "10px", padding: "12px 4px", transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: count > 0 ? "#e85d3a" : "#2a2a3a", fontFamily: "'Syne', sans-serif" }}>{count}</div>
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
      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {["all", "new", "screening", "interview", "final", "offer"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer",
            fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em",
            background: filter === f ? "#e85d3a" : "rgba(255,255,255,0.04)",
            color: filter === f ? "white" : "#666",
            transition: "all 0.15s",
          }}>{f}</button>
        ))}
      </div>

      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
              {["Role", "Centre", "HR Owner", "Step Progress", "Days Open", "Status", "Priority"].map(h => (
                <th key={h} style={{
                  padding: "11px 14px", textAlign: "left",
                  fontSize: "9px", color: "#444", fontWeight: "600",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  fontFamily: "'Syne', sans-serif",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((pos) => (
              <tr key={pos.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "13px 14px", fontSize: "12px", fontWeight: "600", color: "#ddd" }}>{pos.role}</td>
                <td style={{ padding: "13px 14px", fontSize: "11px", color: "#666" }}>{pos.centre}</td>
                <td style={{ padding: "13px 14px", fontSize: "11px", color: "#666" }}>{pos.hr}</td>
                <td style={{ padding: "13px 14px", minWidth: "140px" }}><StepBar step={pos.step} /></td>
                <td style={{ padding: "13px 14px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", fontFamily: "'Syne', sans-serif",
                    color: pos.daysOpen > 14 ? "#e85d3a" : pos.daysOpen > 7 ? "#f59e0b" : "#10b981" }}>
                    {pos.daysOpen}d
                  </span>
                </td>
                <td style={{ padding: "13px 14px" }}><Badge status={pos.status} /></td>
                <td style={{ padding: "13px 14px" }}>
                  <span style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em",
                    color: pos.priority === "high" ? "#e85d3a" : pos.priority === "medium" ? "#f59e0b" : "#555" }}>
                    {pos.priority}
                  </span>
                </td>
              </tr>
            ))}
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
        <div key={i} style={{
          ...S.card,
          border: `1px solid ${hr.percent === 100 ? "rgba(16,185,129,0.2)" : hr.percent < 50 ? "rgba(232,93,58,0.2)" : "rgba(255,255,255,0.07)"}`,
          display: "flex", alignItems: "center", gap: "18px",
        }}>
          <div style={{
            width: "42px", height: "42px", borderRadius: "50%", flexShrink: 0,
            background: hr.percent === 100 ? "linear-gradient(135deg, #10b981, #059669)" : hr.percent < 50 ? "linear-gradient(135deg, #e85d3a, #dc2626)" : "linear-gradient(135deg, #f59e0b, #d97706)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "15px", fontWeight: "700", color: "white", fontFamily: "'Syne', sans-serif",
            boxShadow: `0 3px 10px ${hr.percent === 100 ? "rgba(16,185,129,0.25)" : hr.percent < 50 ? "rgba(232,93,58,0.25)" : "rgba(245,158,11,0.25)"}`,
          }}>{hr.name.charAt(0)}</div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#ddd" }}>{hr.name}</div>
                <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>{hr.centre} · Last updated: {hr.lastUpdated}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "22px", fontWeight: "800", fontFamily: "'Syne', sans-serif",
                  color: hr.percent === 100 ? "#10b981" : hr.percent < 50 ? "#e85d3a" : "#f59e0b" }}>
                  {hr.percent}%
                </div>
                <div style={{ fontSize: "10px", color: "#555" }}>{hr.compliant}/{hr.total} steps done</div>
              </div>
            </div>
            <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "3px", width: `${hr.percent}%`,
                background: hr.percent === 100 ? "#10b981" : hr.percent < 50 ? "#e85d3a" : "#f59e0b",
                transition: "width 1s ease",
              }} />
            </div>
            {hr.overdue > 0 && (
              <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "11px", color: "#e85d3a" }}>⚠ {hr.overdue} overdue update{hr.overdue > 1 ? "s" : ""}</span>
                <button onClick={() => onRemind(hr)} style={{
                  padding: "3px 11px", borderRadius: "5px", fontSize: "10px", fontWeight: "600",
                  background: "rgba(232,93,58,0.12)", border: "1px solid rgba(232,93,58,0.25)",
                  color: "#e85d3a", cursor: "pointer",
                }}>Send Reminder</button>
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
      {data.todayInterviews.map((iv, i) => (
        <div key={i} style={{ ...S.card, display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{
            textAlign: "center", padding: "12px 16px",
            background: "rgba(232,93,58,0.08)", borderRadius: "10px",
            borderBottom: "3px solid #e85d3a", flexShrink: 0,
          }}>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#e85d3a", fontFamily: "'Syne', sans-serif" }}>
              {iv.time.split(" ")[0]}
            </div>
            <div style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>{iv.time.split(" ")[1]}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff", fontFamily: "'Syne', sans-serif" }}>{iv.candidate}</div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "3px" }}>{iv.role}</div>
            <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Interviewer: {iv.interviewer}</div>
            <div style={{ marginTop: "10px", display: "flex", gap: "7px" }}>
              <span style={{
                padding: "3px 9px", borderRadius: "20px", fontSize: "10px", fontWeight: "700",
                background: iv.round === "Final Round" ? "rgba(249,115,22,0.15)" : "rgba(99,102,241,0.15)",
                color: iv.round === "Final Round" ? "#f97316" : "#818cf8",
              }}>{iv.round}</span>
              <span style={{ padding: "3px 9px", borderRadius: "20px", fontSize: "10px", background: "rgba(255,255,255,0.04)", color: "#555" }}>
                Google Meet
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button style={{
              padding: "8px 16px", borderRadius: "8px", fontSize: "11px", fontWeight: "600",
              background: "linear-gradient(135deg, #e85d3a, #f59e0b)",
              border: "none", color: "white", cursor: "pointer",
            }}>Join Meet</button>
            <button style={{
              padding: "8px 16px", borderRadius: "8px", fontSize: "11px",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
              color: "#888", cursor: "pointer",
            }}>📋 Profile</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsTab({ data, onRemind }) {
  return (
    <div style={{ display: "grid", gap: "10px" }}>
      {data.alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} onRemind={onRemind} />
      ))}
    </div>
  );
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 1000,
      background: "linear-gradient(135deg, #e85d3a, #f59e0b)",
      color: "white", padding: "12px 20px", borderRadius: "10px",
      fontSize: "13px", fontWeight: "600", boxShadow: "0 8px 24px rgba(232,93,58,0.4)",
      animation: "slideIn 0.3s ease",
    }}>📧 {message}</div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const tabs = [
    { id: "dashboard",  label: "Dashboard",      icon: "⊞", badge: 0 },
    { id: "positions",  label: "Open Positions",  icon: "◈", badge: 0 },
    { id: "compliance", label: "Compliance",      icon: "◉", badge: 0 },
    { id: "interviews", label: "Interviews",      icon: "◷", badge: MOCK_DATA.todayInterviews.length },
    { id: "alerts",     label: "Alerts",          icon: "◬", badge: MOCK_DATA.alerts.filter(a => a.type !== "success").length },
  ];

  const handleRemind = (target) => {
    setToast(`Reminder sent to ${target.name || "HR"}!`);
  };

  const today = time.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={S.app}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* Sidebar */}
      <div style={S.sidebar}>
        <Logo />
        <nav style={{ padding: "14px 10px", flex: 1 }}>
          <div style={{ fontSize: "8px", color: "#333", letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 10px 8px", fontFamily: "'Syne', sans-serif" }}>
            Navigation
          </div>
          {tabs.map(tab => (
            <NavItem key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
          ))}
        </nav>

        {/* Live clock */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#e85d3a", fontFamily: "'Syne', sans-serif" }}>
            {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div style={{ fontSize: "9px", color: "#444", marginTop: "2px" }}>
            {time.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </div>
        </div>

        {/* User */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <div style={{
              width: "30px", height: "30px", borderRadius: "50%",
              background: "linear-gradient(135deg, #e85d3a, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: "700", color: "white", fontFamily: "'Syne', sans-serif",
            }}>D</div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#ccc" }}>Dinesh T.</div>
              <div style={{ fontSize: "9px", color: "#444" }}>TA Manager</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={S.main}>
        {/* Header */}
        <div style={{
          padding: "18px 28px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(10,10,15,0.9)", backdropFilter: "blur(12px)",
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#fff", fontFamily: "'Syne', sans-serif" }}>
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
            <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>{today}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setToast("Daily reminders sent to all Centre HRs!")}
              style={{
                padding: "7px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: "500",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#777", cursor: "pointer",
              }}>📧 Send All Reminders</button>
            <button style={{
              padding: "7px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: "600",
              background: "linear-gradient(135deg, #e85d3a, #f59e0b)",
              border: "none", color: "white", cursor: "pointer",
              boxShadow: "0 3px 10px rgba(232,93,58,0.3)",
            }}>+ New Position</button>
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: "24px 28px" }}>
          {activeTab === "dashboard"  && <DashboardTab  data={MOCK_DATA} />}
          {activeTab === "positions"  && <PositionsTab  data={MOCK_DATA} />}
          {activeTab === "compliance" && <ComplianceTab data={MOCK_DATA} onRemind={handleRemind} />}
          {activeTab === "interviews" && <InterviewsTab data={MOCK_DATA} />}
          {activeTab === "alerts"     && <AlertsTab     data={MOCK_DATA} onRemind={handleRemind} />}
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

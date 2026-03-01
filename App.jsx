import { useState, useEffect, useMemo } from "react";

// ── SUPABASE CONFIG ──────────────────────────────────────────
const SUPABASE_URL = "https://btqcxzjrdpiyyqcyrimk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cWN4empyZHBpeXlxY3lyaW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODQ2MDIsImV4cCI6MjA4Nzg2MDYwMn0.PGy-UjyjT0pczlmac9QivO-j_MUt4hbZqkClypY1868";

const db = {
  async get(table, order = "created_at") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?order=${order}.desc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    return res.json();
  },
  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async update(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async delete(table, id) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
  }
};

// ── STYLES ──────────────────────────────────────────────────
const S = {
  inp: { background: "#1a2030", border: "1px solid #2d3550", borderRadius: 8, color: "#f1f5f9", padding: "9px 13px", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" },
  lbl: { color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 5 },
  th: { padding: "10px 16px", color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textAlign: "left", textTransform: "uppercase", background: "#0f1420", whiteSpace: "nowrap" },
  td: { padding: "12px 16px", fontSize: 13, borderTop: "1px solid #1e2436", verticalAlign: "middle" },
};

const outcomeColor = {
  "Converted": "#22c55e", "Very Interested": "#3b82f6", "Interested": "#a855f7",
  "Callback Requested": "#f59e0b", "Not Interested": "#475569", "No Answer": "#64748b", "Busy": "#f97316",
};

const Badge = ({ label, color }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>
);

const Avatar = ({ name, size = 32 }) => (
  <div style={{ background: "#252b3b", borderRadius: "50%", width: size, height: size, minWidth: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 800, color: "#e8a020" }}>
    {name?.[0] || "?"}
  </div>
);

function Spinner() {
  return <div style={{ display: "flex", justifyContent: "center", padding: 60, color: "#64748b" }}>Loading...</div>;
}

function StatCard({ label, value, accent = "#e8a020", sub }) {
  return (
    <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 120 }}>
      <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ color: accent, fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: "#475569", fontSize: 11, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function Modal({ title, onClose, children, width = 500 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 16, padding: 28, width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontWeight: 900, fontSize: 17 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function CRM() {
  const [user, setUser] = useState(null); // The logged-in agent/admin
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState("");
  
  const [tab, setTab] = useState("dashboard");
  const [contacts, setContacts] = useState([]);
  const [calls, setCalls] = useState([]);
  const [agents, setAgents] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [contactForm, setContactForm] = useState({ name: "", phone: "", company: "", city: "", category: "Business", dnc: false, notes: "" });
  const [callForm, setCallForm] = useState({ contact_name: "", agent_name: "", promo_name: "", duration_minutes: "", outcome: "Interested", interest_level: "Medium", callback_date: "", notes: "" });

  // 1. Initial Load for Login (Fetch Agents to check PIN)
  useEffect(() => {
    async function fetchAgents() {
      const a = await db.get("agents", "name");
      setAgents(Array.isArray(a) ? a : []);
      setLoading(false);
    }
    fetchAgents();
  }, []);

  function handleLogin(e) {
    e.preventDefault();
    const foundUser = agents.find(a => a.pin === pinInput);
    if (foundUser) {
      setUser(foundUser);
      setCallForm(prev => ({ ...prev, agent_name: foundUser.name })); // Preset agent name
      loadData(); // Load the rest of the CRM data
    } else {
      setLoginError("Invalid PIN code.");
      setPinInput("");
    }
  }

  // 2. Load CRM Data after Login
  async function loadData() {
    setLoading(true);
    const [c, cl, p] = await Promise.all([
      db.get("contacts", "created_at"),
      db.get("call_logs", "created_at"),
      db.get("promotions", "created_at"),
    ]);
    setContacts(Array.isArray(c) ? c : []);
    setCalls(Array.isArray(cl) ? cl : []);
    setPromos(Array.isArray(p) ? p : []);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── FILTER DATA FOR DASHBOARD BASED ON ROLE ──
  // Admins see all calls in stats. Agents see ONLY their own calls in stats.
  const dashboardCalls = user?.role === "admin" ? calls : calls.filter(c => c.agent_name === user?.name);
  const conversions = dashboardCalls.filter(c => c.outcome === "Converted").length;
  const convRate = dashboardCalls.length ? Math.round((conversions / dashboardCalls.length) * 100) : 0;
  
  // Callbacks: agents see their own callbacks, admins see all
  const allPendingCallbacks = calls.filter(c => c.callback_date && !c.callback_done);
  const pendingCallbacks = user?.role === "admin" ? allPendingCallbacks : allPendingCallbacks.filter(c => c.agent_name === user?.name);
  
  const activePromos = promos.filter(p => p.status === "Active");

  const agentStats = agents.map(a => ({
    ...a,
    total: calls.filter(c => c.agent_name === a.name).length,
    converted: calls.filter(c => c.agent_name === a.name && c.outcome === "Converted").length,
  })).sort((a, b) => b.converted - a.converted);

  const outcomeCounts = Object.keys(outcomeColor).map(o => ({
    name: o, count: dashboardCalls.filter(c => c.outcome === o).length
  })).filter(o => o.count > 0);

  // ── FILTERED LISTS ──
  const filteredContacts = useMemo(() =>
    contacts.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    ), [contacts, search]);

  // ALL calls are shown in the Call Log tab (read-only for team visibility)
  const filteredCalls = useMemo(() =>
    calls.filter(c =>
      c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.agent_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.promo_name?.toLowerCase().includes(search.toLowerCase())
    ), [calls, search]);

  // ── ACTIONS ──
  async function saveContact() {
    setSaving(true);
    if (selected) {
      await db.update("contacts", selected.id, contactForm);
      showToast("Contact updated ✓");
    } else {
      await db.insert("contacts", contactForm);
      showToast("Contact added ✓");
    }
    setSaving(false);
    setModal(null);
    setSelected(null);
    loadData();
  }

  async function saveCall() {
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);
    
    // Ensure agent_name is locked to logged-in user if they are an agent
    const finalCallData = { 
        ...callForm, 
        agent_name: user.role === "admin" ? callForm.agent_name : user.name,
        call_date: today, 
        call_time: now, 
        callback_done: false 
    };

    await db.insert("call_logs", finalCallData);
    showToast("Call logged ✓");
    setSaving(false);
    setModal(null);
    setCallForm({ contact_name: "", agent_name: user.name, promo_name: "", duration_minutes: "", outcome: "Interested", interest_level: "Medium", callback_date: "", notes: "" });
    loadData();
  }

  async function markCallbackDone(id) {
    await db.update("call_logs", id, { callback_done: true });
    showToast("Callback marked done ✓");
    loadData();
  }

  async function deleteContact(id) {
    if (!confirm("Delete this contact?")) return;
    await db.delete("contacts", id);
    showToast("Contact deleted", "error");
    loadData();
  }

  function openEditContact(c) {
    setSelected(c);
    setContactForm({ name: c.name, phone: c.phone || "", company: c.company || "", city: c.city || "", category: c.category || "Business", dnc: c.dnc || false, notes: c.notes || "" });
    setModal("add_contact");
  }

  // ── LOGIN SCREEN ──
  if (!user) {
    return (
      <div style={{ background: "#0f1420", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
        <div style={{ background: "#1e2436", border: "1px solid #2d3550", padding: 40, borderRadius: 16, width: 340, textAlign: "center" }}>
          <div style={{ background: "#e8a020", borderRadius: 8, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>📞</div>
          <h2 style={{ color: "#f1f5f9", margin: "0 0 24px 0" }}>PromoCRM Login</h2>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              placeholder="Enter your PIN" 
              value={pinInput} 
              onChange={e => setPinInput(e.target.value)} 
              style={{ ...S.inp, textAlign: "center", fontSize: 24, letterSpacing: 4, padding: "12px", marginBottom: 16 }} 
              autoFocus
            />
            {loginError && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{loginError}</div>}
            <button type="submit" style={{ background: "#e8a020", color: "#000", border: "none", borderRadius: 8, padding: "12px", width: "100%", fontWeight: 900, cursor: "pointer", fontSize: 15 }}>
              Enter System
            </button>
          </form>
        </div>
      </div>
    );
  }

  const TABS = [
    { key: "dashboard", icon: "📊", label: "My Dashboard" },
    { key: "contacts", icon: "📋", label: "Contacts" },
    { key: "calls", icon: "📞", label: "Team Call Log" },
    { key: "callbacks", icon: "🔔", label: `Callbacks${pendingCallbacks.length > 0 ? ` (${pendingCallbacks.length})` : ""}` },
    { key: "promos", icon: "🎯", label: "Promotions" },
  ];

  return (
    <div style={{ background: "#0f1420", minHeight: "100vh", color: "#f1f5f9", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, background: toast.type === "error" ? "#7f1d1d" : "#14532d", border: `1px solid ${toast.type === "error" ? "#ef444455" : "#22c55e55"}`, color: "#f1f5f9", borderRadius: 10, padding: "12px 20px", fontWeight: 700, fontSize: 13, boxShadow: "0 8px 32px #00000066" }}>
          {toast.msg}
        </div>
      )}

      {/* TOP NAV */}
      <div style={{ background: "#0a0f1a", borderBottom: "1px solid #1e2436", padding: "0 24px", display: "flex", alignItems: "center", gap: 0, height: 54, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 28 }}>
          <div style={{ background: "#e8a020", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📞</div>
          <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 0.3, color: "#f8fafc" }}>PromoCRM</span>
        </div>
        <div style={{ display: "flex", gap: 2, flex: 1 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }} style={{
              background: "none", border: "none",
              color: tab === t.key ? "#e8a020" : "#475569",
              borderBottom: tab === t.key ? "2px solid #e8a020" : "2px solid transparent",
              padding: "0 14px", height: 54, cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap"
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 13, fontWeight: 700 }}>
            <Avatar name={user.name} size={28} />
            {user.name} ({user.role})
          </div>
          <button onClick={() => { setSelected(null); setContactForm({ name: "", phone: "", company: "", city: "", category: "Business", dnc: false, notes: "" }); setModal("add_contact"); }}
            style={{ background: "#1e2436", color: "#f1f5f9", border: "1px solid #2d3550", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + Contact
          </button>
          <button onClick={() => setModal("log_call")}
            style={{ background: "#e8a020", color: "#000", border: "none", borderRadius: 8, padding: "7px 18px", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
            + Log Call
          </button>
          <button onClick={() => { setUser(null); setPinInput(""); }} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 1280, margin: "0 auto" }}>

        {/* SEARCH BAR */}
        {tab !== "dashboard" && tab !== "promos" && (
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search..." style={{ ...S.inp, maxWidth: 360, marginBottom: 20, padding: "10px 16px" }} />
        )}

        {loading ? <Spinner /> : <>

          {/* ════ DASHBOARD ════ */}
          {tab === "dashboard" && (
            <div>
              <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
                {user.role === "admin" ? "COMPANY OVERVIEW" : `YOUR PERFORMANCE - ${user.name.toUpperCase()}`}
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
                <StatCard label="Contacts" value={contacts.length} />
                <StatCard label={user.role === "admin" ? "Total Calls" : "My Calls"} value={dashboardCalls.length} accent="#3b82f6" />
                <StatCard label="Conversions" value={conversions} accent="#22c55e" />
                <StatCard label="Conv. Rate" value={convRate + "%"} accent="#a855f7" />
                <StatCard label="My Pending Callbacks" value={pendingCallbacks.length} accent="#f59e0b" />
                <StatCard label="Active Promos" value={activePromos.length} accent="#e8a020" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                {/* Outcomes chart */}
                <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 14, padding: 20 }}>
                  <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>
                     {user.role === "admin" ? "COMPANY CALL OUTCOMES" : "MY CALL OUTCOMES"}
                  </div>
                  {outcomeCounts.length === 0 && <div style={{ color: "#475569", fontSize: 13 }}>No calls logged yet.</div>}
                  {outcomeCounts.map(o => (
                    <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 130, color: "#cbd5e1", fontSize: 12, flexShrink: 0 }}>{o.name}</div>
                      <div style={{ flex: 1, background: "#0f1420", borderRadius: 4, height: 8 }}>
                        <div style={{ width: `${(o.count / dashboardCalls.length) * 100}%`, background: outcomeColor[o.name], height: 8, borderRadius: 4 }} />
                      </div>
                      <div style={{ color: "#64748b", fontSize: 12, width: 20, textAlign: "right" }}>{o.count}</div>
                    </div>
                  ))}
                </div>

                {/* Agent leaderboard - Visible to everyone, builds healthy competition */}
                <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 14, padding: 20 }}>
                  <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>TEAM LEADERBOARD</div>
                  {agentStats.map((a, i) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ color: i === 0 ? "#e8a020" : "#334155", fontWeight: 900, fontSize: 15, width: 22 }}>#{i + 1}</div>
                      <Avatar name={a.name} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: a.name === user.name ? "#e8a020" : "#f1f5f9" }}>
                          {a.name} {a.name === user.name && "(You)"}
                        </div>
                        <div style={{ color: "#475569", fontSize: 11 }}>{a.total} calls logged</div>
                      </div>
                      <Badge label={`${a.converted} converted`} color="#22c55e" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending callbacks alert */}
              {pendingCallbacks.length > 0 && (
                <div style={{ background: "#1c1400", border: "1px solid #f59e0b33", borderRadius: 14, padding: 20 }}>
                  <div style={{ color: "#f59e0b", fontWeight: 800, fontSize: 14, marginBottom: 14 }}>🔔 {pendingCallbacks.length} Pending Callback{pendingCallbacks.length > 1 ? "s" : ""}</div>
                  {pendingCallbacks.slice(0, 5).map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", borderTop: "1px solid #2d1f00", fontSize: 13 }}>
                      <span style={{ color: "#f59e0b", fontWeight: 700, minWidth: 90 }}>{c.callback_date}</span>
                      <span style={{ fontWeight: 600 }}>{c.contact_name}</span>
                      <span style={{ color: "#475569" }}>→ {c.agent_name}</span>
                      <span style={{ color: "#334155", flex: 1 }}>{c.promo_name}</span>
                      <button onClick={() => markCallbackDone(c.id)}
                        style={{ background: "#14532d", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 6, padding: "4px 14px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                        ✓ Done
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ CONTACTS ════ */}
          {tab === "contacts" && (
            <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Contact", "Phone", "Company", "City", "Type", "Status", "Calls", "Notes", ""].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.length === 0 && (
                    <tr><td colSpan={9} style={{ ...S.td, color: "#475569", textAlign: "center", padding: 40 }}>No contacts found.</td></tr>
                  )}
                  {filteredContacts.map(c => {
                    const callCount = calls.filter(x => x.contact_name === c.name).length;
                    return (
                      <tr key={c.id} style={{ background: "transparent" }}>
                        <td style={S.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar name={c.name} />
                            <span style={{ fontWeight: 700, color: c.dnc ? "#475569" : "#f1f5f9" }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={{ ...S.td, color: "#64748b" }}>{c.phone}</td>
                        <td style={S.td}>{c.company}</td>
                        <td style={{ ...S.td, color: "#94a3b8" }}>{c.city}</td>
                        <td style={S.td}><Badge label={c.category} color={c.category === "Business" ? "#3b82f6" : "#a855f7"} /></td>
                        <td style={S.td}>{c.dnc ? <Badge label="DNC" color="#ef4444" /> : <Badge label="Active" color="#22c55e" />}</td>
                        <td style={{ ...S.td, color: "#e8a020", fontWeight: 700, textAlign: "center" }}>{callCount}</td>
                        <td style={{ ...S.td, color: "#475569", maxWidth: 180 }}>{c.notes}</td>
                        <td style={S.td}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => openEditContact(c)} style={{ background: "#252b3b", border: "none", color: "#94a3b8", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Edit</button>
                            <button onClick={() => deleteContact(c.id)} style={{ background: "#2d0f0f", border: "none", color: "#ef4444", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Del</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ════ CALL LOG ════ */}
          {tab === "calls" && (
            <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Contact", "Date", "Agent", "Promotion", "Mins", "Outcome", "Interest", "Callback", "Notes"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.length === 0 && (
                    <tr><td colSpan={9} style={{ ...S.td, color: "#475569", textAlign: "center", padding: 40 }}>No calls logged yet.</td></tr>
                  )}
                  {filteredCalls.map(c => (
                    <tr key={c.id}>
                      <td style={{ ...S.td, fontWeight: 700 }}>{c.contact_name}</td>
                      <td style={{ ...S.td, color: "#64748b", whiteSpace: "nowrap" }}>{c.call_date} {c.call_time?.slice(0, 5)}</td>
                      <td style={S.td}><Badge label={c.agent_name} color={c.agent_name === user.name ? "#e8a020" : "#475569"} /></td>
                      <td style={{ ...S.td, maxWidth: 180 }}>{c.promo_name}</td>
                      <td style={{ ...S.td, color: "#64748b", textAlign: "center" }}>{c.duration_minutes}m</td>
                      <td style={S.td}><Badge label={c.outcome} color={outcomeColor[c.outcome] || "#64748b"} /></td>
                      <td style={S.td}><Badge label={c.interest_level} color={c.interest_level === "High" ? "#22c55e" : c.interest_level === "Medium" ? "#f59e0b" : "#64748b"} /></td>
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                        {c.callback_date
                          ? <span style={{ color: c.callback_done ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>{c.callback_date} {c.callback_done ? "✓" : "⏳"}</span>
                          : <span style={{ color: "#2d3550" }}>—</span>}
                      </td>
                      <td style={{ ...S.td, color: "#475569", maxWidth: 200 }}>{c.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ════ CALLBACKS ════ */}
          {tab === "callbacks" && (
            <div>
              {pendingCallbacks.length === 0 ? (
                <div style={{ background: "#1e2436", borderRadius: 14, padding: 60, textAlign: "center", color: "#475569", border: "1px solid #2d3550" }}>
                  🎉 All caught up — no pending callbacks!
                </div>
              ) : pendingCallbacks.map(c => (
                <div key={c.id} style={{ background: "#1e2436", border: "1px solid #f59e0b33", borderRadius: 12, padding: "16px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ background: "#f59e0b22", borderRadius: 10, padding: "10px 14px", textAlign: "center", minWidth: 60 }}>
                    <div style={{ color: "#f59e0b", fontWeight: 900, fontSize: 20, lineHeight: 1 }}>{c.callback_date?.slice(8)}</div>
                    <div style={{ color: "#64748b", fontSize: 10 }}>{c.callback_date?.slice(0, 7)}</div>
                  </div>
                  <Avatar name={c.contact_name} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{c.contact_name}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
                      Assigned to <span style={{ color: "#e8a020", fontWeight: 700 }}>{c.agent_name}</span> · {c.promo_name}
                    </div>
                    {c.notes && <div style={{ color: "#475569", fontSize: 12, marginTop: 4, fontStyle: "italic" }}>"{c.notes}"</div>}
                  </div>
                  <button onClick={() => markCallbackDone(c.id)}
                    style={{ background: "#14532d", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 8, padding: "8px 20px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>
                    ✓ Mark Done
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ════ PROMOTIONS ════ */}
          {tab === "promos" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {promos.map(p => {
                const pitched = calls.filter(c => c.promo_name === p.name).length;
                const converted = calls.filter(c => c.promo_name === p.name && c.outcome === "Converted").length;
                return (
                  <div key={p.id} style={{ background: "#1e2436", border: `1px solid ${p.status === "Active" ? "#22c55e33" : "#2d3550"}`, borderRadius: 14, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, flex: 1, marginRight: 10 }}>{p.name}</div>
                      <Badge label={p.status} color={p.status === "Active" ? "#22c55e" : "#475569"} />
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12, marginBottom: 14 }}>{p.description}</div>
                    <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>
                      <span>📅 {p.start_date} → {p.end_date}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, borderTop: "1px solid #252b3b", paddingTop: 12 }}>
                      <div style={{ textAlign: "center", flex: 1 }}>
                        <div style={{ color: "#3b82f6", fontWeight: 900, fontSize: 22 }}>{pitched}</div>
                        <div style={{ color: "#475569", fontSize: 10, letterSpacing: 1 }}>PITCHED</div>
                      </div>
                      <div style={{ textAlign: "center", flex: 1 }}>
                        <div style={{ color: "#22c55e", fontWeight: 900, fontSize: 22 }}>{converted}</div>
                        <div style={{ color: "#475569", fontSize: 10, letterSpacing: 1 }}>CONVERTED</div>
                      </div>
                      <div style={{ textAlign: "center", flex: 1 }}>
                        <div style={{ color: "#e8a020", fontWeight: 900, fontSize: 22 }}>{pitched ? Math.round((converted / pitched) * 100) : 0}%</div>
                        <div style={{ color: "#475569", fontSize: 10, letterSpacing: 1 }}>RATE</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </>}
      </div>

      {/* ════ MODAL: ADD/EDIT CONTACT ════ */}
      {modal === "add_contact" && (
        <Modal title={selected ? "Edit Contact" : "+ Add Contact"} onClose={() => { setModal(null); setSelected(null); }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[["Full Name", "name"], ["Phone Number", "phone"], ["Company", "company"], ["City", "city"]].map(([label, key]) => (
              <div key={key}>
                <label style={S.lbl}>{label}</label>
                <input value={contactForm[key]} onChange={e => setContactForm({ ...contactForm, [key]: e.target.value })} style={S.inp} />
              </div>
            ))}
            <div>
              <label style={S.lbl}>Category</label>
              <select value={contactForm.category} onChange={e => setContactForm({ ...contactForm, category: e.target.value })} style={S.inp}>
                <option>Business</option><option>Individual</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 22 }}>
              <input type="checkbox" id="dnc_chk" checked={contactForm.dnc} onChange={e => setContactForm({ ...contactForm, dnc: e.target.checked })} style={{ width: 16, height: 16 }} />
              <label htmlFor="dnc_chk" style={{ color: "#ef4444", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Do Not Call (DNC)</label>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={S.lbl}>Notes</label>
            <input value={contactForm.notes} onChange={e => setContactForm({ ...contactForm, notes: e.target.value })} style={S.inp} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
            <button onClick={saveContact} disabled={saving || !contactForm.name}
              style={{ flex: 1, background: contactForm.name ? "#e8a020" : "#2d3550", color: contactForm.name ? "#000" : "#475569", border: "none", borderRadius: 8, padding: 12, fontWeight: 900, cursor: contactForm.name ? "pointer" : "not-allowed", fontSize: 14 }}>
              {saving ? "Saving..." : selected ? "Save Changes" : "Add Contact"}
            </button>
            <button onClick={() => { setModal(null); setSelected(null); }} style={{ flex: 1, background: "#252b3b", color: "#f1f5f9", border: "1px solid #2d3550", borderRadius: 8, padding: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ════ MODAL: LOG CALL ════ */}
      {modal === "log_call" && (
        <Modal title="📞 Log a Call" onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={S.lbl}>Contact Name</label>
              <input list="cnames" value={callForm.contact_name} onChange={e => setCallForm({ ...callForm, contact_name: e.target.value })} style={S.inp} placeholder="Type or select..." />
              <datalist id="cnames">{contacts.filter(c => !c.dnc).map(c => <option key={c.id} value={c.name} />)}</datalist>
            </div>
            <div>
              <label style={S.lbl}>Agent</label>
              {user.role === "admin" ? (
                <select value={callForm.agent_name} onChange={e => setCallForm({ ...callForm, agent_name: e.target.value })} style={S.inp}>
                  <option value="">Select agent...</option>
                  {agents.filter(a => a.status === "Active").map(a => <option key={a.id}>{a.name}</option>)}
                </select>
              ) : (
                <input value={user.name} disabled style={{ ...S.inp, background: "#0f1420", color: "#64748b" }} />
              )}
            </div>
            <div>
              <label style={S.lbl}>Promotion Pitched</label>
              <select value={callForm.promo_name} onChange={e => setCallForm({ ...callForm, promo_name: e.target.value })} style={S.inp}>
                <option value="">Select promo...</option>
                {promos.map(p => <option key={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={S.lbl}>Duration (minutes)</label>
              <input type="number" min="1" value={callForm.duration_minutes} onChange={e => setCallForm({ ...callForm, duration_minutes: e.target.value })} style={S.inp} />
            </div>
            <div>
              <label style={S.lbl}>Outcome</label>
              <select value={callForm.outcome} onChange={e => setCallForm({ ...callForm, outcome: e.target.value })} style={S.inp}>
                {["Interested", "Not Interested", "Very Interested", "Callback Requested", "Converted", "No Answer", "Busy"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={S.lbl}>Interest Level</label>
              <select value={callForm.interest_level} onChange={e => setCallForm({ ...callForm, interest_level: e.target.value })} style={S.inp}>
                {["High", "Medium", "Low"].map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={S.lbl}>Callback Date (leave blank if none)</label>
              <input type="date" value={callForm.callback_date} onChange={e => setCallForm({ ...callForm, callback_date: e.target.value })} style={S.inp} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={S.lbl}>Notes</label>
              <input value={callForm.notes} onChange={e => setCallForm({ ...callForm, notes: e.target.value })} style={S.inp} placeholder="What was discussed?" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
            <button onClick={saveCall} disabled={saving || !callForm.contact_name || (user.role === "admin" && !callForm.agent_name)}
              style={{ flex: 1, background: (callForm.contact_name && (user.role !== "admin" || callForm.agent_name)) ? "#e8a020" : "#2d3550", color: (callForm.contact_name && (user.role !== "admin" || callForm.agent_name)) ? "#000" : "#475569", border: "none", borderRadius: 8, padding: 12, fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
              {saving ? "Saving..." : "Save Call"}
            </button>
            <button onClick={() => setModal(null)} style={{ flex: 1, background: "#252b3b", color: "#f1f5f9", border: "1px solid #2d3550", borderRadius: 8, padding: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

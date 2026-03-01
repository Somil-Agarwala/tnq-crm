import { useState, useEffect, useMemo } from "react";

// ── SUPABASE ─────────────────────────────────────────────────
const SUPABASE_URL = "https://btqcxzjrdpiyyqcyrimk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cWN4empyZHBpeXlxY3lyaW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODQ2MDIsImV4cCI6MjA4Nzg2MDYwMn0.PGy-UjyjT0pczlmac9QivO-j_MUt4hbZqkClypY1868";

const ADMIN_PIN = "0000";

const db = {
  async get(table, order = "created_at") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?order=${order}.desc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    return res.json();
  },
  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async update(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async delete(table, id) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
  }
};

// ── STYLES ───────────────────────────────────────────────────
const S = {
  inp: { background: "#1a2030", border: "1px solid #2d3550", borderRadius: 8, color: "#f1f5f9", padding: "9px 13px", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" },
  lbl: { color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 5 },
  th: { padding: "10px 16px", color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textAlign: "left", textTransform: "uppercase", background: "#0f1420", whiteSpace: "nowrap" },
  td: { padding: "11px 16px", fontSize: 13, borderTop: "1px solid #1a2030", verticalAlign: "middle" },
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

function Toast({ msg, type }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, background: type === "error" ? "#7f1d1d" : "#14532d", border: `1px solid ${type === "error" ? "#ef444455" : "#22c55e55"}`, color: "#f1f5f9", borderRadius: 10, padding: "12px 20px", fontWeight: 700, fontSize: 13, boxShadow: "0 8px 32px #00000066" }}>
      {msg}
    </div>
  );
}

function Modal({ title, onClose, children, width = 500 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 16, padding: 28, width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontWeight: 900, fontSize: 17 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
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

// ════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ════════════════════════════════════════════════════════════
function LoginScreen({ agents, onLogin }) {
  const [selectedAgent, setSelectedAgent] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  function handleLogin() {
    setError("");
    if (isAdmin) {
      if (pin === ADMIN_PIN) { onLogin({ name: "Admin", role: "admin" }); }
      else setError("Wrong admin PIN.");
      return;
    }
    if (!selectedAgent) { setError("Please select your name."); return; }
    const agent = agents.find(a => a.name === selectedAgent);
    if (!agent) { setError("Agent not found."); return; }
    if (pin !== agent.pin) { setError("Wrong PIN. Try again."); return; }
    onLogin({ ...agent, role: "agent" });
  }

  return (
    <div style={{ background: "#0f1420", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ width: 380, padding: 40, background: "#1e2436", borderRadius: 20, border: "1px solid #2d3550", boxShadow: "0 24px 80px #00000088" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ background: "#e8a020", borderRadius: 10, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📞</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, color: "#f8fafc" }}>PromoCRM</div>
            <div style={{ color: "#475569", fontSize: 12 }}>Outreach Tracker</div>
          </div>
        </div>

        {/* Toggle admin/agent */}
        <div style={{ display: "flex", background: "#131720", borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {[["Agent", false], ["Admin", true]].map(([label, val]) => (
            <button key={label} onClick={() => { setIsAdmin(val); setError(""); setPin(""); }}
              style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: isAdmin === val ? "#e8a020" : "transparent",
                color: isAdmin === val ? "#000" : "#475569" }}>
              {label}
            </button>
          ))}
        </div>

        {!isAdmin && (
          <div style={{ marginBottom: 16 }}>
            <label style={S.lbl}>Your Name</label>
            <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} style={S.inp}>
              <option value="">Select your name...</option>
              {agents.filter(a => a.status === "Active").map(a => (
                <option key={a.id} value={a.name}>{a.name} — {a.role}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={S.lbl}>{isAdmin ? "Admin PIN" : "Your PIN"}</label>
          <input
            type="password" maxLength={6} value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter PIN"
            style={{ ...S.inp, fontSize: 22, letterSpacing: 8, textAlign: "center" }}
          />
        </div>

        {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{error}</div>}

        <button onClick={handleLogin}
          style={{ width: "100%", background: "#e8a020", color: "#000", border: "none", borderRadius: 10, padding: "13px", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>
          {isAdmin ? "Enter as Admin" : "Log In"}
        </button>

        <div style={{ marginTop: 20, color: "#334155", fontSize: 11, textAlign: "center" }}>
          Admin PIN: 0000 · Agent PINs set in Supabase agents table
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SHARED: CONTACTS TAB
// ════════════════════════════════════════════════════════════
function ContactsTab({ contacts, calls, promos, agents, onRefresh, showToast }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", company: "", city: "", category: "Business", dnc: false, notes: "" });

  const filtered = useMemo(() =>
    contacts.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    ), [contacts, search]);

  function openAdd() {
    setSelected(null);
    setForm({ name: "", phone: "", company: "", city: "", category: "Business", dnc: false, notes: "" });
    setModal("contact");
  }

  function openEdit(c) {
    setSelected(c);
    setForm({ name: c.name, phone: c.phone || "", company: c.company || "", city: c.city || "", category: c.category || "Business", dnc: c.dnc || false, notes: c.notes || "" });
    setModal("contact");
  }

  async function save() {
    if (!form.name) return;
    setSaving(true);
    if (selected) { await db.update("contacts", selected.id, form); showToast("Contact updated ✓"); }
    else { await db.insert("contacts", form); showToast("Contact added ✓"); }
    setSaving(false);
    setModal(null);
    onRefresh();
  }

  async function remove(id) {
    if (!confirm("Delete this contact?")) return;
    await db.delete("contacts", id);
    showToast("Contact deleted", "error");
    onRefresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search contacts..."
          style={{ ...S.inp, maxWidth: 320 }} />
        <button onClick={openAdd}
          style={{ background: "#e8a020", color: "#000", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>
          + Add Contact
        </button>
      </div>

      <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 14, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Contact", "Phone", "Company", "City", "Type", "Status", "Calls", "Notes", ""].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} style={{ ...S.td, color: "#475569", textAlign: "center", padding: 40 }}>No contacts found.</td></tr>}
            {filtered.map(c => {
              const callCount = calls.filter(x => x.contact_name === c.name).length;
              return (
                <tr key={c.id}>
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
                  <td style={{ ...S.td, color: "#475569", maxWidth: 160 }}>{c.notes}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(c)} style={{ background: "#252b3b", border: "none", color: "#94a3b8", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Edit</button>
                      <button onClick={() => remove(c.id)} style={{ background: "#2d0f0f", border: "none", color: "#ef4444", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Del</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal === "contact" && (
        <Modal title={selected ? "Edit Contact" : "+ Add Contact"} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[["Full Name", "name"], ["Phone", "phone"], ["Company", "company"], ["City", "city"]].map(([label, key]) => (
              <div key={key}>
                <label style={S.lbl}>{label}</label>
                <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={S.inp} />
              </div>
            ))}
            <div>
              <label style={S.lbl}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={S.inp}>
                <option>Business</option><option>Individual</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 22 }}>
              <input type="checkbox" id="dnc_c" checked={form.dnc} onChange={e => setForm({ ...form, dnc: e.target.checked })} style={{ width: 16, height: 16 }} />
              <label htmlFor="dnc_c" style={{ color: "#ef4444", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Do Not Call</label>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={S.lbl}>Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={S.inp} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
            <button onClick={save} disabled={saving || !form.name}
              style={{ flex: 1, background: form.name ? "#e8a020" : "#2d3550", color: form.name ? "#000" : "#475569", border: "none", borderRadius: 8, padding: 12, fontWeight: 900, cursor: "pointer" }}>
              {saving ? "Saving..." : selected ? "Save Changes" : "Add Contact"}
            </button>
            <button onClick={() => setModal(null)} style={{ flex: 1, background: "#252b3b", color: "#f1f5f9", border: "1px solid #2d3550", borderRadius: 8, padding: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SHARED: LOG CALL MODAL
// ════════════════════════════════════════════════════════════
function LogCallModal({ contacts, promos, agents, defaultAgent, onClose, onSaved, showToast }) {
  const [form, setForm] = useState({ contact_name: "", agent_name: defaultAgent || "", promo_name: "", duration_minutes: "", outcome: "Interested", interest_level: "Medium", callback_date: "", notes: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.contact_name || !form.agent_name) return;
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);
    await db.insert("call_logs", { ...form, call_date: today, call_time: now, callback_done: false });
    showToast("Call logged ✓");
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title="📞 Log a Call" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={S.lbl}>Contact Name</label>
          <input list="cnames" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} style={S.inp} placeholder="Type or select..." />
          <datalist id="cnames">{contacts.filter(c => !c.dnc).map(c => <option key={c.id} value={c.name} />)}</datalist>
        </div>
        <div>
          <label style={S.lbl}>Agent</label>
          {defaultAgent
            ? <input value={defaultAgent} disabled style={{ ...S.inp, opacity: 0.6 }} />
            : <select value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} style={S.inp}>
                <option value="">Select agent...</option>
                {agents.filter(a => a.status === "Active").map(a => <option key={a.id}>{a.name}</option>)}
              </select>
          }
        </div>
        <div>
          <label style={S.lbl}>Promotion Pitched</label>
          <select value={form.promo_name} onChange={e => setForm({ ...form, promo_name: e.target.value })} style={S.inp}>
            <option value="">Select promo...</option>
            {promos.map(p => <option key={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>Duration (minutes)</label>
          <input type="number" min="1" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>Outcome</label>
          <select value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })} style={S.inp}>
            {["Interested", "Not Interested", "Very Interested", "Callback Requested", "Converted", "No Answer", "Busy"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>Interest Level</label>
          <select value={form.interest_level} onChange={e => setForm({ ...form, interest_level: e.target.value })} style={S.inp}>
            {["High", "Medium", "Low"].map(i => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={S.lbl}>Callback Date (optional)</label>
          <input type="date" value={form.callback_date} onChange={e => setForm({ ...form, callback_date: e.target.value })} style={S.inp} />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={S.lbl}>Notes</label>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={S.inp} placeholder="What was discussed?" />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
        <button onClick={save} disabled={saving || !form.contact_name || !form.agent_name}
          style={{ flex: 1, background: (form.contact_name && form.agent_name) ? "#e8a020" : "#2d3550", color: (form.contact_name && form.agent_name) ? "#000" : "#475569", border: "none", borderRadius: 8, padding: 12, fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
          {saving ? "Saving..." : "Save Call"}
        </button>
        <button onClick={onClose} style={{ flex: 1, background: "#252b3b", color: "#f1f5f9", border: "1px solid #2d3550", borderRadius: 8, padding: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// AGENT PAGE
// ════════════════════════════════════════════════════════════
function AgentPage({ user, contacts, calls, agents, promos, onRefresh, onLogout, showToast }) {
  const [tab, setTab] = useState("mystats");
  const [showLogCall, setShowLogCall] = useState(false);

  const myCalls = calls.filter(c => c.agent_name === user.name);
  const myConversions = myCalls.filter(c => c.outcome === "Converted").length;
  const myPending = myCalls.filter(c => c.callback_date && !c.callback_done);
  const myRate = myCalls.length ? Math.round((myConversions / myCalls.length) * 100) : 0;

  const TABS = [
    { key: "mystats", label: "📊 My Stats" },
    { key: "contacts", label: "📋 Contacts" },
    { key: "allcalls", label: "📞 All Calls" },
    { key: "callbacks", label: `🔔 Callbacks${myPending.length > 0 ? ` (${myPending.length})` : ""}` },
  ];

  async function markDone(id) {
    await db.update("call_logs", id, { callback_done: true });
    showToast("Callback marked done ✓");
    onRefresh();
  }

  return (
    <div style={{ background: "#0f1420", minHeight: "100vh", color: "#f1f5f9", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      {/* NAV */}
      <div style={{ background: "#0a0f1a", borderBottom: "1px solid #1e2436", padding: "0 24px", display: "flex", alignItems: "center", height: 54, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 28 }}>
          <div style={{ background: "#e8a020", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📞</div>
          <span style={{ fontWeight: 900, fontSize: 15 }}>PromoCRM</span>
        </div>
        <div style={{ display: "flex", gap: 2, flex: 1 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: "none", border: "none", color: tab === t.key ? "#e8a020" : "#475569",
              borderBottom: tab === t.key ? "2px solid #e8a020" : "2px solid transparent",
              padding: "0 14px", height: 54, cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap"
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setShowLogCall(true)}
            style={{ background: "#e8a020", color: "#000", border: "none", borderRadius: 8, padding: "7px 18px", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
            + Log Call
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={user.name} size={30} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>{user.name}</span>
          </div>
          <button onClick={onLogout} style={{ background: "none", border: "1px solid #2d3550", color: "#64748b", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 1280, margin: "0 auto" }}>

        {/* MY STATS */}
        {tab === "mystats" && (
          <div>
            <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>YOUR PERFORMANCE</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard label="My Total Calls" value={myCalls.length} />
              <StatCard label="My Conversions" value={myConversions} accent="#22c55e" />
              <StatCard label="My Conv. Rate" value={myRate + "%"} accent="#a855f7" />
              <StatCard label="Pending Callbacks" value={myPending.length} accent="#f59e0b" />
            </div>

            {/* My recent calls */}
            <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>MY RECENT CALLS</div>
            <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 14, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Contact", "Date", "Promotion", "Duration", "Outcome", "Interest", "Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {myCalls.length === 0 && <tr><td colSpan={7} style={{ ...S.td, color: "#475569", textAlign: "center", padding: 40 }}>No calls logged yet. Hit "+ Log Call" to start.</td></tr>}
                  {myCalls.map(c => (
                    <tr key={c.id}>
                      <td style={{ ...S.td, fontWeight: 700 }}>{c.contact_name}</td>
                      <td style={{ ...S.td, color: "#64748b" }}>{c.call_date}</td>
                      <td style={S.td}>{c.promo_name}</td>
                      <td style={{ ...S.td, color: "#64748b", textAlign: "center" }}>{c.duration_minutes}m</td>
                      <td style={S.td}><Badge label={c.outcome} color={outcomeColor[c.outcome] || "#64748b"} /></td>
                      <td style={S.td}><Badge label={c.interest_level} color={c.interest_level === "High" ? "#22c55e" : c.interest_level === "Medium" ? "#f59e0b" : "#64748b"} /></td>
                      <td style={{ ...S.td, color: "#475569", maxWidth: 200 }}>{c.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTACTS */}
        {tab === "contacts" && (
          <ContactsTab contacts={contacts} calls={calls} promos={promos} agents={agents} onRefresh={onRefresh} showToast={showToast} />
        )}

        {/* ALL CALLS - read only */}
        {tab === "allcalls" && (
          <div>
            <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>ALL TEAM CALLS — READ ONLY</div>
            <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 14, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Contact", "Date", "Agent", "Promotion", "Mins", "Outcome", "Interest", "Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {calls.map(c => (
                    <tr key={c.id}>
                      <td style={{ ...S.td, fontWeight: 700 }}>{c.contact_name}</td>
                      <td style={{ ...S.td, color: "#64748b" }}>{c.call_date}</td>
                      <td style={S.td}><Badge label={c.agent_name} color={c.agent_name === user.name ? "#e8a020" : "#3b82f6"} /></td>
                      <td style={S.td}>{c.promo_name}</td>
                      <td style={{ ...S.td, color: "#64748b", textAlign: "center" }}>{c.duration_minutes}m</td>
                      <td style={S.td}><Badge label={c.outcome} color={outcomeColor[c.outcome] || "#64748b"} /></td>
                      <td style={S.td}><Badge label={c.interest_level} color={c.interest_level === "High" ? "#22c55e" : c.interest_level === "Medium" ? "#f59e0b" : "#64748b"} /></td>
                      <td style={{ ...S.td, color: "#475569", maxWidth: 180 }}>{c.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MY CALLBACKS */}
        {tab === "callbacks" && (
          <div>
            {myPending.length === 0
              ? <div style={{ background: "#1e2436", borderRadius: 14, padding: 60, textAlign: "center", color: "#475569", border: "1px solid #2d3550" }}>🎉 No pending callbacks!</div>
              : myPending.map(c => (
                <div key={c.id} style={{ background: "#1e2436", border: "1px solid #f59e0b33", borderRadius: 12, padding: "16px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ background: "#f59e0b22", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ color: "#f59e0b", fontWeight: 900, fontSize: 20 }}>{c.callback_date?.slice(8)}</div>
                    <div style={{ color: "#64748b", fontSize: 10 }}>{c.callback_date?.slice(0, 7)}</div>
                  </div>
                  <Avatar name={c.contact_name} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{c.contact_name}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{c.promo_name}</div>
                    {c.notes && <div style={{ color: "#475569", fontSize: 12, marginTop: 4, fontStyle: "italic" }}>"{c.notes}"</div>}
                  </div>
                  <button onClick={() => markDone(c.id)}
                    style={{ background: "#14532d", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 8, padding: "8px 20px", fontWeight: 800, cursor: "pointer" }}>
                    ✓ Done
                  </button>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {showLogCall && (
        <LogCallModal contacts={contacts} promos={promos} agents={agents} defaultAgent={user.name}
          onClose={() => setShowLogCall(false)} onSaved={onRefresh} showToast={showToast} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN PAGE
// ════════════════════════════════════════════════════════════
function AdminPage({ contacts, calls, agents, promos, onRefresh, onLogout, showToast }) {
  const [tab, setTab] = useState("dashboard");
  const [showLogCall, setShowLogCall] = useState(false);

  const conversions = calls.filter(c => c.outcome === "Converted").length;
  const convRate = calls.length ? Math.round((conversions / calls.length) * 100) : 0;
  const pendingCallbacks = calls.filter(c => c.callback_date && !c.callback_done);
  const activePromos = promos.filter(p => p.status === "Active");

  const agentStats = agents.map(a => ({
    ...a,
    total: calls.filter(c => c.agent_name === a.name).length,
    converted: calls.filter(c => c.agent_name === a.name && c.outcome === "Converted").length,
  })).sort((a, b) => b.converted - a.converted);

  const outcomeCounts = Object.keys(outcomeColor).map(o => ({
    name: o, count: calls.filter(c => c.outcome === o).length
  })).filter(o => o.count > 0);

  const TABS = [
    { key: "dashboard", label: "📊 Dashboard" },
    { key: "contacts", label: "📋 Contacts" },
    { key: "calls", label: "📞 Call Log" },
    { key: "callbacks", label: `🔔 Callbacks${pendingCallbacks.length > 0 ? ` (${pendingCallbacks.length})` : ""}` },
    { key: "promos", label: "🎯 Promotions" },
    { key: "agents", label: "👥 Agents" },
  ];

  async function markDone(id) {
    await db.update("call_logs", id, { callback_done: true });
    showToast("Callback marked done ✓");
    onRefresh();
  }

  return (
    <div style={{ background: "#0f1420", minHeight: "100vh", color: "#f1f5f9", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      {/* NAV */}
      <div style={{ background: "#0a0f1a", borderBottom: "1px solid #1e2436", padding: "0 24px", display: "flex", alignItems: "center", height: 54, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 20 }}>
          <div style={{ background: "#e8a020", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📞</div>
          <span style={{ fontWeight: 900, fontSize: 15 }}>PromoCRM</span>
          <Badge label="ADMIN" color="#e8a020" />
        </div>
        <div style={{ display: "flex", gap: 2, flex: 1, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: "none", border: "none", color: tab === t.key ? "#e8a020" : "#475569",
              borderBottom: tab === t.key ? "2px solid #e8a020" : "2px solid transparent",
              padding: "0 12px", height: 54, cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap"
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowLogCall(true)}
            style={{ background: "#e8a020", color: "#000", border: "none", borderRadius: 8, padding: "7px 18px", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
            + Log Call
          </button>
          <button onClick={onLogout} style={{ background: "none", border: "1px solid #2d3550", color: "#64748b", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 1280, margin: "0 auto" }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>OVERVIEW</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard label="Total Contacts" value={contacts.length} />
              <StatCard label="Total Calls" value={calls.length} accent="#3b82f6" />
              <StatCard label="Conversions" value={conversions} accent="#22c55e" />
              <StatCard label="Conv. Rate" value={convRate + "%"} accent="#a855f7" />
              <StatCard label="Pending Callbacks" value={pendingCallbacks.length} accent="#f59e0b" />
              <StatCard label="Active Promos" value={activePromos.length} accent="#e8a020" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 14, padding: 20 }}>
                <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>CALL OUTCOMES</div>
                {outcomeCounts.length === 0 && <div style={{ color: "#475569" }}>No calls yet.</div>}
                {outcomeCounts.map(o => (
                  <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 130, color: "#cbd5e1", fontSize: 12 }}>{o.name}</div>
                    <div style={{ flex: 1, background: "#0f1420", borderRadius: 4, height: 8 }}>
                      <div style={{ width: `${(o.count / calls.length) * 100}%`, background: outcomeColor[o.name], height: 8, borderRadius: 4 }} />
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12, width: 20, textAlign: "right" }}>{o.count}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 14, padding: 20 }}>
                <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>AGENT LEADERBOARD</div>
                {agentStats.map((a, i) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ color: i === 0 ? "#e8a020" : "#334155", fontWeight: 900, fontSize: 15, width: 22 }}>#{i + 1}</div>
                    <Avatar name={a.name} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                      <div style={{ color: "#475569", fontSize: 11 }}>{a.total} calls</div>
                    </div>
                    <Badge label={`${a.converted} converted`} color="#22c55e" />
                  </div>
                ))}
              </div>
            </div>

            {pendingCallbacks.length > 0 && (
              <div style={{ background: "#1c1400", border: "1px solid #f59e0b33", borderRadius: 14, padding: 20 }}>
                <div style={{ color: "#f59e0b", fontWeight: 800, fontSize: 14, marginBottom: 14 }}>🔔 {pendingCallbacks.length} Pending Callbacks</div>
                {pendingCallbacks.slice(0, 5).map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", borderTop: "1px solid #2d1f00", fontSize: 13 }}>
                    <span style={{ color: "#f59e0b", fontWeight: 700, minWidth: 90 }}>{c.callback_date}</span>
                    <span style={{ fontWeight: 600 }}>{c.contact_name}</span>
                    <span style={{ color: "#475569" }}>→ {c.agent_name}</span>
                    <span style={{ color: "#334155", flex: 1 }}>{c.promo_name}</span>
                    <button onClick={() => markDone(c.id)}
                      style={{ background: "#14532d", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 6, padding: "4px 14px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                      ✓ Done
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONTACTS */}
        {tab === "contacts" && (
          <ContactsTab contacts={contacts} calls={calls} promos={promos} agents={agents} onRefresh={onRefresh} showToast={showToast} />
        )}

        {/* ALL CALLS */}
        {tab === "calls" && (
          <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 14, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Contact", "Date", "Agent", "Promotion", "Mins", "Outcome", "Interest", "Callback", "Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {calls.length === 0 && <tr><td colSpan={9} style={{ ...S.td, color: "#475569", textAlign: "center", padding: 40 }}>No calls logged yet.</td></tr>}
                {calls.map(c => (
                  <tr key={c.id}>
                    <td style={{ ...S.td, fontWeight: 700 }}>{c.contact_name}</td>
                    <td style={{ ...S.td, color: "#64748b", whiteSpace: "nowrap" }}>{c.call_date} {c.call_time?.slice(0, 5)}</td>
                    <td style={S.td}><Badge label={c.agent_name} color="#e8a020" /></td>
                    <td style={S.td}>{c.promo_name}</td>
                    <td style={{ ...S.td, color: "#64748b", textAlign: "center" }}>{c.duration_minutes}m</td>
                    <td style={S.td}><Badge label={c.outcome} color={outcomeColor[c.outcome] || "#64748b"} /></td>
                    <td style={S.td}><Badge label={c.interest_level} color={c.interest_level === "High" ? "#22c55e" : c.interest_level === "Medium" ? "#f59e0b" : "#64748b"} /></td>
                    <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                      {c.callback_date ? <span style={{ color: c.callback_done ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>{c.callback_date} {c.callback_done ? "✓" : "⏳"}</span> : <span style={{ color: "#2d3550" }}>—</span>}
                    </td>
                    <td style={{ ...S.td, color: "#475569", maxWidth: 200 }}>{c.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CALLBACKS */}
        {tab === "callbacks" && (
          <div>
            {pendingCallbacks.length === 0
              ? <div style={{ background: "#1e2436", borderRadius: 14, padding: 60, textAlign: "center", color: "#475569", border: "1px solid #2d3550" }}>🎉 All caught up!</div>
              : pendingCallbacks.map(c => (
                <div key={c.id} style={{ background: "#1e2436", border: "1px solid #f59e0b33", borderRadius: 12, padding: "16px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ background: "#f59e0b22", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ color: "#f59e0b", fontWeight: 900, fontSize: 20 }}>{c.callback_date?.slice(8)}</div>
                    <div style={{ color: "#64748b", fontSize: 10 }}>{c.callback_date?.slice(0, 7)}</div>
                  </div>
                  <Avatar name={c.contact_name} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{c.contact_name}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
                      → <span style={{ color: "#e8a020", fontWeight: 700 }}>{c.agent_name}</span> · {c.promo_name}
                    </div>
                    {c.notes && <div style={{ color: "#475569", fontSize: 12, marginTop: 4, fontStyle: "italic" }}>"{c.notes}"</div>}
                  </div>
                  <button onClick={() => markDone(c.id)}
                    style={{ background: "#14532d", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 8, padding: "8px 20px", fontWeight: 800, cursor: "pointer" }}>
                    ✓ Done
                  </button>
                </div>
              ))
            }
          </div>
        )}

        {/* PROMOTIONS */}
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
                  <div style={{ color: "#475569", fontSize: 12, marginBottom: 14 }}>📅 {p.start_date} → {p.end_date}</div>
                  <div style={{ display: "flex", gap: 12, borderTop: "1px solid #252b3b", paddingTop: 12 }}>
                    {[["PITCHED", pitched, "#3b82f6"], ["CONVERTED", converted, "#22c55e"], ["RATE", pitched ? Math.round((converted / pitched) * 100) + "%" : "0%", "#e8a020"]].map(([l, v, color]) => (
                      <div key={l} style={{ textAlign: "center", flex: 1 }}>
                        <div style={{ color, fontWeight: 900, fontSize: 22 }}>{v}</div>
                        <div style={{ color: "#475569", fontSize: 10, letterSpacing: 1 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AGENTS */}
        {tab === "agents" && (
          <div style={{ background: "#1e2436", border: "1px solid #2d3550", borderRadius: 14, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Agent", "Role", "PIN", "Total Calls", "Conversions", "Rate", "Avg Duration", "Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {agentStats.map(a => {
                  const avgDur = calls.filter(c => c.agent_name === a.name && c.duration_minutes).reduce((sum, c, _, arr) => sum + c.duration_minutes / arr.length, 0);
                  const rate = a.total ? Math.round((a.converted / a.total) * 100) : 0;
                  return (
                    <tr key={a.id}>
                      <td style={S.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={a.name} />
                          <span style={{ fontWeight: 700 }}>{a.name}</span>
                        </div>
                      </td>
                      <td style={{ ...S.td, color: "#94a3b8" }}>{a.role}</td>
                      <td style={{ ...S.td, color: "#334155", fontFamily: "monospace" }}>{a.pin || "—"}</td>
                      <td style={{ ...S.td, color: "#3b82f6", fontWeight: 700, textAlign: "center" }}>{a.total}</td>
                      <td style={{ ...S.td, color: "#22c55e", fontWeight: 700, textAlign: "center" }}>{a.converted}</td>
                      <td style={{ ...S.td, color: "#a855f7", fontWeight: 700, textAlign: "center" }}>{rate}%</td>
                      <td style={{ ...S.td, color: "#64748b", textAlign: "center" }}>{avgDur ? avgDur.toFixed(1) + "m" : "—"}</td>
                      <td style={S.td}><Badge label={a.status} color={a.status === "Active" ? "#22c55e" : "#f59e0b"} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showLogCall && (
        <LogCallModal contacts={contacts} promos={promos} agents={agents} defaultAgent={null}
          onClose={() => setShowLogCall(false)} onSaved={onRefresh} showToast={showToast} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [calls, setCalls] = useState([]);
  const [agents, setAgents] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadAll() {
    setLoading(true);
    const [c, cl, a, p] = await Promise.all([
      db.get("contacts"), db.get("call_logs"), db.get("agents", "name"), db.get("promotions")
    ]);
    setContacts(Array.isArray(c) ? c : []);
    setCalls(Array.isArray(cl) ? cl : []);
    setAgents(Array.isArray(a) ? a : []);
    setPromos(Array.isArray(p) ? p : []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  if (loading) return (
    <div style={{ background: "#0f1420", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontFamily: "sans-serif", fontSize: 16 }}>
      Loading PromoCRM...
    </div>
  );

  const sharedProps = { contacts, calls, agents, promos, onRefresh: loadAll, showToast };

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {!user && <LoginScreen agents={agents} onLogin={setUser} />}
      {user?.role === "admin" && <AdminPage {...sharedProps} onLogout={() => setUser(null)} />}
      {user?.role === "agent" && <AgentPage {...sharedProps} user={user} onLogout={() => setUser(null)} />}
    </>
  );
}


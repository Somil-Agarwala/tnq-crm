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
    if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
    return res.json();
  },
  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Insert failed: ${res.statusText}`);
    return res.json();
  },
  async update(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Update failed: ${res.statusText}`);
    return res.json();
  },
  async delete(table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.statusText}`);
  }
};

// ── DESIGN TOKENS & STYLES ───────────────────────────────────
const BRAND = "#3b82f6"; // Sharp Electric Blue
const BRAND_TEXT = "#ffffff";
const BG_MAIN = "#09090b"; // Deep Zinc
const BG_CARD = "#18181b"; // Surface Zinc
const BORDER = "#27272a"; // Subtle line
const TEXT_MAIN = "#fafafa";
const TEXT_MUTED = "#a1a1aa";

const S = {
  inp: { background: BG_MAIN, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_MAIN, padding: "10px 14px", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", fontFamily: "inherit" },
  lbl: { color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 },
  th: { padding: "14px 20px", color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textAlign: "left", textTransform: "uppercase", borderBottom: `1px solid ${BORDER}`, background: BG_CARD, whiteSpace: "nowrap" },
  td: { padding: "14px 20px", fontSize: 14, borderBottom: `1px solid ${BORDER}`, verticalAlign: "middle", color: "#e4e4e7" },
};

const outcomeColor = {
  "Converted": "#22c55e", "Very Interested": "#3b82f6", "Interested": "#a855f7",
  "Callback Requested": "#f59e0b", "Not Interested": "#71717a", "No Answer": "#a1a1aa", "Busy": "#f97316",
};

const Badge = ({ label, color }) => (
  <span style={{ background: color + "1A", color: color, border: `1px solid ${color}33`, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
);

const Avatar = ({ name, size = 32 }) => (
  <div style={{ background: "#27272a", borderRadius: "50%", width: size, height: size, minWidth: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 700, color: TEXT_MAIN }}>
    {name?.[0]?.toUpperCase() || "?"}
  </div>
);

function Toast({ msg, type }) {
  return (
    <div style={{ position: "fixed", bottom: 32, right: 32, zIndex: 999, background: type === "error" ? "#7f1d1d" : "#064e3b", border: `1px solid ${type === "error" ? "#ef444455" : "#10b98155"}`, color: TEXT_MAIN, borderRadius: 8, padding: "12px 24px", fontWeight: 600, fontSize: 14, boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)" }}>
      {msg}
    </div>
  );
}

function Modal({ title, onClose, children, width = 540 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32, width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: TEXT_MAIN }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = BRAND, sub }) {
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 140, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: accent, opacity: 0.8 }} />
      <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 }}>{label}</div>
      <div style={{ color: TEXT_MAIN, fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 8 }}>{sub}</div>}
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
    <div style={{ background: BG_MAIN, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: 400, padding: 48, background: BG_CARD, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px -15px rgba(0,0,0,0.6)" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 36, justifyContent: "center" }}>
          <div style={{ background: BRAND, borderRadius: 10, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📞</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22, color: TEXT_MAIN, letterSpacing: "-0.5px" }}>Tanishq CRM</div>
            <div style={{ color: BRAND, fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>WORKSPACE</div>
          </div>
        </div>

        <div style={{ display: "flex", background: BG_MAIN, borderRadius: 10, padding: 6, marginBottom: 28, border: `1px solid ${BORDER}` }}>
          {[["Agent", false], ["Admin", true]].map(([label, val]) => (
            <button key={label} onClick={() => { setIsAdmin(val); setError(""); setPin(""); }}
              style={{ flex: 1, padding: "10px", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.2s",
                background: isAdmin === val ? BG_CARD : "transparent",
                color: isAdmin === val ? TEXT_MAIN : TEXT_MUTED,
                boxShadow: isAdmin === val ? "0 2px 4px rgba(0,0,0,0.2)" : "none" }}>
              {label}
            </button>
          ))}
        </div>

        {!isAdmin && (
          <div style={{ marginBottom: 18 }}>
            <label style={S.lbl}>Agent Profile</label>
            <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} style={S.inp}>
              <option value="">Select your name...</option>
              {agents.filter(a => a.status === "Active").map(a => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <label style={S.lbl}>{isAdmin ? "Admin PIN" : "Security PIN"}</label>
          <input
            type="password" maxLength={6} value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••"
            style={{ ...S.inp, fontSize: 24, letterSpacing: 12, textAlign: "center", padding: "14px" }}
          />
        </div>

        {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, textAlign: "center", fontWeight: 500 }}>{error}</div>}

        <button onClick={handleLogin}
          style={{ width: "100%", background: BRAND, color: BRAND_TEXT, border: "none", borderRadius: 8, padding: "14px", fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "opacity 0.2s" }}>
          {isAdmin ? "Authenticate Admin" : "Access Dashboard"}
        </button>
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
    try {
      if (selected) { 
        await db.update("contacts", selected.id, form); 
        showToast("Contact updated ✓"); 
      } else { 
        await db.insert("contacts", form); 
        showToast("Contact added ✓"); 
      }
      setModal(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      showToast("Error saving contact.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      await db.delete("contacts", id);
      showToast("Contact deleted", "error");
      onRefresh();
    } catch (err) {
      console.error(err);
      showToast("Error deleting contact.", "error");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts by name, company, or phone..."
          style={{ ...S.inp, maxWidth: 400 }} />
        <button onClick={openAdd}
          style={{ background: BRAND, color: BRAND_TEXT, border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
          + Add Contact
        </button>
      </div>

      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Contact", "Phone", "Company", "City", "Type", "Status", "Calls", "Notes", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} style={{ ...S.td, color: TEXT_MUTED, textAlign: "center", padding: 60 }}>No contacts match your search.</td></tr>}
              {filtered.map(c => {
                const callCount = calls.filter(x => x.contact_name === c.name).length;
                return (
                  <tr key={c.id} style={{ transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#1f1f22"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <td style={S.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Avatar name={c.name} />
                        <span style={{ fontWeight: 600, color: c.dnc ? TEXT_MUTED : TEXT_MAIN }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ ...S.td, color: TEXT_MUTED }}>{c.phone}</td>
                    <td style={{ ...S.td, fontWeight: 500 }}>{c.company}</td>
                    <td style={{ ...S.td, color: TEXT_MUTED }}>{c.city}</td>
                    <td style={S.td}><Badge label={c.category} color={c.category === "Business" ? "#3b82f6" : "#a855f7"} /></td>
                    <td style={S.td}>{c.dnc ? <Badge label="DNC" color="#ef4444" /> : <Badge label="Active" color="#10b981" />}</td>
                    <td style={{ ...S.td, color: TEXT_MAIN, fontWeight: 600 }}>{callCount}</td>
                    <td style={{ ...S.td, color: TEXT_MUTED, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => openEdit(c)} style={{ background: BG_MAIN, border: `1px solid ${BORDER}`, color: TEXT_MAIN, borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>Edit</button>
                        <button onClick={() => remove(c.id)} style={{ background: "#450a0a", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal === "contact" && (
        <Modal title={selected ? "Edit Contact Profile" : "Create New Contact"} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[["Full Name", "name"], ["Phone Number", "phone"], ["Company", "company"], ["City", "city"]].map(([label, key]) => (
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 28 }}>
              <input type="checkbox" id="dnc_c" checked={form.dnc} onChange={e => setForm({ ...form, dnc: e.target.checked })} style={{ width: 18, height: 18, accentColor: "#ef4444" }} />
              <label htmlFor="dnc_c" style={{ color: "#f87171", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Do Not Call (DNC)</label>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={S.lbl}>Additional Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={S.inp} placeholder="Add context..." />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <button onClick={save} disabled={saving || !form.name}
              style={{ flex: 1, background: form.name ? BRAND : BG_MAIN, color: form.name ? BRAND_TEXT : TEXT_MUTED, border: `1px solid ${form.name ? BRAND : BORDER}`, borderRadius: 8, padding: 12, fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Processing..." : selected ? "Update Contact" : "Create Contact"}
            </button>
            <button onClick={() => setModal(null)} style={{ flex: 1, background: "transparent", color: TEXT_MAIN, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
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

  // Validation logic to ensure callback date is required if "Callback Requested"
  const isCallbackReq = form.outcome === "Callback Requested";
  const canSave = form.contact_name && form.agent_name && (!isCallbackReq || form.callback_date);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 5);
    
    try {
      const payload = { 
        ...form, 
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        callback_date: form.callback_date ? form.callback_date : null,
        call_date: today, 
        call_time: now, 
        callback_done: false 
      };

      await db.insert("call_logs", payload);
      showToast("Call log successfully recorded.");
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      showToast("Error saving data. Check console.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Log Activity" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <label style={S.lbl}>Contact Person</label>
          <input list="cnames" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} style={S.inp} placeholder="Search database..." />
          <datalist id="cnames">{contacts.filter(c => !c.dnc).map(c => <option key={c.id} value={c.name} />)}</datalist>
        </div>
        <div>
          <label style={S.lbl}>Assigned Agent</label>
          {defaultAgent
            ? <input value={defaultAgent} disabled style={{ ...S.inp, opacity: 0.5, cursor: "not-allowed" }} />
            : <select value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} style={S.inp}>
                <option value="">Select agent...</option>
                {agents.filter(a => a.status === "Active").map(a => <option key={a.id}>{a.name}</option>)}
              </select>
          }
        </div>
        <div>
          <label style={S.lbl}>Campaign / Promotion</label>
          <select value={form.promo_name} onChange={e => setForm({ ...form, promo_name: e.target.value })} style={S.inp}>
            <option value="">Select campaign...</option>
            {promos.filter(p => p.status === "Active").map(p => <option key={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>Duration (Mins)</label>
          <input type="number" min="1" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} style={S.inp} placeholder="e.g. 5" />
        </div>
        <div>
          <label style={S.lbl}>Final Outcome</label>
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
          <label style={S.lbl}>
            Schedule Callback {isCallbackReq ? <span style={{ color: "#ef4444" }}>*Required</span> : <span style={{ color: TEXT_MUTED }}>(Optional)</span>}
          </label>
          <input 
            type="date" 
            value={form.callback_date} 
            onChange={e => setForm({ ...form, callback_date: e.target.value })} 
            style={{ ...S.inp, border: (isCallbackReq && !form.callback_date) ? "1px solid #ef4444" : `1px solid ${BORDER}` }} 
          />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={S.lbl}>Call Notes</label>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={S.inp} placeholder="Key takeaways..." />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
        <button onClick={save} disabled={saving || !canSave}
          style={{ flex: 1, background: canSave ? BRAND : BG_MAIN, color: canSave ? BRAND_TEXT : TEXT_MUTED, border: `1px solid ${canSave ? BRAND : BORDER}`, borderRadius: 8, padding: 12, fontWeight: 600, fontSize: 14, cursor: canSave ? "pointer" : "not-allowed" }}>
          {saving ? "Submitting..." : "Submit Log"}
        </button>
        <button onClick={onClose} style={{ flex: 1, background: "transparent", color: TEXT_MAIN, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
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
    { key: "mystats", label: "Overview" },
    { key: "contacts", label: "Directory" },
    { key: "allcalls", label: "Team Activity" },
    { key: "callbacks", label: `Tasks ${myPending.length > 0 ? `(${myPending.length})` : ""}` },
  ];

  async function markDone(id) {
    try {
      await db.update("call_logs", id, { callback_done: true });
      showToast("Task completed ✓");
      onRefresh();
    } catch (err) {
      showToast("Error updating task.", "error");
    }
  }

  return (
    <div style={{ background: BG_MAIN, minHeight: "100vh", color: TEXT_MAIN, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* NAV */}
      <div style={{ background: BG_CARD, borderBottom: `1px solid ${BORDER}`, padding: "0 32px", display: "flex", alignItems: "center", height: 64, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginRight: 40 }}>
          <div style={{ background: BRAND, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📞</div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.5px" }}>Tanishq CRM</span>
        </div>
        <div style={{ display: "flex", gap: 8, flex: 1 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: "none", border: "none", color: tab === t.key ? TEXT_MAIN : TEXT_MUTED,
              borderBottom: tab === t.key ? `2px solid ${BRAND}` : "2px solid transparent",
              padding: "0 16px", height: 64, cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "color 0.2s"
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <button onClick={() => setShowLogCall(true)}
            style={{ background: TEXT_MAIN, color: BG_MAIN, border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + Log Activity
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, borderLeft: `1px solid ${BORDER}`, paddingLeft: 24 }}>
            <Avatar name={user.name} size={32} />
            <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_MAIN }}>{user.name}</span>
            <button onClick={onLogout} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Logout</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>

        {tab === "mystats" && (
          <div>
            <div style={{ color: TEXT_MAIN, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 24 }}>Welcome back, {user.name}</div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 40 }}>
              <StatCard label="Total Calls" value={myCalls.length} />
              <StatCard label="Conversions" value={myConversions} accent="#10b981" />
              <StatCard label="Win Rate" value={myRate + "%"} accent="#8b5cf6" />
              <StatCard label="Pending Tasks" value={myPending.length} accent="#f59e0b" />
            </div>

            <div style={{ color: TEXT_MAIN, fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent Activity</div>
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Contact", "Date", "Promotion", "Duration", "Outcome", "Interest", "Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {myCalls.length === 0 && <tr><td colSpan={7} style={{ ...S.td, color: TEXT_MUTED, textAlign: "center", padding: 60 }}>No calls logged yet. Hit "+ Log Activity" to start.</td></tr>}
                  {myCalls.slice(0, 10).map(c => (
                    <tr key={c.id}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{c.contact_name}</td>
                      <td style={{ ...S.td, color: TEXT_MUTED }}>{c.call_date}</td>
                      <td style={{ ...S.td, fontWeight: 500 }}>{c.promo_name}</td>
                      <td style={{ ...S.td, color: TEXT_MUTED, textAlign: "center" }}>{c.duration_minutes}m</td>
                      <td style={S.td}><Badge label={c.outcome} color={outcomeColor[c.outcome] || TEXT_MUTED} /></td>
                      <td style={S.td}><Badge label={c.interest_level} color={c.interest_level === "High" ? "#10b981" : c.interest_level === "Medium" ? "#f59e0b" : TEXT_MUTED} /></td>
                      <td style={{ ...S.td, color: TEXT_MUTED, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "contacts" && (
          <ContactsTab contacts={contacts} calls={calls} promos={promos} agents={agents} onRefresh={onRefresh} showToast={showToast} />
        )}

        {tab === "allcalls" && (
          <div>
            <div style={{ color: TEXT_MAIN, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 24 }}>Team Activity Feed</div>
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Contact", "Date", "Agent", "Promotion", "Mins", "Outcome", "Interest", "Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {calls.map(c => (
                    <tr key={c.id}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{c.contact_name}</td>
                      <td style={{ ...S.td, color: TEXT_MUTED }}>{c.call_date}</td>
                      <td style={S.td}><Badge label={c.agent_name} color={c.agent_name === user.name ? BRAND : TEXT_MUTED} /></td>
                      <td style={{ ...S.td, fontWeight: 500 }}>{c.promo_name}</td>
                      <td style={{ ...S.td, color: TEXT_MUTED, textAlign: "center" }}>{c.duration_minutes}m</td>
                      <td style={S.td}><Badge label={c.outcome} color={outcomeColor[c.outcome] || TEXT_MUTED} /></td>
                      <td style={S.td}><Badge label={c.interest_level} color={c.interest_level === "High" ? "#10b981" : c.interest_level === "Medium" ? "#f59e0b" : TEXT_MUTED} /></td>
                      <td style={{ ...S.td, color: TEXT_MUTED, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "callbacks" && (
          <div>
            <div style={{ color: TEXT_MAIN, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 24 }}>My Scheduled Tasks</div>
            {myPending.length === 0
              ? <div style={{ background: BG_CARD, borderRadius: 12, padding: 80, textAlign: "center", color: TEXT_MUTED, border: `1px dashed ${BORDER}`, fontSize: 15 }}>🎉 Inbox zero! No pending callbacks.</div>
              : myPending.map(c => (
                <div key={c.id} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderLeft: "4px solid #f59e0b", borderRadius: 12, padding: "20px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 24 }}>
                  <div style={{ textAlign: "center", minWidth: 60 }}>
                    <div style={{ color: "#f59e0b", fontWeight: 800, fontSize: 24 }}>{c.callback_date?.slice(8)}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{new Date(c.callback_date).toLocaleString('default', { month: 'short' })}</div>
                  </div>
                  <Avatar name={c.contact_name} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: TEXT_MAIN }}>{c.contact_name}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4, fontWeight: 500 }}>Campaign: {c.promo_name}</div>
                    {c.notes && <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 8, background: BG_MAIN, padding: "8px 12px", borderRadius: 6, display: "inline-block" }}>"{c.notes}"</div>}
                  </div>
                  <button onClick={() => markDone(c.id)}
                    style={{ background: "#064e3b", color: "#10b981", border: "1px solid #047857", borderRadius: 8, padding: "10px 24px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                    ✓ Mark Done
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
  
  // States for Campaign Editing
  const [promoModal, setPromoModal] = useState(false);
  const [promoForm, setPromoForm] = useState({ name: "", description: "", status: "Active", start_date: "", end_date: "" });
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [savingPromo, setSavingPromo] = useState(false);

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
    { key: "dashboard", label: "Dashboard" },
    { key: "contacts", label: "Directory" },
    { key: "calls", label: "Call Logs" },
    { key: "callbacks", label: `Tasks ${pendingCallbacks.length > 0 ? `(${pendingCallbacks.length})` : ""}` },
    { key: "promos", label: "Campaigns" },
    { key: "agents", label: "Team" },
  ];

  async function markDone(id) {
    try {
      await db.update("call_logs", id, { callback_done: true });
      showToast("Task completed ✓");
      onRefresh();
    } catch (err) {
      showToast("Error updating task.", "error");
    }
  }

  // Admin Campaign Functions
  function openAddPromo() {
    setSelectedPromo(null);
    setPromoForm({ name: "", description: "", status: "Active", start_date: "", end_date: "" });
    setPromoModal(true);
  }

  function openEditPromo(p) {
    setSelectedPromo(p);
    setPromoForm({ name: p.name, description: p.description || "", status: p.status || "Active", start_date: p.start_date || "", end_date: p.end_date || "" });
    setPromoModal(true);
  }

  async function savePromo() {
    if (!promoForm.name) return;
    setSavingPromo(true);
    try {
      if (selectedPromo) {
        await db.update("promotions", selectedPromo.id, promoForm);
        showToast("Campaign updated ✓");
      } else {
        await db.insert("promotions", promoForm);
        showToast("Campaign created ✓");
      }
      setPromoModal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      showToast("Error saving campaign.", "error");
    } finally {
      setSavingPromo(false);
    }
  }

  return (
    <div style={{ background: BG_MAIN, minHeight: "100vh", color: TEXT_MAIN, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* NAV */}
      <div style={{ background: BG_CARD, borderBottom: `1px solid ${BORDER}`, padding: "0 32px", display: "flex", alignItems: "center", height: 64, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginRight: 32 }}>
          <div style={{ background: BRAND, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📞</div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.5px" }}>Tanishq CRM</span>
          <Badge label="ADMIN" color={BRAND} />
        </div>
        <div style={{ display: "flex", gap: 8, flex: 1, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: "none", border: "none", color: tab === t.key ? TEXT_MAIN : TEXT_MUTED,
              borderBottom: tab === t.key ? `2px solid ${BRAND}` : "2px solid transparent",
              padding: "0 16px", height: 64, cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "color 0.2s"
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button onClick={() => setShowLogCall(true)}
            style={{ background: TEXT_MAIN, color: BG_MAIN, border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + Log Activity
          </button>
          <div style={{ height: 24, width: 1, background: BORDER }}></div>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>

        {tab === "dashboard" && (
          <div>
            <div style={{ color: TEXT_MAIN, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 24 }}>Global Overview</div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 32 }}>
              <StatCard label="Total Contacts" value={contacts.length} />
              <StatCard label="Total Calls" value={calls.length} accent="#3b82f6" />
              <StatCard label="Total Conversions" value={conversions} accent="#10b981" />
              <StatCard label="Global Win Rate" value={convRate + "%"} accent="#8b5cf6" />
              <StatCard label="Pending Tasks" value={pendingCallbacks.length} accent="#f59e0b" />
              <StatCard label="Active Campaigns" value={activePromos.length} accent={BRAND} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
                <div style={{ color: TEXT_MAIN, fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Outcome Distribution</div>
                {outcomeCounts.length === 0 && <div style={{ color: TEXT_MUTED }}>No data available.</div>}
                {outcomeCounts.map(o => (
                  <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                    <div style={{ width: 140, color: TEXT_MUTED, fontSize: 13, fontWeight: 500 }}>{o.name}</div>
                    <div style={{ flex: 1, background: BG_MAIN, borderRadius: 999, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${(o.count / calls.length) * 100}%`, background: outcomeColor[o.name], height: "100%", borderRadius: 999 }} />
                    </div>
                    <div style={{ color: TEXT_MAIN, fontSize: 13, width: 30, textAlign: "right", fontWeight: 600 }}>{o.count}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
                <div style={{ color: TEXT_MAIN, fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Team Leaderboard</div>
                {agentStats.map((a, i) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                    <div style={{ color: i === 0 ? BRAND : TEXT_MUTED, fontWeight: 800, fontSize: 16, width: 24 }}>#{i + 1}</div>
                    <Avatar name={a.name} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: TEXT_MAIN }}>{a.name}</div>
                      <div style={{ color: TEXT_MUTED, fontSize: 12 }}>{a.total} calls logged</div>
                    </div>
                    <Badge label={`${a.converted} wins`} color="#10b981" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "contacts" && (
          <ContactsTab contacts={contacts} calls={calls} promos={promos} agents={agents} onRefresh={onRefresh} showToast={showToast} />
        )}

        {tab === "calls" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
               <div style={{ color: TEXT_MAIN, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>Master Call Log</div>
            </div>
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>{["Contact", "Date", "Agent", "Campaign", "Mins", "Outcome", "Interest", "Task", "Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {calls.length === 0 && <tr><td colSpan={9} style={{ ...S.td, color: TEXT_MUTED, textAlign: "center", padding: 60 }}>No calls logged in the system yet.</td></tr>}
                    {calls.map(c => (
                      <tr key={c.id} style={{ transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#1f1f22"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ ...S.td, fontWeight: 600 }}>{c.contact_name}</td>
                        <td style={{ ...S.td, color: TEXT_MUTED, whiteSpace: "nowrap" }}>{c.call_date} {c.call_time?.slice(0, 5)}</td>
                        <td style={S.td}><Badge label={c.agent_name} color={BRAND} /></td>
                        <td style={{ ...S.td, fontWeight: 500 }}>{c.promo_name}</td>
                        <td style={{ ...S.td, color: TEXT_MUTED, textAlign: "center" }}>{c.duration_minutes}m</td>
                        <td style={S.td}><Badge label={c.outcome} color={outcomeColor[c.outcome] || TEXT_MUTED} /></td>
                        <td style={S.td}><Badge label={c.interest_level} color={c.interest_level === "High" ? "#10b981" : c.interest_level === "Medium" ? "#f59e0b" : TEXT_MUTED} /></td>
                        <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                          {c.callback_date ? <span style={{ color: c.callback_done ? "#10b981" : "#f59e0b", fontWeight: 600 }}>{c.callback_date} {c.callback_done ? "✓" : "⏳"}</span> : <span style={{ color: TEXT_MUTED }}>—</span>}
                        </td>
                        <td style={{ ...S.td, color: TEXT_MUTED, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "callbacks" && (
          <div>
            <div style={{ color: TEXT_MAIN, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 24 }}>Master Task List</div>
            {pendingCallbacks.length === 0
              ? <div style={{ background: BG_CARD, borderRadius: 12, padding: 80, textAlign: "center", color: TEXT_MUTED, border: `1px dashed ${BORDER}`, fontSize: 15 }}>🎉 Inbox zero! Team is all caught up.</div>
              : pendingCallbacks.map(c => (
                <div key={c.id} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderLeft: "4px solid #f59e0b", borderRadius: 12, padding: "20px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 24 }}>
                  <div style={{ textAlign: "center", minWidth: 60 }}>
                    <div style={{ color: "#f59e0b", fontWeight: 800, fontSize: 24 }}>{c.callback_date?.slice(8)}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{new Date(c.callback_date).toLocaleString('default', { month: 'short' })}</div>
                  </div>
                  <Avatar name={c.contact_name} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: TEXT_MAIN }}>{c.contact_name}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4, fontWeight: 500 }}>
                      Assigned: <span style={{ color: BRAND, fontWeight: 600 }}>{c.agent_name}</span> &nbsp;·&nbsp; {c.promo_name}
                    </div>
                    {c.notes && <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 8, background: BG_MAIN, padding: "8px 12px", borderRadius: 6, display: "inline-block" }}>"{c.notes}"</div>}
                  </div>
                  <button onClick={() => markDone(c.id)}
                    style={{ background: "#064e3b", color: "#10b981", border: "1px solid #047857", borderRadius: 8, padding: "10px 24px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                    ✓ Mark Done
                  </button>
                </div>
              ))
            }
          </div>
        )}

        {tab === "promos" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
              <div style={{ color: TEXT_MAIN, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>Campaign Performance</div>
              <button onClick={openAddPromo} style={{ background: BRAND, color: BRAND_TEXT, border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                + New Campaign
              </button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {promos.map(p => {
                const pitched = calls.filter(c => c.promo_name === p.name).length;
                const converted = calls.filter(c => c.promo_name === p.name && c.outcome === "Converted").length;
                return (
                  <div key={p.id} style={{ background: BG_CARD, border: `1px solid ${p.status === "Active" ? "#047857" : BORDER}`, borderRadius: 12, padding: 24, position: "relative", overflow: "hidden" }}>
                    {p.status === "Active" && <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: "#10b981" }} />}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: TEXT_MAIN }}>{p.name}</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Badge label={p.status} color={p.status === "Active" ? "#10b981" : TEXT_MUTED} />
                        <button onClick={() => openEditPromo(p)} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: TEXT_MUTED, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Edit</button>
                      </div>
                    </div>
                    <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>{p.description}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 20, fontWeight: 500, background: BG_MAIN, padding: "6px 10px", borderRadius: 6, display: "inline-block" }}>
                      📅 {p.start_date} → {p.end_date}
                    </div>
                    <div style={{ display: "flex", gap: 16, borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
                      {[["PITCHED", pitched, BRAND], ["CONVERTED", converted, "#10b981"], ["WIN RATE", pitched ? Math.round((converted / pitched) * 100) + "%" : "0%", "#8b5cf6"]].map(([l, v, color]) => (
                        <div key={l} style={{ flex: 1 }}>
                          <div style={{ color, fontWeight: 800, fontSize: 24, lineHeight: 1, marginBottom: 6 }}>{v}</div>
                          <div style={{ color: TEXT_MUTED, fontSize: 10, letterSpacing: 0.5, fontWeight: 600 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "agents" && (
          <div>
             <div style={{ color: TEXT_MAIN, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 24 }}>Team Directory</div>
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>{["Agent", "Role", "Auth PIN", "Total Calls", "Conversions", "Win Rate", "Avg Duration", "Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {agentStats.map(a => {
                      const avgDur = calls.filter(c => c.agent_name === a.name && c.duration_minutes).reduce((sum, c, _, arr) => sum + c.duration_minutes / arr.length, 0);
                      const rate = a.total ? Math.round((a.converted / a.total) * 100) : 0;
                      return (
                        <tr key={a.id} style={{ transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#1f1f22"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                          <td style={S.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <Avatar name={a.name} />
                              <span style={{ fontWeight: 600, color: TEXT_MAIN }}>{a.name}</span>
                            </div>
                          </td>
                          <td style={{ ...S.td, color: TEXT_MUTED, textTransform: "capitalize" }}>{a.role}</td>
                          <td style={{ ...S.td, color: TEXT_MUTED, fontFamily: "monospace", letterSpacing: 2 }}>{a.pin || "—"}</td>
                          <td style={{ ...S.td, color: TEXT_MAIN, fontWeight: 600, textAlign: "center" }}>{a.total}</td>
                          <td style={{ ...S.td, color: "#10b981", fontWeight: 600, textAlign: "center" }}>{a.converted}</td>
                          <td style={{ ...S.td, color: "#8b5cf6", fontWeight: 600, textAlign: "center" }}>{rate}%</td>
                          <td style={{ ...S.td, color: TEXT_MUTED, textAlign: "center" }}>{avgDur ? avgDur.toFixed(1) + "m" : "—"}</td>
                          <td style={S.td}><Badge label={a.status} color={a.status === "Active" ? "#10b981" : "#f59e0b"} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {showLogCall && (
        <LogCallModal contacts={contacts} promos={promos} agents={agents} defaultAgent={null}
          onClose={() => setShowLogCall(false)} onSaved={onRefresh} showToast={showToast} />
      )}

      {/* Admin Promo/Campaign Editor Modal */}
      {promoModal && (
        <Modal title={selectedPromo ? "Edit Campaign" : "New Campaign"} onClose={() => setPromoModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={S.lbl}>Campaign Name</label>
              <input value={promoForm.name} onChange={e => setPromoForm({...promoForm, name: e.target.value})} style={S.inp} placeholder="e.g. Summer Sale 2026" />
            </div>
            <div>
              <label style={S.lbl}>Description</label>
              <input value={promoForm.description} onChange={e => setPromoForm({...promoForm, description: e.target.value})} style={S.inp} placeholder="Campaign details..." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={S.lbl}>Start Date</label>
                <input type="date" value={promoForm.start_date} onChange={e => setPromoForm({...promoForm, start_date: e.target.value})} style={S.inp} />
              </div>
              <div>
                <label style={S.lbl}>End Date</label>
                <input type="date" value={promoForm.end_date} onChange={e => setPromoForm({...promoForm, end_date: e.target.value})} style={S.inp} />
              </div>
            </div>
            <div>
              <label style={S.lbl}>Status</label>
              <select value={promoForm.status} onChange={e => setPromoForm({...promoForm, status: e.target.value})} style={S.inp}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <button onClick={savePromo} disabled={savingPromo || !promoForm.name}
              style={{ flex: 1, background: promoForm.name ? BRAND : BG_MAIN, color: promoForm.name ? BRAND_TEXT : TEXT_MUTED, border: `1px solid ${promoForm.name ? BRAND : BORDER}`, borderRadius: 8, padding: 12, fontWeight: 600, fontSize: 14, cursor: promoForm.name ? "pointer" : "not-allowed" }}>
              {savingPromo ? "Saving..." : selectedPromo ? "Update Campaign" : "Create Campaign"}
            </button>
            <button onClick={() => setPromoModal(false)} style={{ flex: 1, background: "transparent", color: TEXT_MAIN, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          </div>
        </Modal>
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

  async function loadAll(isBackgroundRefresh = false) {
    if (!isBackgroundRefresh) setLoading(true);
    
    try {
      const [c, cl, a, p] = await Promise.all([
        db.get("contacts"), db.get("call_logs"), db.get("agents", "name"), db.get("promotions")
      ]);
      setContacts(Array.isArray(c) ? c : []);
      setCalls(Array.isArray(cl) ? cl : []);
      setAgents(Array.isArray(a) ? a : []);
      setPromos(Array.isArray(p) ? p : []);
    } catch (err) {
      console.error("Failed to load data:", err);
      showToast("Network error. Could not fetch latest data.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(false); }, []);

  if (loading) return (
    <div style={{ background: BG_MAIN, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_MUTED, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 16, flexDirection: "column", gap: 16 }}>
      <style>{`
        body { margin: 0; padding: 0; background: ${BG_MAIN}; }
        * { box-sizing: border-box; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
      <div style={{ width: 40, height: 40, border: `3px solid ${BORDER}`, borderTop: `3px solid ${BRAND}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      Loading Workspace...
    </div>
  );

  const sharedProps = { contacts, calls, agents, promos, onRefresh: () => loadAll(true), showToast };

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; background: ${BG_MAIN}; }
        * { box-sizing: border-box; }
      `}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {!user && <LoginScreen agents={agents} onLogin={setUser} />}
      {user?.role === "admin" && <AdminPage {...sharedProps} onLogout={() => setUser(null)} />}
      {user?.role === "agent" && <AgentPage {...sharedProps} user={user} onLogout={() => setUser(null)} />}
    </>
  );
}

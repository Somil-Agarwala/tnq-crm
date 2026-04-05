import { useState, useEffect, useMemo, useCallback } from "react";

// ── SUPABASE ─────────────────────────────────────────────────
const SUPABASE_URL = "https://btqcxzjrdpiyyqcyrimk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cWN4empyZHBpeXlxY3lyaW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODQ2MDIsImV4cCI6MjA4Nzg2MDYwMn0.PGy-UjyjT0pczlmac9QivO-j_MUt4hbZqkClypY1868";
const ADMIN_PIN = "0000";

const db = {
  async get(table, order = "created_at") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?order=${order}.desc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(`Fetch failed`);
    return res.json();
  },
  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Insert failed`);
    return res.json();
  },
  async update(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Update failed`);
    return res.json();
  },
  async delete(table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(`Delete failed`);
  },
  async deleteWhere(table, column, value) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(`DeleteWhere failed`);
  }
};

// ── DESIGN TOKENS ─────────────────────────────────────────────
const C = {
  brand: "#3b82f6", brandText: "#ffffff", bg: "#09090b", card: "#18181b", border: "#27272a",
  text: "#fafafa", muted: "#a1a1aa", subtle: "#52525b",
  green: "#10b981", yellow: "#f59e0b", red: "#ef4444", purple: "#8b5cf6",
};

const S = {
  inp: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "10px 14px", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  lbl: { color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 },
  th: { padding: "12px 18px", color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textAlign: "left", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, background: C.card, whiteSpace: "nowrap" },
  td: { padding: "13px 18px", fontSize: 13, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", color: "#e4e4e7" },
};

const outcomeColor = {
  "Converted": C.green, "Very Interested": C.brand, "Interested": C.purple,
  "Callback Requested": C.yellow, "Not Interested": C.subtle, "No Answer": C.muted, "Busy": "#f97316", "Wrong Number": C.red,
};

// ── SHARED COMPONENTS ────────────────────────────────────────
const Badge = ({ label, color }) => <span style={{ background: color + "1A", color, border: `1px solid ${color}33`, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>;
const Avatar = ({ name, size = 32 }) => <div style={{ background: "#27272a", borderRadius: "50%", width: size, height: size, minWidth: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: C.text }}>{name?.[0]?.toUpperCase() || "?"}</div>;

function Toast({ msg, type }) {
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: type === "error" ? "#450a0a" : "#052e16", border: `1px solid ${type === "error" ? C.red + "55" : C.green + "55"}`, color: C.text, borderRadius: 10, padding: "14px 24px", fontWeight: 600, fontSize: 14, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 10 }}>
      <span>{type === "error" ? "❌" : "✅"}</span> {msg}
    </div>
  );
}

function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: "#27272a", border: "none", color: C.muted, fontSize: 16, cursor: "pointer", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = C.brand, sub }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 130, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 }}>{label}</div>
      <div style={{ color: C.text, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

function Btn({ children, onClick, color = C.brand, textColor = C.brandText, disabled, style = {} }) {
  return <button onClick={onClick} disabled={disabled} style={{ background: disabled ? C.border : color, color: disabled ? C.muted : textColor, border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 600, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "opacity 0.2s", ...style }}>{children}</button>;
}

function exportToCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map(row => keys.map(k => `"${(row[k] ?? "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
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
      if (pin === ADMIN_PIN) onLogin({ name: "Admin", role: "admin" });
      else setError("Incorrect admin PIN.");
      return;
    }
    if (!selectedAgent) { setError("Please select your name."); return; }
    const agent = agents.find(a => a.name === selectedAgent);
    if (!agent) { setError("Agent not found."); return; }
    if (String(pin) !== String(agent.pin)) { setError("Incorrect PIN."); return; }
    onLogin({ ...agent, role: "agent" });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: 400, padding: 48, background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ background: C.brand, borderRadius: 14, width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>📞</div>
          <div style={{ fontWeight: 800, fontSize: 24, color: C.text, letterSpacing: "-0.5px" }}>Tanishq CRM</div>
        </div>

        <div style={{ display: "flex", background: C.bg, borderRadius: 10, padding: 4, marginBottom: 28, border: `1px solid ${C.border}` }}>
          {[["Agent", false], ["Admin", true]].map(([label, val]) => (
            <button key={label} onClick={() => { setIsAdmin(val); setError(""); setPin(""); }}
              style={{ flex: 1, padding: "10px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: isAdmin === val ? C.card : "transparent", color: isAdmin === val ? C.text : C.muted }}>
              {label}
            </button>
          ))}
        </div>

        {!isAdmin && (
          <div style={{ marginBottom: 18 }}>
            <label style={S.lbl}>Your Name</label>
            <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} style={S.inp}>
              <option value="">Select your name...</option>
              {agents.filter(a => a.status === "Active" && a.role !== "admin").map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <label style={S.lbl}>{isAdmin ? "Admin PIN" : "Security PIN"}</label>
          <input type="password" maxLength={6} value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="• • • •" style={{ ...S.inp, fontSize: 28, letterSpacing: 14, textAlign: "center", padding: "14px" }} />
        </div>
        {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</div>}

        <button onClick={handleLogin} style={{ width: "100%", background: C.brand, color: C.brandText, border: "none", borderRadius: 10, padding: "14px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          {isAdmin ? "Access Admin Panel" : "Log In"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// LOG CALL MODAL
// ════════════════════════════════════════════════════════════
function LogCallModal({ contacts, promos, agents, defaultAgent, prefilledLead, onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    contact_name: prefilledLead?.name || "", agent_name: defaultAgent || "", promo_name: prefilledLead?.assigned_promo || "",
    duration_minutes: "", outcome: "Interested", interest_level: "Medium", callback_date: "", notes: ""
  });
  const [saving, setSaving] = useState(false);
  const needsCallback = form.outcome === "Callback Requested";
  const canSave = form.contact_name && form.agent_name && (!needsCallback || form.callback_date);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toTimeString().slice(0, 5);
      await db.insert("call_logs", {
        ...form, contact_id: prefilledLead?.id || null, duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        callback_date: form.callback_date || null, call_date: today, call_time: now, callback_done: false
      });
      if (prefilledLead) await db.update("contacts", prefilledLead.id, { lead_status: "Contacted" });
      showToast("Call logged successfully ✓"); onSaved(); onClose();
    } catch { showToast("Failed to save call.", "error"); } finally { setSaving(false); }
  }

  return (
    <Modal title="📞 Log a Call" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <label style={S.lbl}>Contact Name</label>
          {prefilledLead ? <input value={prefilledLead.name} disabled style={{ ...S.inp, opacity: 0.6 }} /> : 
            <><input list="cnames" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} style={S.inp} placeholder="Search contacts..." />
            <datalist id="cnames">{contacts.filter(c => !c.dnc).map(c => <option key={c.id} value={c.name} />)}</datalist></>}
        </div>
        <div>
          <label style={S.lbl}>Agent</label>
          {defaultAgent ? <input value={defaultAgent} disabled style={{ ...S.inp, opacity: 0.6 }} /> :
            <select value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} style={S.inp}>
              <option value="">Select agent...</option>{agents.filter(a => a.status === "Active").map(a => <option key={a.id}>{a.name}</option>)}
            </select>}
        </div>
        <div>
          <label style={S.lbl}>Promotion / Campaign</label>
          {prefilledLead?.assigned_promo ? <input value={prefilledLead.assigned_promo} disabled style={{ ...S.inp, opacity: 0.6 }} /> :
            <select value={form.promo_name} onChange={e => setForm({ ...form, promo_name: e.target.value })} style={S.inp}>
              <option value="">Select campaign...</option>{promos.filter(p => p.status === "Active").map(p => <option key={p.id}>{p.name}</option>)}
            </select>}
        </div>
        <div><label style={S.lbl}>Duration (mins)</label><input type="number" min="1" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} style={S.inp} /></div>
        <div><label style={S.lbl}>Outcome</label><select value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })} style={S.inp}>{Object.keys(outcomeColor).map(o => <option key={o}>{o}</option>)}</select></div>
        <div><label style={S.lbl}>Interest Level</label><select value={form.interest_level} onChange={e => setForm({ ...form, interest_level: e.target.value })} style={S.inp}>{["High", "Medium", "Low"].map(i => <option key={i}>{i}</option>)}</select></div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={S.lbl}>Callback Date {needsCallback ? <span style={{ color: C.red }}>* Required</span> : <span style={{ color: C.muted }}>(Optional)</span>}</label>
          <input type="date" value={form.callback_date} onChange={e => setForm({ ...form, callback_date: e.target.value })} style={{ ...S.inp, border: needsCallback && !form.callback_date ? `1px solid ${C.red}` : `1px solid ${C.border}` }} />
        </div>
        <div style={{ gridColumn: "span 2" }}><label style={S.lbl}>Call Notes</label><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={S.inp} placeholder="Key points..." /></div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <Btn onClick={save} disabled={saving || !canSave} style={{ flex: 1, padding: 12 }}>{saving ? "Saving..." : "Save Call Log"}</Btn>
        <Btn onClick={onClose} color="transparent" textColor={C.text} style={{ flex: 1, padding: 12, border: `1px solid ${C.border}` }}>Cancel</Btn>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// CONTACTS TAB (SHARED)
// ════════════════════════════════════════════════════════════
function ContactsTab({ contacts, calls, agents, promos, onRefresh, showToast, isAdmin = false }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", customer_type: "", priority: "", category: "Business", dnc: false, notes: "", assigned_agent: "", assigned_promo: "", lead_status: "Pending" });

  const filtered = useMemo(() => contacts.filter(c => (c.name || "").toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search)), [contacts, search]);

  function openAdd() { setSelected(null); setForm({ name: "", phone: "", customer_type: "", priority: "", category: "Business", dnc: false, notes: "", assigned_agent: "", assigned_promo: "", lead_status: "Pending" }); setModal("contact"); }
  function openEdit(c) { setSelected(c); setForm({ name: c.name, phone: c.phone || "", customer_type: c.customer_type || "", priority: c.priority || "", category: c.category || "Business", dnc: c.dnc || false, notes: c.notes || "", assigned_agent: c.assigned_agent || "", assigned_promo: c.assigned_promo || "", lead_status: c.lead_status || "Pending" }); setModal("contact"); }

  async function save() {
    if (!form.name) return;
    try {
      if (selected) { await db.update("contacts", selected.id, form); showToast("Updated ✓"); }
      else { await db.insert("contacts", form); showToast("Added ✓"); }
      setModal(null); onRefresh();
    } catch { showToast("Error saving.", "error"); }
  }

  async function remove(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await db.delete("contacts", id); showToast("Deleted.", "error"); onRefresh(); } catch { showToast("Error deleting.", "error"); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...S.inp, maxWidth: 300 }} />
        <div style={{ display: "flex", gap: 10 }}>
          {isAdmin && <Btn onClick={() => exportToCSV(contacts, "contacts.csv")} color="#27272a" textColor={C.text}>Export</Btn>}
          <Btn onClick={openAdd}>+ Add Contact</Btn>
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Contact", "Phone", "Cust Type", "Priority", "Status", isAdmin ? "Assigned Agent" : "Notes", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={S.td}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Avatar name={c.name} /> <span style={{ fontWeight: 600 }}>{c.name}</span></div></td>
                  <td style={S.td}>{c.phone || "—"}</td><td style={S.td}>{c.customer_type || "—"}</td><td style={S.td}>{c.priority || "—"}</td>
                  <td style={S.td}>{c.dnc ? <Badge label="DNC" color={C.red} /> : <Badge label="Active" color={C.green} />}</td>
                  <td style={S.td}>{isAdmin ? (c.assigned_agent || "—") : (c.notes || "—")}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(c)} style={{ background: "#27272a", border: "none", color: C.text, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>Edit</button>
                      <button onClick={() => remove(c.id, c.name)} style={{ background: C.red + "18", border: "none", color: C.red, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === "contact" && (
        <Modal title={selected ? "Edit Contact" : "Add Contact"} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {[["Full Name *", "name"], ["Phone", "phone"], ["Cust Type", "customer_type"], ["Priority", "priority"]].map(([lbl, k]) => (
              <div key={k}><label style={S.lbl}>{lbl}</label><input value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} style={S.inp} /></div>
            ))}
            {isAdmin && <>
              <div><label style={S.lbl}>Assigned Agent</label><select value={form.assigned_agent} onChange={e => setForm({ ...form, assigned_agent: e.target.value })} style={S.inp}><option value="">None</option>{agents.map(a => <option key={a.id}>{a.name}</option>)}</select></div>
              <div><label style={S.lbl}>Assigned Campaign</label><select value={form.assigned_promo} onChange={e => setForm({ ...form, assigned_promo: e.target.value })} style={S.inp}><option value="">None</option>{promos.map(p => <option key={p.id}>{p.name}</option>)}</select></div>
            </>}
            <div style={{ gridColumn: "span 2" }}><label style={S.lbl}>Notes</label><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={S.inp} /></div>
            <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="dnc_m" checked={form.dnc} onChange={e => setForm({ ...form, dnc: e.target.checked })} style={{ width: 16, height: 16 }} />
              <label htmlFor="dnc_m" style={{ color: C.red, fontWeight: 600 }}>Mark as Do Not Call (DNC)</label>
            </div>
          </div>
          <Btn onClick={save} disabled={!form.name} style={{ width: "100%", marginTop: 20 }}>Save</Btn>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CALLBACKS TAB (SHARED)
// ════════════════════════════════════════════════════════════
function CallbacksTab({ calls, onRefresh, showToast }) {
  const pending = calls.filter(c => c.callback_date && !c.callback_done);
  async function markDone(id) {
    try { await db.update("call_logs", id, { callback_done: true }); showToast("Completed ✓"); onRefresh(); } catch { showToast("Error", "error"); }
  }
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Pending Callbacks</div>
      {pending.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: C.muted }}>All caught up!</div> : pending.map(c => (
        <div key={c.id} style={{ background: C.card, border: `1px solid ${C.yellow}44`, borderLeft: `4px solid ${C.yellow}`, padding: 16, marginBottom: 12, borderRadius: 8, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ color: C.yellow, fontWeight: 800, fontSize: 20 }}>{c.callback_date}</div>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{c.contact_name}</div><div style={{ color: C.muted, fontSize: 13 }}>{c.promo_name}</div></div>
          <Btn onClick={() => markDone(c.id)} color="#052e16" textColor={C.green}>✓ Done</Btn>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// AGENT PAGE
// ════════════════════════════════════════════════════════════
function AgentPage({ user, contacts, calls, agents, promos, onRefresh, onLogout, showToast }) {
  const [tab, setTab] = useState("queue");
  const [logModalLead, setLogModalLead] = useState(null);
  const [showLogCall, setShowLogCall] = useState(false);
  
  // States for Queue Filtering and Sorting
  const [queueFilter, setQueueFilter] = useState("All");
  const [queueSort, setQueueSort] = useState("Default");

  const myCalls = calls.filter(c => c.agent_name === user.name);
  const myConversions = myCalls.filter(c => c.outcome === "Converted").length;
  const myPending = myCalls.filter(c => c.callback_date && !c.callback_done);
  const myRate = myCalls.length ? Math.round((myConversions / myCalls.length) * 100) : 0;
  
  const baseLeads = useMemo(() => contacts.filter(c => c.assigned_agent === user.name && c.lead_status !== "Contacted" && !c.dnc), [contacts, user.name]);

  const assignedCampaigns = useMemo(() => {
    const campaigns = baseLeads.map(c => c.assigned_promo).filter(Boolean);
    return [...new Set(campaigns)];
  }, [baseLeads]);

  const displayedLeads = useMemo(() => {
    let filtered = baseLeads;
    if (queueFilter !== "All") filtered = filtered.filter(c => c.assigned_promo === queueFilter);
    if (queueSort === "Name (A-Z)") filtered = [...filtered].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (queueSort === "Priority") filtered = [...filtered].sort((a, b) => (a.priority || "").localeCompare(b.priority || ""));
    return filtered;
  }, [baseLeads, queueFilter, queueSort]);

  const TABS = [
    { key: "queue", label: `Queue (${baseLeads.length})` },
    { key: "stats", label: "Stats" },
    { key: "callbacks", label: `Callbacks (${myPending.length})` },
    { key: "contacts", label: "Directory" }
  ];

  const outcomeCounts = Object.keys(outcomeColor).map(o => ({ name: o, count: myCalls.filter(c => c.outcome === o).length })).filter(o => o.count > 0);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "center", height: 60, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 32 }}><div style={{ background: C.brand, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📞</div><span style={{ fontWeight: 800, fontSize: 16 }}>Tanishq CRM</span></div>
        <div style={{ display: "flex", gap: 2, flex: 1 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ background: "none", border: "none", color: tab === t.key ? C.text : C.muted, borderBottom: tab === t.key ? `2px solid ${C.brand}` : "2px solid transparent", padding: "0 16px", cursor: "pointer", fontWeight: 600 }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Btn onClick={onRefresh} color="#27272a" textColor={C.text}>🔄 Refresh</Btn>
          <Btn onClick={() => setShowLogCall(true)} color={C.text} textColor={C.bg}>+ Log Call</Btn>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "32px 36px", maxWidth: 1280, margin: "0 auto" }}>
        
        {tab === "queue" && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>My Action Queue</div>
            
            {baseLeads.length > 0 && (
              <div style={{ display: "flex", gap: 16, marginBottom: 24, background: C.card, padding: 16, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ flex: 1 }}>
                  <label style={S.lbl}>Filter by Campaign</label>
                  <select value={queueFilter} onChange={e => setQueueFilter(e.target.value)} style={S.inp}>
                    <option value="All">All Campaigns ({baseLeads.length})</option>
                    {assignedCampaigns.map(camp => (
                       <option key={camp} value={camp}>{camp}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.lbl}>Sort By</label>
                  <select value={queueSort} onChange={e => setQueueSort(e.target.value)} style={S.inp}>
                    <option value="Default">Default Order</option>
                    <option value="Name (A-Z)">Name (A-Z)</option>
                    <option value="Priority">Priority</option>
                  </select>
                </div>
              </div>
            )}

            {displayedLeads.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: C.muted, background: C.card, borderRadius: 12, border: `1px dashed ${C.border}` }}>
                {baseLeads.length > 0 ? "No leads match this filter." : "Queue empty! Great job."}
              </div>
            ) : displayedLeads.map(lead => (
              <div key={lead.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.brand}`, borderRadius: 12, padding: "18px 24px", marginBottom: 14, display: "flex", alignItems: "center", gap: 20 }}>
                <Avatar name={lead.name} size={46} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>{lead.name}</div>
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 4, display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <span>📱 <span style={{ color: C.text, fontWeight: 600 }}>{lead.phone || "No phone"}</span></span>
                    {lead.customer_type && <span>🏢 {lead.customer_type}</span>}
                    {lead.priority && <span>⭐ {lead.priority}</span>}
                  </div>
                  {lead.assigned_promo && <div style={{ marginTop: 8 }}><Badge label={`Campaign: ${lead.assigned_promo}`} color={C.brand} /></div>}
                </div>
                <Btn onClick={() => setLogModalLead(lead)} color="#052e16" textColor={C.green}>📞 Dial & Log</Btn>
              </div>
            ))}
          </div>
        )}

        {tab === "stats" && <div><div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>My Stats</div><div style={{ display: "flex", gap: 16 }}><StatCard label="Total Calls" value={myCalls.length} /><StatCard label="Conversions" value={myCalls.filter(c => c.outcome === "Converted").length} accent={C.green} /></div></div>}
        {tab === "callbacks" && <CallbacksTab calls={myCalls} onRefresh={onRefresh} showToast={showToast} />}
        {tab === "contacts" && <ContactsTab contacts={contacts} calls={calls} agents={agents} promos={promos} onRefresh={onRefresh} showToast={showToast} />}
      </div>

      {showLogCall && <LogCallModal contacts={contacts} promos={promos} agents={agents} defaultAgent={user.name} onClose={() => setShowLogCall(false)} onSaved={onRefresh} showToast={showToast} />}
      {logModalLead && <LogCallModal contacts={contacts} promos={promos} agents={agents} defaultAgent={user.name} prefilledLead={logModalLead} onClose={() => setLogModalLead(null)} onSaved={onRefresh} showToast={showToast} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN PAGE (SUPERVISORY COMMAND CENTER)
// ════════════════════════════════════════════════════════════
function AdminPage({ contacts, calls, agents, promos, onRefresh, onLogout, showToast }) {
  const [tab, setTab] = useState("campaigns");
  const [showLogCall, setShowLogCall] = useState(false);

  // Promo Management
  const [promoModal, setPromoModal] = useState(null);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({ name: "", description: "", status: "Active", start_date: "", end_date: "", target_audience: "All" });
  
  // Drill Down
  const [viewPromoDetails, setViewPromoDetails] = useState(null);
  const [viewPromoAgent, setViewPromoAgent] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState([]);

  // Agent Management
  const [agentModal, setAgentModal] = useState(null);
  const [selectedAgentModal, setSelectedAgentModal] = useState(null);
  const [agentForm, setAgentForm] = useState({ name: "", role: "Agent", phone_ext: "", pin: "", status: "Active" });

  // CSV Import
  const [importModal, setImportModal] = useState(false);
  const [importAgent, setImportAgent] = useState("");
  const [importPromo, setImportPromo] = useState("");
  const [parsedCsv, setParsedCsv] = useState([]);

  const activePromos = promos.filter(p => p.status === "Active");
  const agentStats = agents.map(a => ({ ...a, total: calls.filter(c => c.agent_name === a.name).length, converted: calls.filter(c => c.agent_name === a.name && c.outcome === "Converted").length })).sort((a, b) => b.converted - a.converted);

  const TABS = [{ key: "dashboard", label: "Dashboard" }, { key: "campaigns", label: "Campaigns" }, { key: "agents", label: "Team" }, { key: "calls", label: "Call Logs" }, { key: "contacts", label: "Directory" }];

  function handleTabChange(k) { setTab(k); setViewPromoDetails(null); setViewPromoAgent(null); setSelectedLeads([]); }

  // ── Promo Actions ──
  async function savePromo() {
    if (!promoForm.name) return;
    try {
      if (selectedPromo) await db.update("promotions", selectedPromo.id, promoForm);
      else await db.insert("promotions", promoForm);
      showToast("Saved ✓"); setPromoModal(null); setSelectedPromo(null); onRefresh();
    } catch { showToast("Error", "error"); }
  }

  // CASCADING DELETE
  async function deletePromoCascade(id, name) {
    if (!window.confirm(`⚠️ CRITICAL WARNING:\n\nDeleting "${name}" will PERMANENTLY WIPE all leads, call logs, and agent statistics tied to this campaign.\n\nTo keep stats, change status to "Expired" instead.\n\nAre you sure you want to completely erase it?`)) return;
    try {
      await db.deleteWhere("call_logs", "promo_name", name); 
      await db.deleteWhere("contacts", "assigned_promo", name); 
      await db.delete("promotions", id); 
      showToast("Campaign entirely erased.", "error");
      setViewPromoDetails(null);
      onRefresh();
    } catch { showToast("Error deleting campaign.", "error"); }
  }

  // ── Agent Actions ──
  async function saveAgent() {
    if (!agentForm.name || !agentForm.pin) return;
    try {
      if (selectedAgentModal) await db.update("agents", selectedAgentModal.id, agentForm);
      else await db.insert("agents", agentForm);
      showToast("Saved ✓"); setAgentModal(null); onRefresh();
    } catch { showToast("Error", "error"); }
  }

  async function deleteAgent(id, name) {
    if (!window.confirm(`Remove ${name}?`)) return;
    try { await db.delete("agents", id); showToast("Removed", "error"); onRefresh(); } catch { showToast("Error", "error"); }
  }

  // ── Import Actions ──
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = ev.target.result.split("\n").filter(l => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const data = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const obj = {}; headers.forEach((h, i) => obj[h] = values[i] || ""); return obj;
      });
      setParsedCsv(data);
    };
    reader.readAsText(file);
  }

  async function executeImport() {
    if (!importAgent || !importPromo || !parsedCsv.length) return;
    try {
      await Promise.all(parsedCsv.map(row => db.insert("contacts", {
        name: row.name || "Unknown", phone: row.phone || "", customer_type: row.customer_type || "", priority: row.priority || "",
        category: "Business", dnc: false, assigned_agent: importAgent, assigned_promo: importPromo, lead_status: "Pending"
      })));
      showToast("Imported ✓"); setImportModal(false); setParsedCsv([]); onRefresh();
    } catch { showToast("Error", "error"); }
  }

  async function handleWipeAllPending() {
    const pendingList = contacts.filter(c => c.assigned_promo === viewPromoDetails.name && c.assigned_agent === viewPromoAgent && c.lead_status === "Pending");
    if (!window.confirm(`Wipe all ${pendingList.length} pending leads for ${viewPromoAgent}?`)) return;
    try { await Promise.all(pendingList.map(c => db.delete("contacts", c.id))); showToast("Wiped."); onRefresh(); } catch { showToast("Error", "error"); }
  }

  async function handleWipeSelected() {
    if (!window.confirm(`Delete ${selectedLeads.length} selected leads?`)) return;
    try { await Promise.all(selectedLeads.map(id => db.delete("contacts", id))); showToast("Deleted."); setSelectedLeads([]); onRefresh(); } catch { showToast("Error", "error"); }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "center", height: 60, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 28 }}><div style={{ background: C.brand, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📞</div><span style={{ fontWeight: 800, fontSize: 16 }}>Tanishq CRM</span><Badge label="ADMIN" color={C.brand} /></div>
        <div style={{ display: "flex", gap: 0, flex: 1 }}>{TABS.map(t => (<button key={t.key} onClick={() => handleTabChange(t.key)} style={{ background: "none", border: "none", color: tab === t.key ? C.text : C.muted, borderBottom: tab === t.key ? `2px solid ${C.brand}` : "2px solid transparent", padding: "0 16px", cursor: "pointer", fontWeight: 600 }}>{t.label}</button>))}</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Btn onClick={onRefresh} color="#27272a" textColor={C.text}>🔄 Refresh Data</Btn>
          <Btn onClick={() => setShowLogCall(true)} color={C.text} textColor={C.bg}>+ Log Call</Btn>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "32px 36px", maxWidth: 1280, margin: "0 auto" }}>
        
        {tab === "dashboard" && <div><div style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Dashboard</div><StatCard label="Total Calls Logged" value={calls.length} /></div>}
        
        {tab === "calls" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div style={{ fontSize: 22, fontWeight: 800 }}>Master Call Logs</div><Btn onClick={() => exportToCSV(calls, "calls.csv")} color="#27272a" textColor={C.text}>Export</Btn></div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Contact", "Date", "Agent", "Campaign", "Outcome", "Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead><tbody>{calls.map(c => <tr key={c.id}><td style={S.td}>{c.contact_name}</td><td style={S.td}>{c.call_date}</td><td style={S.td}>{c.agent_name}</td><td style={S.td}>{c.promo_name}</td><td style={S.td}>{c.outcome}</td><td style={S.td}>{c.notes}</td></tr>)}</tbody></table>
            </div>
          </div>
        )}

        {tab === "contacts" && <ContactsTab contacts={contacts} calls={calls} agents={agents} promos={promos} onRefresh={onRefresh} showToast={showToast} isAdmin={true} />}

        {/* ── CAMPAIGNS (DRILL-DOWN) ── */}
        {tab === "campaigns" && (
          <div>
            {!viewPromoDetails ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>Campaigns</div>
                  <div style={{ display: "flex", gap: 10 }}><Btn onClick={() => setImportModal(true)} color="#052e16" textColor={C.green}>📥 Import Leads</Btn><Btn onClick={() => { setSelectedPromo(null); setPromoForm({ name: "", description: "", status: "Active", start_date: "", end_date: "", target_audience: "All" }); setPromoModal("add"); }}>+ New Campaign</Btn></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  {promos.map(p => {
                    const assigned = contacts.filter(c => c.assigned_promo === p.name);
                    const contacted = assigned.filter(c => c.lead_status === "Contacted");
                    const progress = assigned.length ? Math.round((contacted.length / assigned.length) * 100) : 0;
                    return (
                      <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div><Badge label={p.status} color={p.status === "Active" ? C.green : C.muted} /></div>
                        {assigned.length > 0 && (
                          <div style={{ background: C.bg, borderRadius: 8, padding: 10, marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 6 }}><span>Progress</span><span>{contacted.length}/{assigned.length}</span></div>
                            <div style={{ background: "#27272a", height: 6, borderRadius: 99 }}><div style={{ width: `${progress}%`, height: "100%", background: C.brand, borderRadius: 99 }} /></div>
                          </div>
                        )}
                        <Btn onClick={() => setViewPromoDetails(p)} style={{ width: "100%", marginTop: 10 }} color="#27272a" textColor={C.text}>Manage Campaign ➔</Btn>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : !viewPromoAgent ? (
              <div>
                <button onClick={() => setViewPromoDetails(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "6px 12px", marginBottom: 20, cursor: "pointer" }}>← Back</button>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>{viewPromoDetails.name}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn onClick={() => { setSelectedPromo(viewPromoDetails); setPromoForm(viewPromoDetails); setPromoModal("edit"); }} color="#27272a" textColor={C.text}>Edit</Btn>
                    <Btn onClick={() => deletePromoCascade(viewPromoDetails.id, viewPromoDetails.name)} color={C.red + "22"} textColor={C.red}>Delete</Btn>
                  </div>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["Agent", "Assigned", "Contacted", "Pending", "Action"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {agents.filter(a => a.role !== "admin").map(agent => {
                        const promoLeads = contacts.filter(c => c.assigned_promo === viewPromoDetails.name && c.assigned_agent === agent.name);
                        if (promoLeads.length === 0) return null;
                        return (
                          <tr key={agent.id}>
                            <td style={S.td}>{agent.name}</td><td style={S.td}>{promoLeads.length}</td><td style={S.td}>{promoLeads.filter(c => c.lead_status === "Contacted").length}</td><td style={S.td}>{promoLeads.filter(c => c.lead_status === "Pending").length}</td>
                            <td style={S.td}><Btn onClick={() => setViewPromoAgent(agent.name)} color={C.brand + "22"} textColor={C.brand}>Clean Queue</Btn></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <button onClick={() => { setViewPromoAgent(null); setSelectedLeads([]); }} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "6px 12px", marginBottom: 20, cursor: "pointer" }}>← Back</button>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{viewPromoAgent}'s Queue ({viewPromoDetails.name})</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {selectedLeads.length > 0 && <Btn onClick={handleWipeSelected} color={C.red + "22"} textColor={C.red}>Delete Selected</Btn>}
                    <Btn onClick={handleWipeAllPending} color={C.red} textColor={C.text}>⚠️ Wipe All Pending</Btn>
                  </div>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={S.th}></th>{["Name", "Phone", "Cust Type", "Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {contacts.filter(c => c.assigned_promo === viewPromoDetails.name && c.assigned_agent === viewPromoAgent).map(lead => (
                        <tr key={lead.id}>
                          <td style={S.td}>{lead.lead_status === "Pending" && <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={e => { if (e.target.checked) setSelectedLeads([...selectedLeads, lead.id]); else setSelectedLeads(selectedLeads.filter(id => id !== lead.id)); }} />}</td>
                          <td style={S.td}>{lead.name}</td><td style={S.td}>{lead.phone}</td><td style={S.td}>{lead.customer_type}</td><td style={S.td}>{lead.lead_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AGENTS ── */}
        {tab === "agents" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}><div style={{ fontSize: 22, fontWeight: 800 }}>Team</div><Btn onClick={() => { setSelectedAgentModal(null); setAgentForm({ name: "", role: "Agent", phone_ext: "", pin: "", status: "Active" }); setAgentModal("add"); }}>+ Add Agent</Btn></div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Agent", "Role", "PIN", "Calls", "Wins", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {agentStats.map(a => (
                    <tr key={a.id}>
                      <td style={S.td}>{a.name}</td><td style={S.td}>{a.role}</td><td style={S.td}>{a.pin}</td><td style={S.td}>{a.total}</td><td style={S.td}>{a.converted}</td>
                      <td style={S.td}><Btn onClick={() => { setSelectedAgentModal(a); setAgentForm(a); setAgentModal("edit"); }} color="#27272a" textColor={C.text}>Edit</Btn> <Btn onClick={() => deleteAgent(a.id, a.name)} color={C.red + "22"} textColor={C.red} style={{ marginLeft: 8 }}>Remove</Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {promoModal && (
        <Modal title={selectedPromo ? "Edit Campaign" : "New Campaign"} onClose={() => setPromoModal(null)}>
          <div style={{ display: "grid", gap: 16 }}>
            <div><label style={S.lbl}>Name *</label><input value={promoForm.name} onChange={e => setPromoForm({ ...promoForm, name: e.target.value })} style={S.inp} /></div>
            <div><label style={S.lbl}>Description</label><input value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })} style={S.inp} /></div>
            <div><label style={S.lbl}>Status</label><select value={promoForm.status} onChange={e => setPromoForm({ ...promoForm, status: e.target.value })} style={S.inp}><option>Active</option><option>Expired</option></select></div>
            <Btn onClick={savePromo} disabled={!promoForm.name} style={{ marginTop: 10 }}>Save Campaign</Btn>
          </div>
        </Modal>
      )}

      {agentModal && (
        <Modal title={selectedAgentModal ? "Edit Agent" : "Add Agent"} onClose={() => setAgentModal(null)}>
          <div style={{ display: "grid", gap: 16 }}>
            <div><label style={S.lbl}>Name *</label><input value={agentForm.name} onChange={e => setAgentForm({ ...agentForm, name: e.target.value })} style={S.inp} /></div>
            <div><label style={S.lbl}>PIN *</label><input type="password" value={agentForm.pin} onChange={e => setAgentForm({ ...agentForm, pin: e.target.value })} style={S.inp} /></div>
            <div><label style={S.lbl}>Role</label><select value={agentForm.role} onChange={e => setAgentForm({ ...agentForm, role: e.target.value })} style={S.inp}><option>Agent</option><option>Team Lead</option></select></div>
            <Btn onClick={saveAgent} disabled={!agentForm.name || !agentForm.pin} style={{ marginTop: 10 }}>Save Agent</Btn>
          </div>
        </Modal>
      )}

      {importModal && (
        <Modal title="Import Leads" onClose={() => setImportModal(false)}>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ background: "#1c1200", color: C.yellow, padding: 12, borderRadius: 8, fontSize: 13 }}>Upload CSV with headers: <code style={{ color: "#fff" }}>name, phone, customer_type, priority</code></div>
            <div><label style={S.lbl}>Campaign</label><select value={importPromo} onChange={e => setImportPromo(e.target.value)} style={S.inp}><option value="">Select...</option>{activePromos.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
            <div><label style={S.lbl}>Agent</label><select value={importAgent} onChange={e => setImportAgent(e.target.value)} style={S.inp}><option value="">Select...</option>{agents.filter(a => a.status === "Active" && a.role !== "admin").map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
            <div><label style={S.lbl}>File</label><input type="file" accept=".csv" onChange={handleFileUpload} style={{ ...S.inp, padding: 8 }} /></div>
            {parsedCsv.length > 0 && <div style={{ color: C.green }}>✓ {parsedCsv.length} leads ready</div>}
            <Btn onClick={executeImport} disabled={importing || !parsedCsv.length || !importAgent || !importPromo} style={{ marginTop: 10 }}>Import</Btn>
          </div>
        </Modal>
      )}

      {showLogCall && <LogCallModal contacts={contacts} promos={promos} agents={agents} defaultAgent={null} onClose={() => setShowLogCall(false)} onSaved={onRefresh} showToast={showToast} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({ contacts: [], calls: [], agents: [], promos: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [contacts, calls, agents, promos] = await Promise.all([
        db.get("contacts"), db.get("call_logs"), db.get("agents", "name"), db.get("promotions")
      ]);
      setData({
        contacts: Array.isArray(contacts) ? contacts : [],
        calls: Array.isArray(calls) ? calls : [],
        agents: Array.isArray(agents) ? agents : [],
        promos: Array.isArray(promos) ? promos : [],
      });
    } catch (err) { if (!silent) showToast("Failed to connect to database.", "error"); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { loadAll(false); }, []);

  // AUTOMATIC REFRESH REMOVED

  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: "'Inter', system-ui, sans-serif", flexDirection: "column", gap: 20 }}>
      <style>{`body{margin:0;padding:0;background:${C.bg}}*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.brand}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 15, fontWeight: 500 }}>Loading Tanishq CRM...</div>
    </div>
  );

  const shared = { ...data, onRefresh: () => loadAll(true), showToast };

  return (
    <>
      <style>{`body{margin:0;padding:0;background:${C.bg}}*{box-sizing:border-box}input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:0.5}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {!user && <LoginScreen agents={data.agents} onLogin={setUser} />}
      {user?.role === "admin" && <AdminPage {...shared} onLogout={() => setUser(null)} />}
      {user?.role === "agent" && <AgentPage {...shared} user={user} onLogout={() => setUser(null)} />}
    </>
  );
}

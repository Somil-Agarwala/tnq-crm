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

// ── DESIGN TOKENS ─────────────────────────────────────────────
const C = {
  brand: "#3b82f6", brandText: "#ffffff",
  bg: "#09090b", card: "#18181b", border: "#27272a",
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
  "Callback Requested": C.yellow, "Not Interested": C.subtle,
  "No Answer": C.muted, "Busy": "#f97316", "Wrong Number": C.red,
};

// ── SHARED COMPONENTS ────────────────────────────────────────
const Badge = ({ label, color }) => (
  <span style={{ background: color + "1A", color, border: `1px solid ${color}33`, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
);

const Avatar = ({ name, size = 32 }) => (
  <div style={{ background: "#27272a", borderRadius: "50%", width: size, height: size, minWidth: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: C.text }}>
    {name?.[0]?.toUpperCase() || "?"}
  </div>
);

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
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: disabled ? C.border : color, color: disabled ? C.muted : textColor, border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 600, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "opacity 0.2s", ...style }}>
      {children}
    </button>
  );
}

// ── CSV EXPORT HELPER ────────────────────────────────────────
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
    if (String(pin) !== String(agent.pin)) { setError("Incorrect PIN. Try again."); return; }
    onLogin({ ...agent, role: "agent" });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: 400, padding: 48, background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ background: C.brand, borderRadius: 14, width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>📞</div>
          <div style={{ fontWeight: 800, fontSize: 24, color: C.text, letterSpacing: "-0.5px" }}>Tanishq CRM</div>
          <div style={{ color: C.brand, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, marginTop: 4 }}>OUTREACH WORKSPACE</div>
        </div>

        <div style={{ display: "flex", background: C.bg, borderRadius: 10, padding: 4, marginBottom: 28, border: `1px solid ${C.border}` }}>
          {[["Agent", false], ["Admin", true]].map(([label, val]) => (
            <button key={label} onClick={() => { setIsAdmin(val); setError(""); setPin(""); }}
              style={{ flex: 1, padding: "10px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: isAdmin === val ? C.card : "transparent",
                color: isAdmin === val ? C.text : C.muted,
                boxShadow: isAdmin === val ? "0 2px 8px rgba(0,0,0,0.3)" : "none" }}>
              {label}
            </button>
          ))}
        </div>

        {!isAdmin && (
          <div style={{ marginBottom: 18 }}>
            <label style={S.lbl}>Your Name</label>
            <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} style={S.inp}>
              <option value="">Select your name...</option>
              {agents.filter(a => a.status === "Active").map(a => <option key={a.id} value={a.name}>{a.name} — {a.role}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <label style={S.lbl}>{isAdmin ? "Admin PIN" : "Security PIN"}</label>
          <input type="password" maxLength={6} value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="• • • •"
            style={{ ...S.inp, fontSize: 28, letterSpacing: 14, textAlign: "center", padding: "14px" }} />
        </div>

        {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16, textAlign: "center", background: C.red + "11", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.red}22` }}>{error}</div>}

        <button onClick={handleLogin} style={{ width: "100%", background: C.brand, color: C.brandText, border: "none", borderRadius: 10, padding: "14px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
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
    contact_name: prefilledLead?.name || "",
    agent_name: defaultAgent || "",
    promo_name: prefilledLead?.assigned_promo || "",
    duration_minutes: "",
    outcome: "Interested",
    interest_level: "Medium",
    callback_date: "",
    notes: ""
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
        ...form,
        contact_id: prefilledLead?.id || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        callback_date: form.callback_date || null,
        call_date: today, call_time: now, callback_done: false
      });
      if (prefilledLead) await db.update("contacts", prefilledLead.id, { lead_status: "Contacted" });
      showToast("Call logged successfully ✓");
      onSaved(); onClose();
    } catch (err) { showToast("Failed to save call.", "error"); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="📞 Log a Call" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <label style={S.lbl}>Contact Name</label>
          {prefilledLead
            ? <input value={prefilledLead.name} disabled style={{ ...S.inp, opacity: 0.6 }} />
            : <><input list="cnames" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} style={S.inp} placeholder="Search contacts..." />
               <datalist id="cnames">{contacts.filter(c => !c.dnc).map(c => <option key={c.id} value={c.name} />)}</datalist></>
          }
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
          <label style={S.lbl}>Promotion / Campaign</label>
          {prefilledLead?.assigned_promo
            ? <input value={prefilledLead.assigned_promo} disabled style={{ ...S.inp, opacity: 0.6 }} />
            : <select value={form.promo_name} onChange={e => setForm({ ...form, promo_name: e.target.value })} style={S.inp}>
                <option value="">Select campaign...</option>
                {promos.filter(p => p.status === "Active").map(p => <option key={p.id}>{p.name}</option>)}
              </select>
          }
        </div>
        <div>
          <label style={S.lbl}>Duration (mins)</label>
          <input type="number" min="1" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} style={S.inp} placeholder="e.g. 5" />
        </div>
        <div>
          <label style={S.lbl}>Outcome</label>
          <select value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })} style={S.inp}>
            {Object.keys(outcomeColor).map(o => <option key={o}>{o}</option>)}
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
            Callback Date {needsCallback ? <span style={{ color: C.red }}>* Required</span> : <span style={{ color: C.muted }}>(Optional)</span>}
          </label>
          <input type="date" value={form.callback_date} onChange={e => setForm({ ...form, callback_date: e.target.value })}
            style={{ ...S.inp, border: needsCallback && !form.callback_date ? `1px solid ${C.red}` : `1px solid ${C.border}` }} />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={S.lbl}>Call Notes</label>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={S.inp} placeholder="Key points from the call..." />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <Btn onClick={save} disabled={saving || !canSave} style={{ flex: 1, padding: 12 }}>
          {saving ? "Saving..." : "Save Call Log"}
        </Btn>
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
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", customer_type: "", priority: "", category: "Business", dnc: false, notes: "", assigned_agent: "", assigned_promo: "", lead_status: "Pending" });

  const filtered = useMemo(() =>
    contacts.filter(c =>
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_type || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search)
    ), [contacts, search]);

  function openAdd() {
    setSelected(null);
    setForm({ name: "", phone: "", customer_type: "", priority: "", category: "Business", dnc: false, notes: "", assigned_agent: "", assigned_promo: "", lead_status: "Pending" });
    setModal("contact");
  }

  function openEdit(c) {
    setSelected(c);
    setForm({ name: c.name, phone: c.phone || "", customer_type: c.customer_type || "", priority: c.priority || "", category: c.category || "Business", dnc: c.dnc || false, notes: c.notes || "", assigned_agent: c.assigned_agent || "", assigned_promo: c.assigned_promo || "", lead_status: c.lead_status || "Pending" });
    setModal("contact");
  }

  async function save() {
    if (!form.name) return;
    setSaving(true);
    try {
      if (selected) { await db.update("contacts", selected.id, form); showToast("Contact updated ✓"); }
      else { await db.insert("contacts", form); showToast("Contact added ✓"); }
      setModal(null); onRefresh();
    } catch { showToast("Error saving contact.", "error"); }
    finally { setSaving(false); }
  }

  async function remove(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await db.delete("contacts", id); showToast("Contact deleted.", "error"); onRefresh(); }
    catch { showToast("Error deleting contact.", "error"); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center", gap: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search by name, customer type or phone..."
          style={{ ...S.inp, maxWidth: 380 }} />
        <div style={{ display: "flex", gap: 10 }}>
          {isAdmin && (
            <Btn onClick={() => exportToCSV(contacts.map(c => ({ name: c.name, phone: c.phone, customer_type: c.customer_type, priority: c.priority, category: c.category, dnc: c.dnc, assigned_agent: c.assigned_agent, notes: c.notes })), "contacts_export.csv")}
              color="#27272a" textColor={C.text}>⬇ Export</Btn>
          )}
          <Btn onClick={openAdd}>+ Add Contact</Btn>
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Contact", "Phone", "Customer Type", "Priority", "Type", "Status", isAdmin ? "Assigned Agent" : "Notes", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} style={{ ...S.td, color: C.muted, textAlign: "center", padding: 60 }}>No contacts found.</td></tr>}
              {filtered.map(c => {
                const callCount = calls.filter(x => x.contact_name === c.name).length;
                return (
                  <tr key={c.id} onMouseOver={e => e.currentTarget.style.background = "#1c1c1f"} onMouseOut={e => e.currentTarget.style.background = "transparent"} style={{ transition: "background 0.15s" }}>
                    <td style={S.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={c.name} />
                        <div>
                          <div style={{ fontWeight: 600, color: c.dnc ? C.muted : C.text }}>{c.name}</div>
                          <div style={{ color: C.muted, fontSize: 11 }}>{callCount} calls</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...S.td, color: C.muted }}>{c.phone || "—"}</td>
                    <td style={S.td}>{c.customer_type || "—"}</td>
                    <td style={{ ...S.td, color: C.muted }}>{c.priority || "—"}</td>
                    <td style={S.td}><Badge label={c.category || "Business"} color={c.category === "Business" ? C.brand : C.purple} /></td>
                    <td style={S.td}>{c.dnc ? <Badge label="DNC" color={C.red} /> : <Badge label="Active" color={C.green} />}</td>
                    <td style={{ ...S.td, color: C.muted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isAdmin ? (c.assigned_agent ? <span style={{ color: C.brand, fontWeight: 600 }}>{c.assigned_agent}</span> : "—") : (c.notes || "—")}
                    </td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(c)} style={{ background: "#27272a", border: "none", color: C.text, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>Edit</button>
                        <button onClick={() => remove(c.id, c.name)} style={{ background: C.red + "18", border: `1px solid ${C.red}33`, color: C.red, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>Delete</button>
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
        <Modal title={selected ? "Edit Contact" : "Add New Contact"} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {[["Full Name *", "name"], ["Phone Number", "phone"], ["Customer Type", "customer_type"], ["Priority", "priority"]].map(([label, key]) => (
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
            <div>
              <label style={S.lbl}>Lead Status</label>
              <select value={form.lead_status} onChange={e => setForm({ ...form, lead_status: e.target.value })} style={S.inp}>
                <option>Pending</option><option>Contacted</option><option>Converted</option>
              </select>
            </div>
            {isAdmin && <>
              <div>
                <label style={S.lbl}>Assigned Agent</label>
                <select value={form.assigned_agent} onChange={e => setForm({ ...form, assigned_agent: e.target.value })} style={S.inp}>
                  <option value="">Unassigned</option>
                  {agents.filter(a => a.status === "Active").map(a => <option key={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Assigned Campaign</label>
                <select value={form.assigned_promo} onChange={e => setForm({ ...form, assigned_promo: e.target.value })} style={S.inp}>
                  <option value="">None</option>
                  {promos.map(p => <option key={p.id}>{p.name}</option>)}
                </select>
              </div>
            </>}
            <div style={{ gridColumn: "span 2" }}>
              <label style={S.lbl}>Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={S.inp} placeholder="Any notes about this contact..." />
            </div>
            <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="dnc_m" checked={form.dnc} onChange={e => setForm({ ...form, dnc: e.target.checked })} style={{ width: 16, height: 16, cursor: "pointer" }} />
              <label htmlFor="dnc_m" style={{ color: C.red, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Mark as Do Not Call (DNC)</label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Btn onClick={save} disabled={saving || !form.name} style={{ flex: 1, padding: 12 }}>
              {saving ? "Saving..." : selected ? "Save Changes" : "Add Contact"}
            </Btn>
            <Btn onClick={() => setModal(null)} color="transparent" textColor={C.text} style={{ flex: 1, padding: 12, border: `1px solid ${C.border}` }}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CALLBACKS TAB (SHARED)
// ════════════════════════════════════════════════════════════
function CallbacksTab({ calls, isAdmin, onRefresh, showToast }) {
  const pending = calls.filter(c => c.callback_date && !c.callback_done);
  const done = calls.filter(c => c.callback_done);
  const [showDone, setShowDone] = useState(false);

  async function markDone(id) {
    try { await db.update("call_logs", id, { callback_done: true }); showToast("Callback completed ✓"); onRefresh(); }
    catch { showToast("Error updating callback.", "error"); }
  }

  const list = showDone ? done : pending;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ color: C.text, fontSize: 22, fontWeight: 800 }}>Callbacks & Follow-ups</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{pending.length} pending · {done.length} completed</div>
        </div>
        <div style={{ display: "flex", background: C.bg, borderRadius: 8, padding: 4, border: `1px solid ${C.border}` }}>
          {[["Pending", false], ["Completed", true]].map(([label, val]) => (
            <button key={label} onClick={() => setShowDone(val)}
              style={{ padding: "7px 16px", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12,
                background: showDone === val ? C.card : "transparent", color: showDone === val ? C.text : C.muted }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 12, padding: 80, textAlign: "center", color: C.muted, border: `1px dashed ${C.border}`, fontSize: 15 }}>
          {showDone ? "No completed callbacks yet." : "🎉 No pending callbacks — all caught up!"}
        </div>
      ) : list.map(c => (
        <div key={c.id} style={{ background: C.card, border: `1px solid ${showDone ? C.border : C.yellow + "44"}`, borderLeft: `4px solid ${showDone ? C.green : C.yellow}`, borderRadius: 12, padding: "18px 24px", marginBottom: 12, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ background: (showDone ? C.green : C.yellow) + "18", borderRadius: 10, padding: "10px 14px", textAlign: "center", minWidth: 56 }}>
            <div style={{ color: showDone ? C.green : C.yellow, fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{c.callback_date?.slice(8)}</div>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>{c.callback_date?.slice(5, 7)}/{c.callback_date?.slice(0, 4)}</div>
          </div>
          <Avatar name={c.contact_name} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{c.contact_name}</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
              {isAdmin && <span style={{ color: C.brand, fontWeight: 600, marginRight: 8 }}>{c.agent_name}</span>}
              {c.promo_name}
            </div>
            {c.notes && <div style={{ color: C.muted, fontSize: 12, marginTop: 6, fontStyle: "italic" }}>"{c.notes}"</div>}
          </div>
          {!showDone && (
            <button onClick={() => markDone(c.id)}
              style={{ background: "#052e16", color: C.green, border: `1px solid ${C.green}44`, borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              ✓ Done
            </button>
          )}
          {showDone && <Badge label="Completed" color={C.green} />}
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

  const myCalls = calls.filter(c => c.agent_name === user.name);
  const myConversions = myCalls.filter(c => c.outcome === "Converted").length;
  const myPending = myCalls.filter(c => c.callback_date && !c.callback_done);
  const myRate = myCalls.length ? Math.round((myConversions / myCalls.length) * 100) : 0;
  const myLeads = contacts.filter(c => c.assigned_agent === user.name && c.lead_status !== "Contacted" && !c.dnc);

  const TABS = [
    { key: "queue", label: `My Queue (${myLeads.length})` },
    { key: "stats", label: "My Stats" },
    { key: "callbacks", label: `Callbacks${myPending.length > 0 ? ` (${myPending.length})` : ""}` },
    { key: "allcalls", label: "Team Activity" },
    { key: "contacts", label: "Directory" },
  ];

  const outcomeCounts = Object.keys(outcomeColor).map(o => ({ name: o, count: myCalls.filter(c => c.outcome === o).length })).filter(o => o.count > 0);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "center", height: 60, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 32 }}>
          <div style={{ background: C.brand, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📞</div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.5px" }}>Tanishq CRM</span>
        </div>
        <div style={{ display: "flex", gap: 2, flex: 1, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: "none", border: "none", color: tab === t.key ? C.text : C.muted,
              borderBottom: tab === t.key ? `2px solid ${C.brand}` : "2px solid transparent",
              padding: "0 16px", height: 60, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap"
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => setShowLogCall(true)} style={{ background: C.text, color: C.bg, border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Log Call</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, borderLeft: `1px solid ${C.border}`, paddingLeft: 16 }}>
            <Avatar name={user.name} size={30} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</span>
            <button onClick={onLogout} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer" }}>Logout</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "32px 36px", maxWidth: 1280, margin: "0 auto" }}>

        {/* QUEUE */}
        {tab === "queue" && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>My Action Queue</div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Contacts assigned to you. Log an outcome to clear them from this list.</div>
            {myLeads.length === 0
              ? <div style={{ background: C.card, borderRadius: 12, padding: 80, textAlign: "center", color: C.muted, border: `1px dashed ${C.border}`, fontSize: 15 }}>🎉 Queue is empty! No pending leads assigned to you.</div>
              : myLeads.map(lead => (
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
                  <button onClick={() => setLogModalLead(lead)}
                    style={{ background: "#052e16", color: C.green, border: `1px solid ${C.green}44`, borderRadius: 8, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    📞 Dial & Log
                  </button>
                </div>
              ))
            }
          </div>
        )}

        {/* MY STATS */}
        {tab === "stats" && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>My Performance</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
              <StatCard label="Total Calls" value={myCalls.length} />
              <StatCard label="Conversions" value={myConversions} accent={C.green} />
              <StatCard label="Win Rate" value={myRate + "%"} accent={C.purple} />
              <StatCard label="Pending Callbacks" value={myPending.length} accent={C.yellow} />
            </div>
            {outcomeCounts.length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>My Outcome Breakdown</div>
                {outcomeCounts.map(o => (
                  <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                    <div style={{ width: 140, color: C.muted, fontSize: 13 }}>{o.name}</div>
                    <div style={{ flex: 1, background: C.bg, borderRadius: 999, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${(o.count / myCalls.length) * 100}%`, background: outcomeColor[o.name], height: "100%", borderRadius: 999 }} />
                    </div>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 600, width: 24, textAlign: "right" }}>{o.count}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Recent Activity</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["Contact", "Date", "Campaign", "Duration", "Outcome", "Interest", "Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {myCalls.length === 0 && <tr><td colSpan={7} style={{ ...S.td, color: C.muted, textAlign: "center", padding: 50 }}>No calls logged yet.</td></tr>}
                    {myCalls.slice(0, 20).map(c => (
                      <tr key={c.id} onMouseOver={e => e.currentTarget.style.background = "#1c1c1f"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ ...S.td, fontWeight: 600 }}>{c.contact_name}</td>
                        <td style={{ ...S.td, color: C.muted }}>{c.call_date}</td>
                        <td style={S.td}>{c.promo_name}</td>
                        <td style={{ ...S.td, color: C.muted, textAlign: "center" }}>{c.duration_minutes ? c.duration_minutes + "m" : "—"}</td>
                        <td style={S.td}><Badge label={c.outcome} color={outcomeColor[c.outcome] || C.muted} /></td>
                        <td style={S.td}><Badge label={c.interest_level} color={c.interest_level === "High" ? C.green : c.interest_level === "Medium" ? C.yellow : C.muted} /></td>
                        <td style={{ ...S.td, color: C.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "callbacks" && <CallbacksTab calls={myCalls} isAdmin={false} onRefresh={onRefresh} showToast={showToast} />}

        {tab === "contacts" && <ContactsTab contacts={contacts} calls={calls} agents={agents} promos={promos} onRefresh={onRefresh} showToast={showToast} isAdmin={false} />}

        {tab === "allcalls" && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Team Activity Feed</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["Contact", "Date", "Agent", "Campaign", "Outcome", "Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {calls.length === 0 && <tr><td colSpan={6} style={{ ...S.td, color: C.muted, textAlign: "center", padding: 50 }}>No activity yet.</td></tr>}
                    {calls.slice(0, 50).map(c => (
                      <tr key={c.id} onMouseOver={e => e.currentTarget.style.background = "#1c1c1f"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ ...S.td, fontWeight: 600 }}>{c.contact_name}</td>
                        <td style={{ ...S.td, color: C.muted }}>{c.call_date}</td>
                        <td style={S.td}><Badge label={c.agent_name} color={c.agent_name === user.name ? C.brand : C.subtle} /></td>
                        <td style={S.td}>{c.promo_name}</td>
                        <td style={S.td}><Badge label={c.outcome} color={outcomeColor[c.outcome] || C.muted} /></td>
                        <td style={{ ...S.td, color: C.muted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {showLogCall && <LogCallModal contacts={contacts} promos={promos} agents={agents} defaultAgent={user.name} prefilledLead={null} onClose={() => setShowLogCall(false)} onSaved={onRefresh} showToast={showToast} />}
      {logModalLead && <LogCallModal contacts={contacts} promos={promos} agents={agents} defaultAgent={user.name} prefilledLead={logModalLead} onClose={() => setLogModalLead(null)} onSaved={onRefresh} showToast={showToast} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN PAGE
// ════════════════════════════════════════════════════════════
function AdminPage({ contacts, calls, agents, promos, onRefresh, onLogout, showToast }) {
  const [tab, setTab] = useState("dashboard");
  const [showLogCall, setShowLogCall] = useState(false);

  // Promo management
  const [promoModal, setPromoModal] = useState(null); // null | "add" | "edit"
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({ name: "", description: "", status: "Active", start_date: "", end_date: "", target_audience: "All" });

  // Agent management
  const [agentModal, setAgentModal] = useState(null); // null | "add" | "edit"
  const [selectedAgent, setSelectedAgentModal] = useState(null);
  const [agentForm, setAgentForm] = useState({ name: "", role: "Agent", phone_ext: "", pin: "", status: "Active" });

  // Call log filters
  const [filterAgent, setFilterAgent] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");
  const [filterPromo, setFilterPromo] = useState("");
  const [callSearch, setCallSearch] = useState("");

  // Agent drill-down
  const [viewAgent, setViewAgent] = useState(null);

  // Import leads
  const [importModal, setImportModal] = useState(false);
  const [importAgent, setImportAgent] = useState("");
  const [importPromo, setImportPromo] = useState("");
  const [parsedCsv, setParsedCsv] = useState([]);
  const [importing, setImporting] = useState(false);

  const conversions = calls.filter(c => c.outcome === "Converted").length;
  const convRate = calls.length ? Math.round((conversions / calls.length) * 100) : 0;
  const pendingCallbacks = calls.filter(c => c.callback_date && !c.callback_done);
  const activePromos = promos.filter(p => p.status === "Active");

  const agentStats = agents.map(a => ({
    ...a,
    total: calls.filter(c => c.agent_name === a.name).length,
    converted: calls.filter(c => c.agent_name === a.name && c.outcome === "Converted").length,
  })).sort((a, b) => b.converted - a.converted);

  const outcomeCounts = Object.keys(outcomeColor).map(o => ({ name: o, count: calls.filter(c => c.outcome === o).length })).filter(o => o.count > 0);

  const filteredCalls = useMemo(() => calls.filter(c => {
    if (filterAgent && c.agent_name !== filterAgent) return false;
    if (filterOutcome && c.outcome !== filterOutcome) return false;
    if (filterPromo && c.promo_name !== filterPromo) return false;
    if (callSearch && !c.contact_name?.toLowerCase().includes(callSearch.toLowerCase()) && !c.notes?.toLowerCase().includes(callSearch.toLowerCase())) return false;
    return true;
  }), [calls, filterAgent, filterOutcome, filterPromo, callSearch]);

  const TABS = [
    { key: "dashboard", label: "Dashboard" },
    { key: "campaigns", label: "Campaigns" },
    { key: "agents", label: "Team" },
    { key: "calls", label: "Call Logs" },
    { key: "callbacks", label: `Callbacks${pendingCallbacks.length > 0 ? ` (${pendingCallbacks.length})` : ""}` },
    { key: "contacts", label: "Directory" },
  ];

  // ── Promo CRUD ──
  async function savePromo() {
    if (!promoForm.name) return;
    try {
      if (selectedPromo) { await db.update("promotions", selectedPromo.id, promoForm); showToast("Campaign updated ✓"); }
      else { await db.insert("promotions", promoForm); showToast("Campaign created ✓"); }
      setPromoModal(null); setSelectedPromo(null); onRefresh();
    } catch { showToast("Error saving campaign.", "error"); }
  }

  async function deletePromo(id, name) {
    if (!window.confirm(`Delete campaign "${name}"?`)) return;
    try { await db.delete("promotions", id); showToast("Campaign deleted.", "error"); onRefresh(); }
    catch { showToast("Error deleting campaign.", "error"); }
  }

  function openEditPromo(p) {
    setSelectedPromo(p);
    setPromoForm({ name: p.name, description: p.description || "", status: p.status, start_date: p.start_date || "", end_date: p.end_date || "", target_audience: p.target_audience || "All" });
    setPromoModal("edit");
  }

  // ── Agent CRUD ──
  async function saveAgent() {
    if (!agentForm.name || !agentForm.pin) return;
    try {
      if (selectedAgent) { await db.update("agents", selectedAgent.id, agentForm); showToast("Agent updated ✓"); }
      else { await db.insert("agents", agentForm); showToast("Agent added ✓"); }
      setAgentModal(null); setSelectedAgentModal(null); onRefresh();
    } catch { showToast("Error saving agent.", "error"); }
  }

  async function deleteAgent(id, name) {
    if (!window.confirm(`Remove agent "${name}"?`)) return;
    try { await db.delete("agents", id); showToast("Agent removed.", "error"); onRefresh(); }
    catch { showToast("Error removing agent.", "error"); }
  }

  function openEditAgent(a) {
    setSelectedAgentModal(a);
    setAgentForm({ name: a.name, role: a.role || "Agent", phone_ext: a.phone_ext || "", pin: a.pin || "", status: a.status || "Active" });
    setAgentModal("edit");
  }

  // ── CSV Import ──
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = ev.target.result.split("\n").filter(l => l.trim());
      if (lines.length < 2) { showToast("CSV is empty.", "error"); return; }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
      const data = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
        const obj = {}; headers.forEach((h, i) => obj[h] = values[i] || ""); return obj;
      });
      setParsedCsv(data);
    };
    reader.readAsText(file);
  }

  async function executeImport() {
    if (!importAgent || !importPromo || !parsedCsv.length) return;
    setImporting(true);
    try {
      await Promise.all(parsedCsv.map(row => db.insert("contacts", {
        name: row.name || "Unknown", phone: row.phone || "", customer_type: row.customer_type || "",
        priority: row.priority || "", category: "Business", dnc: false,
        assigned_agent: importAgent, assigned_promo: importPromo, lead_status: "Pending"
      })));
      showToast(`✓ Imported ${parsedCsv.length} leads assigned to ${importAgent}`);
      setImportModal(false); setParsedCsv([]); setImportAgent(""); setImportPromo(""); onRefresh();
    } catch { showToast("Error importing leads.", "error"); }
    finally { setImporting(false); }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* NAV */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "center", height: 60, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 28 }}>
          <div style={{ background: C.brand, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📞</div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.5px" }}>Tanishq CRM</span>
          <Badge label="ADMIN" color={C.brand} />
        </div>
        <div style={{ display: "flex", gap: 0, flex: 1, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setViewAgent(null); }} style={{
              background: "none", border: "none", color: tab === t.key ? C.text : C.muted,
              borderBottom: tab === t.key ? `2px solid ${C.brand}` : "2px solid transparent",
              padding: "0 16px", height: 60, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap"
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => setShowLogCall(true)} style={{ background: C.text, color: C.bg, border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Log Call</button>
          <button onClick={onLogout} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "32px 36px", maxWidth: 1280, margin: "0 auto" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Command Center</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
              <StatCard label="Total Contacts" value={contacts.length} />
              <StatCard label="Total Calls" value={calls.length} accent={C.brand} />
              <StatCard label="Conversions" value={conversions} accent={C.green} />
              <StatCard label="Win Rate" value={convRate + "%"} accent={C.purple} />
              <StatCard label="Pending Callbacks" value={pendingCallbacks.length} accent={C.yellow} />
              <StatCard label="Active Campaigns" value={activePromos.length} accent="#f97316" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              {/* Outcomes */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Outcome Distribution</div>
                {outcomeCounts.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No calls logged yet.</div>}
                {outcomeCounts.map(o => (
                  <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                    <div style={{ width: 140, color: C.muted, fontSize: 12, flexShrink: 0 }}>{o.name}</div>
                    <div style={{ flex: 1, background: C.bg, borderRadius: 999, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${(o.count / calls.length) * 100}%`, background: outcomeColor[o.name], height: "100%", borderRadius: 999 }} />
                    </div>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 600, width: 28, textAlign: "right" }}>{o.count}</div>
                  </div>
                ))}
              </div>

              {/* Leaderboard */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Agent Leaderboard</div>
                {agentStats.map((a, i) => {
                  const rate = a.total ? Math.round((a.converted / a.total) * 100) : 0;
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                      <div style={{ color: i === 0 ? C.brand : C.subtle, fontWeight: 800, fontSize: 15, width: 24 }}>#{i + 1}</div>
                      <Avatar name={a.name} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                        <div style={{ color: C.muted, fontSize: 11 }}>{a.total} calls · {rate}% win rate</div>
                      </div>
                      <Badge label={`${a.converted} wins`} color={C.green} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending callbacks summary */}
            {pendingCallbacks.length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.yellow}33`, borderLeft: `4px solid ${C.yellow}`, borderRadius: 12, padding: 20 }}>
                <div style={{ color: C.yellow, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>🔔 {pendingCallbacks.length} Pending Callback{pendingCallbacks.length > 1 ? "s" : ""}</div>
                {pendingCallbacks.slice(0, 4).map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
                    <span style={{ color: C.yellow, fontWeight: 600, minWidth: 96 }}>{c.callback_date}</span>
                    <span style={{ fontWeight: 600 }}>{c.contact_name}</span>
                    <span style={{ color: C.muted }}>→</span>
                    <span style={{ color: C.brand, fontWeight: 600 }}>{c.agent_name}</span>
                    <span style={{ color: C.subtle, flex: 1 }}>{c.promo_name}</span>
                    <button onClick={() => setTab("callbacks")} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>View All</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CAMPAIGNS ── */}
        {tab === "campaigns" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>Campaign Management</div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={() => setImportModal(true)} color="#052e16" textColor={C.green} style={{ border: `1px solid ${C.green}44` }}>📥 Import Leads</Btn>
                <Btn onClick={() => { setSelectedPromo(null); setPromoForm({ name: "", description: "", status: "Active", start_date: "", end_date: "", target_audience: "All" }); setPromoModal("add"); }}>+ New Campaign</Btn>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
              {promos.map(p => {
                const pitched = calls.filter(c => c.promo_name === p.name).length;
                const converted = calls.filter(c => c.promo_name === p.name && c.outcome === "Converted").length;
                const rate = pitched ? Math.round((converted / pitched) * 100) : 0;
                const assigned = contacts.filter(c => c.assigned_promo === p.name);
                const contacted = assigned.filter(c => c.lead_status === "Contacted");
                const progress = assigned.length ? Math.round((contacted.length / assigned.length) * 100) : 0;
                return (
                  <div key={p.id} style={{ background: C.card, border: `1px solid ${p.status === "Active" ? C.green + "44" : C.border}`, borderRadius: 12, padding: 22, position: "relative", overflow: "hidden" }}>
                    {p.status === "Active" && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: C.green }} />}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, flex: 1, marginRight: 10 }}>{p.name}</div>
                      <Badge label={p.status} color={p.status === "Active" ? C.green : C.subtle} />
                    </div>
                    {p.description && <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>{p.description}</div>}

                    {/* Progress bar */}
                    {assigned.length > 0 && (
                      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 8 }}>
                          <span style={{ fontWeight: 600 }}>Lead Progress</span>
                          <span style={{ color: C.text, fontWeight: 700 }}>{contacted.length}/{assigned.length}</span>
                        </div>
                        <div style={{ background: "#27272a", borderRadius: 999, height: 7, overflow: "hidden" }}>
                          <div style={{ width: `${progress}%`, height: "100%", background: C.brand, borderRadius: 999 }} />
                        </div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 6, textAlign: "right", fontWeight: 700 }}>{progress}% CONTACTED</div>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                      {[["CALLS", pitched, C.yellow], ["CONVERTED", converted, C.green], ["WIN RATE", rate + "%", C.purple]].map(([l, v, color]) => (
                        <div key={l} style={{ textAlign: "center" }}>
                          <div style={{ color, fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{v}</div>
                          <div style={{ color: C.muted, fontSize: 10, letterSpacing: 0.5, fontWeight: 600, marginTop: 4 }}>{l}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEditPromo(p)} style={{ flex: 1, background: "#27272a", border: "none", color: C.text, borderRadius: 6, padding: "7px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
                      <button onClick={() => deletePromo(p.id, p.name)} style={{ flex: 1, background: C.red + "18", border: `1px solid ${C.red}33`, color: C.red, borderRadius: 6, padding: "7px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TEAM / AGENTS ── */}
        {tab === "agents" && (
          <div>
            {!viewAgent ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>Team Management</div>
                  <Btn onClick={() => { setSelectedAgentModal(null); setAgentForm({ name: "", role: "Agent", phone_ext: "", pin: "", status: "Active" }); setAgentModal("add"); }}>+ Add Agent</Btn>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>{["Agent", "Role", "PIN", "Total Calls", "Conversions", "Win Rate", "Status", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {agentStats.map(a => {
                          const rate = a.total ? Math.round((a.converted / a.total) * 100) : 0;
                          return (
                            <tr key={a.id} onMouseOver={e => e.currentTarget.style.background = "#1c1c1f"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                              <td style={S.td}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Avatar name={a.name} />
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                                    <div style={{ color: C.muted, fontSize: 11 }}>Ext: {a.phone_ext || "—"}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ ...S.td, color: C.muted }}>{a.role}</td>
                              <td style={{ ...S.td, fontFamily: "monospace", letterSpacing: 2, color: C.subtle }}>{a.pin || "—"}</td>
                              <td style={{ ...S.td, textAlign: "center", fontWeight: 600 }}>{a.total}</td>
                              <td style={{ ...S.td, textAlign: "center", color: C.green, fontWeight: 600 }}>{a.converted}</td>
                              <td style={{ ...S.td, textAlign: "center", color: C.purple, fontWeight: 600 }}>{rate}%</td>
                              <td style={S.td}><Badge label={a.status} color={a.status === "Active" ? C.green : C.yellow} /></td>
                              <td style={S.td}>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={() => setViewAgent(a)} style={{ background: C.brand + "22", border: `1px solid ${C.brand}33`, color: C.brand, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Inspect</button>
                                  <button onClick={() => openEditAgent(a)} style={{ background: "#27272a", border: "none", color: C.text, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>Edit</button>
                                  <button onClick={() => deleteAgent(a.id, a.name)} style={{ background: C.red + "18", border: `1px solid ${C.red}33`, color: C.red, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>Remove</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              // Agent drill-down
              <div>
                <button onClick={() => setViewAgent(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 16px", marginBottom: 24, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>← Back to Team</button>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
                  <Avatar name={viewAgent.name} size={60} />
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 800 }}>{viewAgent.name}</div>
                    <div style={{ color: C.muted, fontSize: 14 }}>{viewAgent.role} · Supervisory View</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
                  <StatCard label="Total Calls" value={calls.filter(c => c.agent_name === viewAgent.name).length} />
                  <StatCard label="Conversions" value={calls.filter(c => c.agent_name === viewAgent.name && c.outcome === "Converted").length} accent={C.green} />
                  <StatCard label="Pending Callbacks" value={calls.filter(c => c.agent_name === viewAgent.name && c.callback_date && !c.callback_done).length} accent={C.yellow} />
                  <StatCard label="Assigned Leads" value={contacts.filter(c => c.assigned_agent === viewAgent.name && c.lead_status !== "Contacted").length} accent={C.purple} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Call History</div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>{["Contact", "Date", "Campaign", "Duration", "Outcome", "Interest", "Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {calls.filter(c => c.agent_name === viewAgent.name).length === 0
                          ? <tr><td colSpan={7} style={{ ...S.td, color: C.muted, textAlign: "center", padding: 50 }}>No calls logged by this agent.</td></tr>
                          : calls.filter(c => c.agent_name === viewAgent.name).map(c => (
                            <tr key={c.id}>
                              <td style={{ ...S.td, fontWeight: 600 }}>{c.contact_name}</td>
                              <td style={{ ...S.td, color: C.muted }}>{c.call_date}</td>
                              <td style={S.td}>{c.promo_name}</td>
                              <td style={{ ...S.td, color: C.muted, textAlign: "center" }}>{c.duration_minutes ? c.duration_minutes + "m" : "—"}</td>
                              <td style={S.td}><Badge label={c.outcome} color={outcomeColor[c.outcome] || C.muted} /></td>
                              <td style={S.td}><Badge label={c.interest_level} color={c.interest_level === "High" ? C.green : c.interest_level === "Medium" ? C.yellow : C.muted} /></td>
                              <td style={{ ...S.td, color: C.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CALL LOGS ── */}
        {tab === "calls" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>Master Call Log</div>
              <Btn onClick={() => exportToCSV(filteredCalls.map(c => ({ date: c.call_date, time: c.call_time, contact: c.contact_name, agent: c.agent_name, campaign: c.promo_name, duration: c.duration_minutes, outcome: c.outcome, interest: c.interest_level, callback: c.callback_date, notes: c.notes })), "call_logs_export.csv")} color="#27272a" textColor={C.text}>⬇ Export CSV</Btn>
            </div>

            {/* Filters */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, background: C.card, padding: "16px 20px", borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div>
                <label style={S.lbl}>Search</label>
                <input value={callSearch} onChange={e => setCallSearch(e.target.value)} placeholder="Contact or notes..." style={S.inp} />
              </div>
              <div>
                <label style={S.lbl}>Agent</label>
                <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} style={S.inp}>
                  <option value="">All Agents</option>
                  {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Campaign</label>
                <select value={filterPromo} onChange={e => setFilterPromo(e.target.value)} style={S.inp}>
                  <option value="">All Campaigns</option>
                  {promos.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Outcome</label>
                <select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)} style={S.inp}>
                  <option value="">All Outcomes</option>
                  {Object.keys(outcomeColor).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Showing {filteredCalls.length} of {calls.length} calls</div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["Contact", "Date & Time", "Agent", "Campaign", "Mins", "Outcome", "Callback", "Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredCalls.length === 0 && <tr><td colSpan={8} style={{ ...S.td, color: C.muted, textAlign: "center", padding: 60 }}>No calls match these filters.</td></tr>}
                    {filteredCalls.map(c => (
                      <tr key={c.id} onMouseOver={e => e.currentTarget.style.background = "#1c1c1f"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ ...S.td, fontWeight: 600 }}>{c.contact_name}</td>
                        <td style={{ ...S.td, color: C.muted, whiteSpace: "nowrap" }}>{c.call_date} {c.call_time?.slice(0, 5)}</td>
                        <td style={S.td}><Badge label={c.agent_name} color={C.brand} /></td>
                        <td style={S.td}>{c.promo_name}</td>
                        <td style={{ ...S.td, color: C.muted, textAlign: "center" }}>{c.duration_minutes ? c.duration_minutes + "m" : "—"}</td>
                        <td style={S.td}><Badge label={c.outcome} color={outcomeColor[c.outcome] || C.muted} /></td>
                        <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                          {c.callback_date
                            ? <span style={{ color: c.callback_done ? C.green : C.yellow, fontWeight: 600 }}>{c.callback_date} {c.callback_done ? "✓" : "⏳"}</span>
                            : <span style={{ color: C.border }}>—</span>}
                        </td>
                        <td style={{ ...S.td, color: C.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── CALLBACKS ── */}
        {tab === "callbacks" && <CallbacksTab calls={calls} isAdmin={true} onRefresh={onRefresh} showToast={showToast} />}

        {/* ── CONTACTS ── */}
        {tab === "contacts" && <ContactsTab contacts={contacts} calls={calls} agents={agents} promos={promos} onRefresh={onRefresh} showToast={showToast} isAdmin={true} />}
      </div>

      {/* ── MODALS ── */}

      {/* Promo Modal */}
      {promoModal && (
        <Modal title={promoModal === "edit" ? "Edit Campaign" : "New Campaign"} onClose={() => { setPromoModal(null); setSelectedPromo(null); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div><label style={S.lbl}>Campaign Name *</label><input value={promoForm.name} onChange={e => setPromoForm({ ...promoForm, name: e.target.value })} style={S.inp} /></div>
            <div><label style={S.lbl}>Description</label><input value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })} style={S.inp} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><label style={S.lbl}>Start Date</label><input type="date" value={promoForm.start_date} onChange={e => setPromoForm({ ...promoForm, start_date: e.target.value })} style={S.inp} /></div>
              <div><label style={S.lbl}>End Date</label><input type="date" value={promoForm.end_date} onChange={e => setPromoForm({ ...promoForm, end_date: e.target.value })} style={S.inp} /></div>
              <div>
                <label style={S.lbl}>Status</label>
                <select value={promoForm.status} onChange={e => setPromoForm({ ...promoForm, status: e.target.value })} style={S.inp}>
                  <option>Active</option><option>Expired</option><option>Paused</option>
                </select>
              </div>
              <div><label style={S.lbl}>Target Audience</label><input value={promoForm.target_audience} onChange={e => setPromoForm({ ...promoForm, target_audience: e.target.value })} style={S.inp} /></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Btn onClick={savePromo} disabled={!promoForm.name} style={{ flex: 1, padding: 12 }}>Save Campaign</Btn>
            <Btn onClick={() => { setPromoModal(null); setSelectedPromo(null); }} color="transparent" textColor={C.text} style={{ flex: 1, padding: 12, border: `1px solid ${C.border}` }}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* Agent Modal */}
      {agentModal && (
        <Modal title={agentModal === "edit" ? "Edit Agent" : "Add New Agent"} onClose={() => { setAgentModal(null); setSelectedAgentModal(null); }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div><label style={S.lbl}>Full Name *</label><input value={agentForm.name} onChange={e => setAgentForm({ ...agentForm, name: e.target.value })} style={S.inp} /></div>
            <div>
              <label style={S.lbl}>Role</label>
              <select value={agentForm.role} onChange={e => setAgentForm({ ...agentForm, role: e.target.value })} style={S.inp}>
                <option>Agent</option><option>Senior Agent</option><option>Junior Agent</option><option>Team Lead</option>
              </select>
            </div>
            <div><label style={S.lbl}>Login PIN * (numbers only)</label><input type="password" maxLength={6} value={agentForm.pin} onChange={e => setAgentForm({ ...agentForm, pin: e.target.value })} style={S.inp} placeholder="e.g. 1234" /></div>
            <div><label style={S.lbl}>Phone Extension</label><input value={agentForm.phone_ext} onChange={e => setAgentForm({ ...agentForm, phone_ext: e.target.value })} style={S.inp} /></div>
            <div>
              <label style={S.lbl}>Status</label>
              <select value={agentForm.status} onChange={e => setAgentForm({ ...agentForm, status: e.target.value })} style={S.inp}>
                <option>Active</option><option>On Leave</option><option>Inactive</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Btn onClick={saveAgent} disabled={!agentForm.name || !agentForm.pin} style={{ flex: 1, padding: 12 }}>
              {agentModal === "edit" ? "Save Changes" : "Add Agent"}
            </Btn>
            <Btn onClick={() => { setAgentModal(null); setSelectedAgentModal(null); }} color="transparent" textColor={C.text} style={{ flex: 1, padding: 12, border: `1px solid ${C.border}` }}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* Import Leads Modal */}
      {importModal && (
        <Modal title="📥 Import & Assign Leads" onClose={() => { setImportModal(false); setParsedCsv([]); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "#1c1200", border: `1px solid ${C.yellow}33`, borderRadius: 8, padding: 14, color: C.yellow, fontSize: 13, lineHeight: 1.6 }}>
              Upload a <strong>.csv</strong> file with these column headers: <code style={{ color: C.text }}>name, phone, customer_type, priority</code>
            </div>
            <div>
              <label style={S.lbl}>1. Select Campaign</label>
              <select value={importPromo} onChange={e => setImportPromo(e.target.value)} style={S.inp}>
                <option value="">Select campaign...</option>
                {activePromos.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={S.lbl}>2. Assign to Agent</label>
              <select value={importAgent} onChange={e => setImportAgent(e.target.value)} style={S.inp}>
                <option value="">Select agent...</option>
                {agents.filter(a => a.status === "Active" && a.role !== "admin").map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={S.lbl}>3. Upload CSV File</label>
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ ...S.inp, padding: 10 }} />
            </div>
            {parsedCsv.length > 0 && (
              <div style={{ background: "#052e16", border: `1px solid ${C.green}44`, color: C.green, padding: 12, borderRadius: 8, fontWeight: 600, textAlign: "center" }}>
                ✓ {parsedCsv.length} leads parsed and ready to import
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Btn onClick={executeImport} disabled={importing || !parsedCsv.length || !importAgent || !importPromo} style={{ flex: 1, padding: 12 }}>
              {importing ? "Importing..." : `Import ${parsedCsv.length || ""} Leads`}
            </Btn>
            <Btn onClick={() => { setImportModal(false); setParsedCsv([]); }} color="transparent" textColor={C.text} style={{ flex: 1, padding: 12, border: `1px solid ${C.border}` }}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {showLogCall && <LogCallModal contacts={contacts} promos={promos} agents={agents} defaultAgent={null} prefilledLead={null} onClose={() => setShowLogCall(false)} onSaved={onRefresh} showToast={showToast} />}
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

  // Auto-refresh every 30 seconds when logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => loadAll(true), 30000);
    return () => clearInterval(interval);
  }, [user, loadAll]);

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

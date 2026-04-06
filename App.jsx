import { useState, useEffect, useMemo, useCallback } from "react";

// ── SUPABASE ─────────────────────────────────────────────────
const SUPABASE_URL = "https://btqcxzjrdpiyyqcyrimk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cWN4empyZHBpeXlxY3lyaW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODQ2MDIsImV4cCI6MjA4Nzg2MDYwMn0.PGy-UjyjT0pczlmac9QivO-j_MUt4hbZqkClypY1868";
const ADMIN_PIN = "0000";

const db = {
  async get(table, order = "created_at") {
    // FIX: Added timestamp and cache: "no-store" to force browser to ignore cache on manual refresh
    const timestamp = new Date().getTime();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?order=${order}.desc&t=${timestamp}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  },
  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  },
  async update(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  },
  async remove(table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(res.statusText);
  },
  async removeMany(table, ids) {
    if (!ids.length) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=in.(${ids.join(",")})`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(res.statusText);
  },
  async clearPending(agentName, promoName, since) {
    let url = `${SUPABASE_URL}/rest/v1/contacts?lead_status=eq.Pending&assigned_agent=eq.${encodeURIComponent(agentName)}&assigned_promo=eq.${encodeURIComponent(promoName)}`;
    if (since) url += `&assigned_at=gte.${encodeURIComponent(since)}`;
    const res = await fetch(url, { method: "DELETE", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!res.ok) throw new Error(res.statusText);
  }
};

const C = {
  brand: "#3b82f6", brandText: "#fff",
  bg: "#09090b", card: "#18181b", border: "#27272a",
  text: "#fafafa", muted: "#a1a1aa", subtle: "#52525b",
  green: "#10b981", yellow: "#f59e0b", red: "#ef4444", purple: "#8b5cf6",
};

const S = {
  inp: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "10px 14px", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  lbl: { color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 },
  th: { padding: "12px 18px", color: C.muted, fontSize: 11, fontWeight: 600, textAlign: "left", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, background: C.card, whiteSpace: "nowrap" },
  td: { padding: "13px 18px", fontSize: 13, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", color: "#e4e4e7" },
};

const OC = {
  "Converted": C.green, "Very Interested": C.brand, "Interested": C.purple,
  "Callback Requested": C.yellow, "Not Interested": C.subtle,
  "No Answer": C.muted, "Busy": "#f97316", "Wrong Number": C.red,
};

const Badge = ({ label, color }) => (
  <span style={{ background: color + "1A", color, border: `1px solid ${color}33`, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
);

const Av = ({ name, size = 32 }) => (
  <div style={{ background: "#27272a", borderRadius: "50%", width: size, height: size, minWidth: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: C.text }}>
    {name?.[0]?.toUpperCase() || "?"}
  </div>
);

function Toast({ msg, type }) {
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: type === "error" ? "#450a0a" : "#052e16", border: `1px solid ${type === "error" ? "#ef444455" : "#10b98155"}`, color: C.text, borderRadius: 10, padding: "14px 24px", fontWeight: 600, fontSize: 14, boxShadow: "0 10px 40px rgba(0,0,0,.5)", display: "flex", alignItems: "center", gap: 10 }}>
      {type === "error" ? "✗" : "✓"} {msg}
    </div>
  );
}

function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
          <button onClick={onClose} style={{ background: "#27272a", border: "none", color: C.muted, fontSize: 16, cursor: "pointer", borderRadius: 6, width: 28, height: 28 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, ...style }}>{children}</div>;
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

function Btn({ children, onClick, color = C.brand, textColor = C.brandText, disabled, outline, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? C.border : (outline ? "transparent" : color),
      color: disabled ? C.muted : textColor,
      border: outline ? `1px solid ${color}` : "none",
      borderRadius: 8, padding: "10px 18px", fontWeight: 600, fontSize: 13,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", ...style
    }}>{children}</button>
  );
}

function ProgBar({ value, color = C.brand, height = 8 }) {
  return (
    <div style={{ background: "#27272a", borderRadius: 999, height, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: "100%", background: color, borderRadius: 999 }} />
    </div>
  );
}

function exportCSV(data, name) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map(r => keys.map(k => `"${(r[k] ?? "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name; a.click();
}

// ── TABLE WRAPPER ─────────────────────────────────────────────
function DataTable({ headers, children, empty = "No data." }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{headers.map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function TR({ children, selected }) {
  const [hov, setHov] = useState(false);
  return (
    <tr style={{ background: selected ? C.brand + "11" : hov ? "#1c1c1f" : "transparent", transition: "background .15s" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {children}
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════
function LoginScreen({ agents, onLogin }) {
  const [agent, setAgent] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [admin, setAdmin] = useState(false);

  function login() {
    setErr("");
    if (admin) { pin === ADMIN_PIN ? onLogin({ name: "Admin", role: "admin" }) : setErr("Wrong PIN."); return; }
    if (!agent) { setErr("Select your name."); return; }
    const a = agents.find(x => x.name === agent);
    if (!a) { setErr("Agent not found."); return; }
    if (String(pin) !== String(a.pin)) { setErr("Wrong PIN."); return; }
    onLogin({ ...a, role: "agent" });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ width: 400, padding: 48, background: C.card, borderRadius: 20, border: `1px solid ${C.border}` }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ background: C.brand, borderRadius: 14, width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>📞</div>
          <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-0.5px" }}>Tanishq CRM</div>
          <div style={{ color: C.brand, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, marginTop: 4 }}>OUTREACH WORKSPACE</div>
        </div>

        <div style={{ display: "flex", background: C.bg, borderRadius: 10, padding: 4, marginBottom: 28, border: `1px solid ${C.border}` }}>
          {[["Agent", false], ["Admin", true]].map(([l, v]) => (
            <button key={l} onClick={() => { setAdmin(v); setErr(""); setPin(""); }}
              style={{ flex: 1, padding: 10, border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 13, background: admin === v ? C.card : "transparent", color: admin === v ? C.text : C.muted }}>
              {l}
            </button>
          ))}
        </div>

        {!admin && (
          <div style={{ marginBottom: 18 }}>
            <label style={S.lbl}>Your Name</label>
            <select value={agent} onChange={e => setAgent(e.target.value)} style={S.inp}>
              <option value="">Select your name...</option>
              {agents.filter(a => a.status === "Active").map(a => <option key={a.id} value={a.name}>{a.name} — {a.role}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <label style={S.lbl}>{admin ? "Admin PIN" : "Security PIN"}</label>
          <input type="password" maxLength={6} value={pin} onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()} placeholder="••••"
            style={{ ...S.inp, fontSize: 28, letterSpacing: 14, textAlign: "center", padding: 14 }} />
        </div>

        {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 16, textAlign: "center", background: C.red + "11", padding: "8px 12px", borderRadius: 6 }}>{err}</div>}

        <button onClick={login} style={{ width: "100%", background: C.brand, color: C.brandText, border: "none", borderRadius: 10, padding: 14, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
          {admin ? "Access Admin Panel" : "Log In"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LOG CALL MODAL
// ═══════════════════════════════════════════════════════════
function LogCallModal({ contacts, promos, agents, defaultAgent, prefill, onClose, onDone, toast }) {
  const [f, setF] = useState({
    contact_name: prefill?.name || "", agent_name: defaultAgent || "",
    promo_name: prefill?.assigned_promo || "", duration_minutes: "",
    outcome: "Interested", interest_level: "Medium", callback_date: "", notes: ""
  });
  const [saving, setSaving] = useState(false);
  const needsCB = f.outcome === "Callback Requested";
  const ok = f.contact_name && f.agent_name && (!needsCB || f.callback_date);

  async function save() {
    if (!ok) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toTimeString().slice(0, 5);
      await db.insert("call_logs", { ...f, contact_id: prefill?.id || null, duration_minutes: f.duration_minutes ? parseInt(f.duration_minutes) : null, callback_date: f.callback_date || null, call_date: today, call_time: now, callback_done: false });
      if (prefill) await db.update("contacts", prefill.id, { lead_status: "Contacted" });
      toast("Call logged ✓"); onDone(); onClose();
    } catch { toast("Failed to save.", "error"); }
    finally { setSaving(false); }
  }

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  return (
    <Modal title="📞 Log a Call" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <label style={S.lbl}>Contact</label>
          {prefill ? <input value={prefill.name} disabled style={{ ...S.inp, opacity: .6 }} />
            : <><input list="cl" value={f.contact_name} onChange={set("contact_name")} style={S.inp} placeholder="Search..." />
               <datalist id="cl">{contacts.filter(c => !c.dnc).map(c => <option key={c.id} value={c.name} />)}</datalist></>}
        </div>
        <div>
          <label style={S.lbl}>Agent</label>
          {defaultAgent ? <input value={defaultAgent} disabled style={{ ...S.inp, opacity: .6 }} />
            : <select value={f.agent_name} onChange={set("agent_name")} style={S.inp}>
                <option value="">Select...</option>
                {agents.filter(a => a.status === "Active").map(a => <option key={a.id}>{a.name}</option>)}
              </select>}
        </div>
        <div>
          <label style={S.lbl}>Campaign</label>
          {prefill?.assigned_promo ? <input value={prefill.assigned_promo} disabled style={{ ...S.inp, opacity: .6 }} />
            : <select value={f.promo_name} onChange={set("promo_name")} style={S.inp}>
                <option value="">Select...</option>
                {promos.filter(p => p.status === "Active").map(p => <option key={p.id}>{p.name}</option>)}
              </select>}
        </div>
        <div><label style={S.lbl}>Duration (mins)</label><input type="number" min="1" value={f.duration_minutes} onChange={set("duration_minutes")} style={S.inp} /></div>
        <div>
          <label style={S.lbl}>Outcome</label>
          <select value={f.outcome} onChange={set("outcome")} style={S.inp}>
            {Object.keys(OC).map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>Interest</label>
          <select value={f.interest_level} onChange={set("interest_level")} style={S.inp}>
            {["High", "Medium", "Low"].map(i => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={S.lbl}>Callback Date {needsCB ? <span style={{ color: C.red }}>*Required</span> : <span style={{ color: C.muted }}>(Optional)</span>}</label>
          <input type="date" value={f.callback_date} onChange={set("callback_date")} style={{ ...S.inp, border: needsCB && !f.callback_date ? `1px solid ${C.red}` : `1px solid ${C.border}` }} />
        </div>
        <div style={{ gridColumn: "span 2" }}><label style={S.lbl}>Notes</label><input value={f.notes} onChange={set("notes")} style={S.inp} placeholder="Key points from the call..." /></div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <Btn onClick={save} disabled={saving || !ok} style={{ flex: 1, padding: 12 }}>{saving ? "Saving..." : "Save Call"}</Btn>
        <Btn onClick={onClose} color="transparent" textColor={C.text} outline style={{ flex: 1, padding: 12 }}>Cancel</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// BULK CLEAR MODAL
// ═══════════════════════════════════════════════════════════
function ClearModal({ agentName, promoName, pending, onClose, onDone, toast }) {
  const [tf, setTf] = useState("all");
  const [clearing, setClearing] = useState(false);

  const preview = useMemo(() => {
    if (tf === "all") return pending;
    const now = new Date();
    const cut = new Date(now);
    if (tf === "1h") cut.setHours(cut.getHours() - 1);
    else if (tf === "24h") cut.setHours(cut.getHours() - 24);
    else if (tf === "7d") cut.setDate(cut.getDate() - 7);
    return pending.filter(l => l.assigned_at && new Date(l.assigned_at) >= cut);
  }, [pending, tf]);

  function getSince() {
    if (tf === "all") return null;
    const now = new Date();
    if (tf === "1h") { now.setHours(now.getHours() - 1); return now.toISOString(); }
    if (tf === "24h") { now.setHours(now.getHours() - 24); return now.toISOString(); }
    if (tf === "7d") { now.setDate(now.getDate() - 7); return now.toISOString(); }
    return null;
  }

  async function go() {
    if (!preview.length) return;
    if (!window.confirm(`Delete ${preview.length} pending leads for ${agentName} on "${promoName}"?\n\nAlready-called contacts are SAFE.`)) return;
    setClearing(true);
    try { await db.clearPending(agentName, promoName, getSince()); toast(`Cleared ${preview.length} leads`); onDone(); onClose(); }
    catch { toast("Error clearing.", "error"); }
    finally { setClearing(false); }
  }

  return (
    <Modal title="🗑️ Clear Queue — Safety Controls" onClose={onClose} width={500}>
      <div style={{ background: C.red + "11", border: `1px solid ${C.red}33`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ color: C.red, fontWeight: 700, marginBottom: 6 }}>⚠️ Only Pending Leads Are Affected</div>
        <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Leads already called (status = "Contacted") will NOT be deleted. Their call logs and notes are fully preserved.</div>
      </div>
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
        {[["Agent", agentName, C.brand], ["Campaign", promoName, C.text], ["Total Pending", `${pending.length} leads`, C.yellow]].map(([l, v, c]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{l}</span>
            <span style={{ color: c, fontWeight: 700 }}>{v}</span>
          </div>
        ))}
      </div>
      <label style={S.lbl}>Time Window (surgical undo)</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        {[["all", "All Pending", C.red], ["1h", "Last 1 Hour", C.yellow], ["24h", "Last 24 Hours", C.yellow], ["7d", "Last 7 Days", C.muted]].map(([v, l, c]) => (
          <button key={v} onClick={() => setTf(v)} style={{ background: tf === v ? c + "22" : C.bg, border: `1px solid ${tf === v ? c : C.border}`, color: tf === v ? c : C.muted, borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}>{l}</button>
        ))}
      </div>
      <div style={{ background: preview.length ? C.red + "11" : "#052e16", border: `1px solid ${preview.length ? C.red + "33" : C.green + "33"}`, borderRadius: 8, padding: 14, textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 28, color: preview.length ? C.red : C.green }}>{preview.length}</div>
        <div style={{ color: C.muted, fontSize: 13 }}>leads will be deleted</div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={go} disabled={clearing || !preview.length} style={{ flex: 1, background: preview.length ? C.red : C.border, color: preview.length ? C.text : C.muted, border: "none", borderRadius: 8, padding: 12, fontWeight: 700, cursor: preview.length ? "pointer" : "not-allowed", fontSize: 14 }}>
          {clearing ? "Clearing..." : `Delete ${preview.length} Leads`}
        </button>
        <Btn onClick={onClose} color="transparent" textColor={C.text} outline style={{ flex: 1, padding: 12 }}>Cancel</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN DETAIL
// ═══════════════════════════════════════════════════════════
function CampaignDetail({ campaign, contacts, calls, agents, onBack, onRefresh, toast }) {
  const [agView, setAgView] = useState(null);
  const [clearTarget, setClearTarget] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const cc = contacts.filter(c => c.assigned_promo === campaign.name);
  const cl = calls.filter(c => c.promo_name === campaign.name);
  const ags = agents.filter(a => cc.some(c => c.assigned_agent === a.name));

  const agLeads = agView ? cc.filter(c => c.assigned_agent === agView.name) : [];
  const filtered = agLeads.filter(l =>
    (l.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.phone || "").includes(search) ||
    (l.customer_type || "").toLowerCase().includes(search.toLowerCase())
  );

  const tog = id => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function delSel() {
    if (!window.confirm(`Delete ${sel.size} leads?`)) return;
    setBusy(true);
    try { await db.removeMany("contacts", [...sel]); toast(`Deleted ${sel.size} leads`); setSel(new Set()); onRefresh(); }
    catch { toast("Error.", "error"); } finally { setBusy(false); }
  }

  async function delOne(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await db.remove("contacts", id); toast("Lead deleted."); onRefresh(); }
    catch { toast("Error.", "error"); }
  }

  // FIX: Undo Last Hour logic added here
  async function undoLastHourUpload() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    // Find leads for this campaign added in last hour (using assigned_at if available, else created_at)
    const recentLeads = cc.filter(c => new Date(c.assigned_at || c.created_at) > oneHourAgo);

    if (recentLeads.length === 0) {
      toast("No leads were added to this campaign in the last 60 minutes.", "error");
      return;
    }

    if (!window.confirm(`⚠️ UNDO UPLOAD: This will permanently delete ${recentLeads.length} leads assigned to ${campaign.name} in the last hour. Proceed?`)) return;

    try {
      await db.removeMany("contacts", recentLeads.map(c => c.id));
      toast(`Successfully removed ${recentLeads.length} recent leads.`);
      onRefresh();
    } catch (err) {
      toast("Error removing leads.", "error");
    }
  }

  // ── AGENT LEAD VIEW ──
  if (agView) {
    const pending = agLeads.filter(l => l.lead_status === "Pending");
    const contacted = agLeads.filter(l => l.lead_status === "Contacted");
    return (
      <div>
        <button onClick={() => { setAgView(null); setSel(new Set()); setSearch(""); }} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 16px", marginBottom: 24, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          ← Back to {campaign.name}
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Av name={agView.name} size={52} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{agView.name}'s Leads</div>
              <div style={{ color: C.muted, fontSize: 13 }}>Campaign: <span style={{ color: C.brand, fontWeight: 600 }}>{campaign.name}</span></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn color="#27272a" textColor={C.text} onClick={() => exportCSV(agLeads.map(l => ({ name: l.name, phone: l.phone, customer_type: l.customer_type, priority: l.priority, status: l.lead_status, assigned_at: l.assigned_at })), `${agView.name}_leads.csv`)}>⬇ Export</Btn>
            {pending.length > 0 && (
              <button onClick={() => setClearTarget({ agentName: agView.name, promoName: campaign.name, pending })}
                style={{ background: C.red + "18", border: `1px solid ${C.red}44`, color: C.red, borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                🗑️ Clear Queue ({pending.length})
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
          <StatCard label="Total" value={agLeads.length} />
          <StatCard label="Pending" value={pending.length} accent={C.yellow} />
          <StatCard label="Contacted" value={contacted.length} accent={C.green} />
          <StatCard label="Calls Logged" value={cl.filter(c => c.agent_name === agView.name).length} accent={C.brand} />
        </div>

        {sel.size > 0 && (
          <div style={{ background: C.brand + "18", border: `1px solid ${C.brand}44`, borderRadius: 10, padding: "12px 20px", marginBottom: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ color: C.brand, fontWeight: 700 }}>{sel.size} selected</span>
            <div style={{ flex: 1 }} />
            <button onClick={delSel} disabled={busy} style={{ background: C.red + "22", border: `1px solid ${C.red}44`, color: C.red, borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              {busy ? "Deleting..." : `🗑️ Delete ${sel.size}`}
            </button>
            <Btn onClick={() => setSel(new Set())} color="#27272a" textColor={C.text} style={{ padding: "8px 14px" }}>Clear</Btn>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search leads..." style={{ ...S.inp, maxWidth: 340 }} />
          <span style={{ color: C.muted, fontSize: 13 }}>{filtered.length} leads</span>
        </div>

        <DataTable headers={["", "Name", "Phone", "Customer Type", "Priority", "Status", "Assigned At", ""]}>
          {filtered.length === 0 && <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: C.muted, padding: 50 }}>No leads.</td></tr>}
          {filtered.map(l => (
            <TR key={l.id} selected={sel.has(l.id)}>
              <td style={{ ...S.td, width: 44 }}><input type="checkbox" checked={sel.has(l.id)} onChange={() => tog(l.id)} style={{ cursor: "pointer" }} /></td>
              <td style={S.td}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Av name={l.name} size={28} /><span style={{ fontWeight: 600 }}>{l.name}</span></div></td>
              <td style={{ ...S.td, color: C.muted }}>{l.phone || "—"}</td>
              <td style={{ ...S.td, color: C.muted }}>{l.customer_type || "—"}</td>
              <td style={{ ...S.td, color: C.muted }}>{l.priority || "—"}</td>
              <td style={S.td}><Badge label={l.lead_status || "Pending"} color={l.lead_status === "Contacted" ? C.green : l.lead_status === "Converted" ? C.brand : C.yellow} /></td>
              <td style={{ ...S.td, color: C.muted, fontSize: 12 }}>{l.assigned_at ? new Date(l.assigned_at).toLocaleString() : "—"}</td>
              <td style={S.td}><button onClick={() => delOne(l.id, l.name)} style={{ background: C.red + "18", border: `1px solid ${C.red}33`, color: C.red, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Del</button></td>
            </TR>
          ))}
        </DataTable>

        {clearTarget && <ClearModal {...clearTarget} onClose={() => setClearTarget(null)} onDone={() => { onRefresh(); setAgView(null); }} toast={toast} />}
      </div>
    );
  }

  // ── CAMPAIGN OVERVIEW ──
  const pitched = cl.length;
  const converted = cl.filter(c => c.outcome === "Converted").length;
  const rate = pitched ? Math.round((converted / pitched) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <button onClick={onBack} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 16px", marginBottom: 24, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>← Back to Campaigns</button>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{campaign.name}</div>
          <Badge label={campaign.status} color={campaign.status === "Active" ? C.green : C.subtle} />
        </div>
        {campaign.description && <div style={{ color: C.muted }}>{campaign.description}</div>}
        
        {/* FIX: Undo Last Hour Upload button injected here */}
        <div style={{ marginTop: 12 }}>
          <Btn onClick={undoLastHourUpload} color={C.yellow + "22"} textColor={C.yellow} outline style={{ border: `1px solid ${C.yellow}44` }}>
            ↩ Undo Last Hour Upload
          </Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
        <StatCard label="Total Assigned" value={cc.length} />
        <StatCard label="Pending" value={cc.filter(c => c.lead_status === "Pending").length} accent={C.yellow} />
        <StatCard label="Contacted" value={cc.filter(c => c.lead_status === "Contacted").length} accent={C.green} />
        <StatCard label="Calls" value={pitched} accent={C.brand} />
        <StatCard label="Conversions" value={converted} accent={C.green} />
        <StatCard label="Win Rate" value={rate + "%"} accent={C.purple} />
      </div>

      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>Agent Breakdown</div>

      {ags.length === 0 ? (
        <Card><div style={{ textAlign: "center", color: C.muted, padding: 40 }}>No agents assigned yet. Use "Import Leads" to assign contacts.</div></Card>
      ) : ags.map(a => {
        const al = cc.filter(c => c.assigned_agent === a.name);
        const ap = al.filter(l => l.lead_status === "Pending");
        const ac = al.filter(l => l.lead_status === "Contacted");
        const acl = cl.filter(c => c.agent_name === a.name);
        const aw = acl.filter(c => c.outcome === "Converted").length;
        const prog = al.length ? Math.round((ac.length / al.length) * 100) : 0;

        return (
          <div key={a.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
              <Av name={a.name} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{a.name}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{a.role}</div>
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[["Assigned", al.length, C.text], ["Pending", ap.length, C.yellow], ["Contacted", ac.length, C.green], ["Calls", acl.length, C.brand], ["Wins", aw, C.purple]].map(([l, v, c]) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div style={{ color: c, fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{v}</div>
                    <div style={{ color: C.muted, fontSize: 10, fontWeight: 600, marginTop: 3 }}>{l.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setAgView(a)} style={{ background: C.brand + "22", border: `1px solid ${C.brand}44`, color: C.brand, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  View {al.length} Leads →
                </button>
                {ap.length > 0 && (
                  <button onClick={() => setClearTarget({ agentName: a.name, promoName: campaign.name, pending: ap })}
                    style={{ background: C.red + "18", border: `1px solid ${C.red}33`, color: C.red, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                    🗑️ Clear Queue
                  </button>
                )}
              </div>
            </div>
            <ProgBar value={prog} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: C.muted }}>
              <span>{prog}% contacted</span><span>{ac.length}/{al.length}</span>
            </div>
          </div>
        );
      })}

      {clearTarget && <ClearModal {...clearTarget} onClose={() => setClearTarget(null)} onDone={onRefresh} toast={toast} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CALLBACKS TAB
// ═══════════════════════════════════════════════════════════
function CallbacksTab({ calls, isAdmin, onRefresh, toast }) {
  const [showDone, setShowDone] = useState(false);
  const pending = calls.filter(c => c.callback_date && !c.callback_done);
  const done = calls.filter(c => c.callback_done);

  async function markDone(id) {
    try { await db.update("call_logs", id, { callback_done: true }); toast("Done ✓"); onRefresh(); }
    catch { toast("Error.", "error"); }
  }

  const list = showDone ? done : pending;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Callbacks & Follow-ups</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{pending.length} pending · {done.length} completed</div>
        </div>
        <div style={{ display: "flex", background: C.bg, borderRadius: 8, padding: 4, border: `1px solid ${C.border}` }}>
          {[["Pending", false], ["Completed", true]].map(([l, v]) => (
            <button key={l} onClick={() => setShowDone(v)} style={{ padding: "7px 16px", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, background: showDone === v ? C.card : "transparent", color: showDone === v ? C.text : C.muted }}>{l}</button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 80, border: `1px dashed ${C.border}` }}>
          <div style={{ color: C.muted, fontSize: 15 }}>{showDone ? "No completed callbacks." : "🎉 All caught up!"}</div>
        </Card>
      ) : list.map(c => (
        <div key={c.id} style={{ background: C.card, border: `1px solid ${showDone ? C.border : C.yellow + "44"}`, borderLeft: `4px solid ${showDone ? C.green : C.yellow}`, borderRadius: 12, padding: "18px 24px", marginBottom: 12, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ background: (showDone ? C.green : C.yellow) + "18", borderRadius: 10, padding: "10px 14px", textAlign: "center", minWidth: 56 }}>
            <div style={{ color: showDone ? C.green : C.yellow, fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{c.callback_date?.slice(8)}</div>
            <div style={{ color: C.muted, fontSize: 10 }}>{c.callback_date?.slice(5, 7)}/{c.callback_date?.slice(0, 4)}</div>
          </div>
          <Av name={c.contact_name} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{c.contact_name}</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
              {isAdmin && <span style={{ color: C.brand, fontWeight: 600, marginRight: 8 }}>{c.agent_name}</span>}
              {c.promo_name}
            </div>
            {c.notes && <div style={{ color: C.muted, fontSize: 12, marginTop: 6, fontStyle: "italic" }}>"{c.notes}"</div>}
          </div>
          {!showDone && <button onClick={() => markDone(c.id)} style={{ background: "#052e16", color: C.green, border: `1px solid ${C.green}44`, borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer" }}>✓ Done</button>}
          {showDone && <Badge label="Completed" color={C.green} />}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AGENT PAGE
// ═══════════════════════════════════════════════════════════
function AgentPage({ user, contacts, calls, agents, promos, onRefresh, onLogout, toast }) {
  const [tab, setTab] = useState("queue");
  const [logLead, setLogLead] = useState(null);
  const [logOpen, setLogOpen] = useState(false);

  const mine = calls.filter(c => c.agent_name === user.name);
  const myWins = mine.filter(c => c.outcome === "Converted").length;
  const myPending = mine.filter(c => c.callback_date && !c.callback_done);
  const myRate = mine.length ? Math.round((myWins / mine.length) * 100) : 0;
  const myLeads = contacts.filter(c => c.assigned_agent === user.name && c.lead_status !== "Contacted" && !c.dnc);
  const myOC = Object.keys(OC).map(o => ({ name: o, count: mine.filter(c => c.outcome === o).length })).filter(o => o.count > 0);

  // FIX: Directory removed from TABS
  const TABS = [
    { key: "queue", label: `My Queue (${myLeads.length})` },
    { key: "stats", label: "My Stats" },
    { key: "callbacks", label: `Callbacks${myPending.length > 0 ? ` (${myPending.length})` : ""}` },
    { key: "allcalls", label: "Team Activity" },
  ];

  function Nav() {
    return (
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "center", height: 60, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 32 }}>
          <div style={{ background: C.brand, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📞</div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Tanishq CRM</span>
        </div>
        <div style={{ display: "flex", gap: 2, flex: 1, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ background: "none", border: "none", color: tab === t.key ? C.text : C.muted, borderBottom: tab === t.key ? `2px solid ${C.brand}` : "2px solid transparent", padding: "0 16px", height: 60, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* FIX: Manual Refresh Button added */}
          <Btn onClick={onRefresh} color="#27272a" textColor={C.text}>🔄 Refresh</Btn>
          <button onClick={() => setLogOpen(true)} style={{ background: C.text, color: C.bg, border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Log Call</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, borderLeft: `1px solid ${C.border}`, paddingLeft: 16 }}>
            <Av name={user.name} size={30} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</span>
            <button onClick={onLogout} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer" }}>Logout</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Nav />
      <div style={{ padding: "32px 36px", maxWidth: 1280, margin: "0 auto" }}>

        {tab === "queue" && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>My Action Queue</div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Contacts assigned to you. Log an outcome to clear them.</div>
            {myLeads.length === 0
              ? <Card style={{ textAlign: "center", padding: 80, border: `1px dashed ${C.border}` }}><div style={{ color: C.muted, fontSize: 15 }}>🎉 Queue empty!</div></Card>
              : myLeads.map(l => (
                <div key={l.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.brand}`, borderRadius: 12, padding: "18px 24px", marginBottom: 14, display: "flex", alignItems: "center", gap: 20 }}>
                  <Av name={l.name} size={46} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>{l.name}</div>
                    <div style={{ color: C.muted, fontSize: 13, marginTop: 4, display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <span>📱 <span style={{ color: C.text, fontWeight: 600 }}>{l.phone || "No phone"}</span></span>
                      {l.customer_type && <span>🏢 {l.customer_type}</span>}
                      {l.priority && <span>⭐ {l.priority}</span>}
                    </div>
                    {l.assigned_promo && <div style={{ marginTop: 8 }}><Badge label={`Campaign: ${l.assigned_promo}`} color={C.brand} /></div>}
                  </div>
                  <button onClick={() => setLogLead(l)} style={{ background: "#052e16", color: C.green, border: `1px solid ${C.green}44`, borderRadius: 8, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>📞 Dial & Log</button>
                </div>
              ))}
          </div>
        )}

        {tab === "stats" && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>My Performance</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
              <StatCard label="Total Calls" value={mine.length} />
              <StatCard label="Conversions" value={myWins} accent={C.green} />
              <StatCard label="Win Rate" value={myRate + "%"} accent={C.purple} />
              <StatCard label="Callbacks" value={myPending.length} accent={C.yellow} />
            </div>
            {myOC.length > 0 && (
              <Card style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Outcome Breakdown</div>
                {myOC.map(o => (
                  <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                    <div style={{ width: 140, color: C.muted, fontSize: 13 }}>{o.name}</div>
                    <div style={{ flex: 1 }}><ProgBar value={(o.count / mine.length) * 100} color={OC[o.name]} /></div>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 600, width: 24, textAlign: "right" }}>{o.count}</div>
                  </div>
                ))}
              </Card>
            )}
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Recent Activity</div>
            <DataTable headers={["Contact", "Date", "Campaign", "Dur", "Outcome", "Interest", "Notes"]}>
              {mine.length === 0 && <tr><td colSpan={7} style={{ ...S.td, color: C.muted, textAlign: "center", padding: 50 }}>No calls yet.</td></tr>}
              {mine.slice(0, 20).map(c => (
                <TR key={c.id}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{c.contact_name}</td>
                  <td style={{ ...S.td, color: C.muted }}>{c.call_date}</td>
                  <td style={S.td}>{c.promo_name}</td>
                  <td style={{ ...S.td, color: C.muted, textAlign: "center" }}>{c.duration_minutes ? c.duration_minutes + "m" : "—"}</td>
                  <td style={S.td}><Badge label={c.outcome} color={OC[c.outcome] || C.muted} /></td>
                  <td style={S.td}><Badge label={c.interest_level} color={c.interest_level === "High" ? C.green : c.interest_level === "Medium" ? C.yellow : C.muted} /></td>
                  <td style={{ ...S.td, color: C.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</td>
                </TR>
              ))}
            </DataTable>
          </div>
        )}

        {tab === "callbacks" && <CallbacksTab calls={mine} isAdmin={false} onRefresh={onRefresh} toast={toast} />}

        {tab === "allcalls" && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Team Activity</div>
            <DataTable headers={["Contact", "Date", "Agent", "Campaign", "Outcome", "Notes"]}>
              {calls.length === 0 && <tr><td colSpan={6} style={{ ...S.td, color: C.muted, textAlign: "center", padding: 50 }}>No activity yet.</td></tr>}
              {calls.slice(0, 50).map(c => (
                <TR key={c.id}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{c.contact_name}</td>
                  <td style={{ ...S.td, color: C.muted }}>{c.call_date}</td>
                  <td style={S.td}><Badge label={c.agent_name} color={c.agent_name === user.name ? C.brand : C.subtle} /></td>
                  <td style={S.td}>{c.promo_name}</td>
                  <td style={S.td}><Badge label={c.outcome} color={OC[c.outcome] || C.muted} /></td>
                  <td style={{ ...S.td, color: C.muted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</td>
                </TR>
              ))}
            </DataTable>
          </div>
        )}
      </div>

      {logOpen && <LogCallModal contacts={contacts} promos={promos} agents={agents} defaultAgent={user.name} prefill={null} onClose={() => setLogOpen(false)} onDone={onRefresh} toast={toast} />}
      {logLead && <LogCallModal contacts={contacts} promos={promos} agents={agents} defaultAgent={user.name} prefill={logLead} onClose={() => setLogLead(null)} onDone={onRefresh} toast={toast} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN PAGE
// ═══════════════════════════════════════════════════════════
function AdminPage({ contacts, calls, agents, promos, onRefresh, onLogout, toast }) {
  const [tab, setTab] = useState("dashboard");
  const [logOpen, setLogOpen] = useState(false);
  const [campDetail, setCampDetail] = useState(null);
  const [agentInspect, setAgentInspect] = useState(null);

  // Promo CRUD
  const [pModal, setPModal] = useState(null);
  const [pSel, setPSel] = useState(null);
  const [pForm, setPForm] = useState({ name: "", description: "", status: "Active", start_date: "", end_date: "", target_audience: "All" });

  // Agent CRUD
  const [aModal, setAModal] = useState(null);
  const [aSel, setASel] = useState(null);
  const [aForm, setAForm] = useState({ name: "", role: "Agent", phone_ext: "", pin: "", status: "Active" });

  // Call filters
  const [fAgent, setFA] = useState("");
  const [fOutcome, setFO] = useState("");
  const [fPromo, setFP] = useState("");
  const [fSearch, setFS] = useState("");

  // Import
  const [impModal, setImpModal] = useState(false);
  const [impAgent, setIA] = useState("");
  const [impPromo, setIP] = useState("");
  const [csv, setCsv] = useState([]);
  const [importing, setImporting] = useState(false);

  const conversions = calls.filter(c => c.outcome === "Converted").length;
  const convRate = calls.length ? Math.round((conversions / calls.length) * 100) : 0;
  const cbPending = calls.filter(c => c.callback_date && !c.callback_done);
  const activePromos = promos.filter(p => p.status === "Active");

  const agStats = agents.map(a => ({
    ...a,
    total: calls.filter(c => c.agent_name === a.name).length,
    converted: calls.filter(c => c.agent_name === a.name && c.outcome === "Converted").length,
  })).sort((a, b) => b.converted - a.converted);

  const ocCounts = Object.keys(OC).map(o => ({ name: o, count: calls.filter(c => c.outcome === o).length })).filter(o => o.count > 0);

  const filteredCalls = useMemo(() => calls.filter(c => {
    if (fAgent && c.agent_name !== fAgent) return false;
    if (fOutcome && c.outcome !== fOutcome) return false;
    if (fPromo && c.promo_name !== fPromo) return false;
    if (fSearch && !c.contact_name?.toLowerCase().includes(fSearch.toLowerCase()) && !c.notes?.toLowerCase().includes(fSearch.toLowerCase())) return false;
    return true;
  }), [calls, fAgent, fOutcome, fPromo, fSearch]);

  // FIX: Directory removed from TABS
  const TABS = [
    { key: "dashboard", label: "Dashboard" },
    { key: "campaigns", label: "Campaigns" },
    { key: "agents", label: "Team" },
    { key: "calls", label: "Call Logs" },
    { key: "callbacks", label: `Callbacks${cbPending.length > 0 ? ` (${cbPending.length})` : ""}` },
  ];

  // Promo CRUD
  async function savePromo() {
    if (!pForm.name) return;
    try {
      pSel ? await db.update("promotions", pSel.id, pForm) : await db.insert("promotions", pForm);
      toast(pSel ? "Campaign updated ✓" : "Campaign created ✓");
      setPModal(null); setPSel(null); onRefresh();
    } catch { toast("Error.", "error"); }
  }
  async function delPromo(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await db.remove("promotions", id); toast("Deleted.", "error"); onRefresh(); }
    catch { toast("Error.", "error"); }
  }
  function editPromo(p) { setPSel(p); setPForm({ name: p.name, description: p.description || "", status: p.status, start_date: p.start_date || "", end_date: p.end_date || "", target_audience: p.target_audience || "All" }); setPModal("edit"); }

  // Agent CRUD
  async function saveAgent() {
    if (!aForm.name || !aForm.pin) return;
    try {
      aSel ? await db.update("agents", aSel.id, aForm) : await db.insert("agents", aForm);
      toast(aSel ? "Agent updated ✓" : "Agent added ✓");
      setAModal(null); setASel(null); onRefresh();
    } catch { toast("Error.", "error"); }
  }
  async function delAgent(id, name) {
    if (!window.confirm(`Remove "${name}"?`)) return;
    try { await db.remove("agents", id); toast("Removed.", "error"); onRefresh(); }
    catch { toast("Error.", "error"); }
  }
  function editAgent(a) { setASel(a); setAForm({ name: a.name, role: a.role || "Agent", phone_ext: a.phone_ext || "", pin: a.pin || "", status: a.status || "Active" }); setAModal("edit"); }

  // CSV Import
  function parseCSV(e) {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      const lines = ev.target.result.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast("CSV empty.", "error"); return; }
      const hdrs = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
      const data = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
        const obj = {}; hdrs.forEach((h, i) => obj[h] = vals[i] || ""); return obj;
      });
      setCsv(data);
    };
    r.readAsText(file);
  }

  async function doImport() {
    if (!impAgent || !impPromo || !csv.length) return;
    setImporting(true);
    const now = new Date().toISOString();
    try {
      await Promise.all(csv.map(row => db.insert("contacts", {
        name: row.name || "Unknown", phone: row.phone || "",
        customer_type: row.customer_type || "", priority: row.priority || "",
        category: "Business", dnc: false,
        assigned_agent: impAgent, assigned_promo: impPromo,
        lead_status: "Pending", assigned_at: now
      })));
      toast(`✓ Imported ${csv.length} leads to ${impAgent}`);
      setImpModal(false); setCsv([]); setIA(""); setIP(""); onRefresh();
    } catch { toast("Import error.", "error"); }
    finally { setImporting(false); }
  }

  function Nav() {
    return (
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "center", height: 60, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 28 }}>
          <div style={{ background: C.brand, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📞</div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Tanishq CRM</span>
          <Badge label="ADMIN" color={C.brand} />
        </div>
        <div style={{ display: "flex", gap: 0, flex: 1, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setCampDetail(null); setAgentInspect(null); }} style={{ background: "none", border: "none", color: tab === t.key ? C.text : C.muted, borderBottom: tab === t.key ? `2px solid ${C.brand}` : "2px solid transparent", padding: "0 16px", height: 60, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* FIX: Manual Refresh Button added */}
          <Btn onClick={onRefresh} color="#27272a" textColor={C.text}>🔄 Refresh</Btn>
          <button onClick={() => setLogOpen(true)} style={{ background: C.text, color: C.bg, border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Log Call</button>
          <button onClick={onLogout} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Nav />
      <div style={{ padding: "32px 36px", maxWidth: 1280, margin: "0 auto" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Command Center</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
              <StatCard label="Contacts" value={contacts.length} />
              <StatCard label="Total Calls" value={calls.length} accent={C.brand} />
              <StatCard label="Conversions" value={conversions} accent={C.green} />
              <StatCard label="Win Rate" value={convRate + "%"} accent={C.purple} />
              <StatCard label="Callbacks" value={cbPending.length} accent={C.yellow} />
              <StatCard label="Active Campaigns" value={activePromos.length} accent="#f97316" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Outcome Distribution</div>
                {ocCounts.length === 0 && <div style={{ color: C.muted }}>No calls yet.</div>}
                {ocCounts.map(o => (
                  <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                    <div style={{ width: 140, color: C.muted, fontSize: 12 }}>{o.name}</div>
                    <div style={{ flex: 1 }}><ProgBar value={(o.count / calls.length) * 100} color={OC[o.name]} /></div>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 600, width: 28, textAlign: "right" }}>{o.count}</div>
                  </div>
                ))}
              </Card>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Agent Leaderboard</div>
                {agStats.map((a, i) => {
                  const rate = a.total ? Math.round((a.converted / a.total) * 100) : 0;
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                      <div style={{ color: i === 0 ? C.brand : C.subtle, fontWeight: 800, fontSize: 15, width: 24 }}>#{i + 1}</div>
                      <Av name={a.name} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                        <div style={{ color: C.muted, fontSize: 11 }}>{a.total} calls · {rate}% win</div>
                      </div>
                      <Badge label={`${a.converted} wins`} color={C.green} />
                    </div>
                  );
                })}
              </Card>
            </div>

            {cbPending.length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.yellow}33`, borderLeft: `4px solid ${C.yellow}`, borderRadius: 12, padding: 20 }}>
                <div style={{ color: C.yellow, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>🔔 {cbPending.length} Pending Callback{cbPending.length !== 1 ? "s" : ""}</div>
                {cbPending.slice(0, 4).map(c => (
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
          campDetail ? (
            <CampaignDetail campaign={campDetail} contacts={contacts} calls={calls} agents={agents} onBack={() => setCampDetail(null)} onRefresh={onRefresh} toast={toast} />
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>Campaign Management</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn onClick={() => setImpModal(true)} color="#052e16" textColor={C.green} outline>📥 Import Leads</Btn>
                  <Btn onClick={() => { setPSel(null); setPForm({ name: "", description: "", status: "Active", start_date: "", end_date: "", target_audience: "All" }); setPModal("add"); }}>+ New Campaign</Btn>
                </div>
              </div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Click a card to see agent breakdown and manage leads</div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
                {promos.map(p => {
                  const pc = calls.filter(c => c.promo_name === p.name).length;
                  const cv = calls.filter(c => c.promo_name === p.name && c.outcome === "Converted").length;
                  const rt = pc ? Math.round((cv / pc) * 100) : 0;
                  const asgd = contacts.filter(c => c.assigned_promo === p.name);
                  const ctd = asgd.filter(c => c.lead_status === "Contacted");
                  const pend = asgd.filter(c => c.lead_status === "Pending");
                  const prog = asgd.length ? Math.round((ctd.length / asgd.length) * 100) : 0;
                  const campAgents = [...new Set(asgd.map(c => c.assigned_agent).filter(Boolean))];

                  return (
                    <div key={p.id} style={{ background: C.card, border: `1px solid ${p.status === "Active" ? C.green + "44" : C.border}`, borderRadius: 12, overflow: "hidden", transition: "transform .15s, border-color .15s", cursor: "default" }}
                      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>

                      <div onClick={() => setCampDetail(p)} style={{ padding: 22, cursor: "pointer" }}>
                        {p.status === "Active" && <div style={{ height: 3, background: C.green, margin: "-22px -22px 18px" }} />}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, flex: 1, marginRight: 10 }}>{p.name}</div>
                          <Badge label={p.status} color={p.status === "Active" ? C.green : C.subtle} />
                        </div>
                        {p.description && <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>{p.description}</div>}

                        {campAgents.length > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                            <span style={{ color: C.muted, fontSize: 11, fontWeight: 600 }}>AGENTS:</span>
                            {campAgents.slice(0, 5).map(n => (
                              <div key={n} title={n} style={{ background: C.brand + "33", border: `2px solid ${C.brand}`, borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.brand }}>{n[0]}</div>
                            ))}
                            {campAgents.length > 5 && <span style={{ color: C.muted, fontSize: 12 }}>+{campAgents.length - 5}</span>}
                          </div>
                        )}

                        {asgd.length > 0 && (
                          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 8 }}>
                              <span style={{ fontWeight: 600 }}>Lead Progress</span>
                              <span style={{ color: C.text, fontWeight: 700 }}>{ctd.length}/{asgd.length}</span>
                            </div>
                            <ProgBar value={prog} />
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: C.muted, fontWeight: 700 }}>
                              <span>{prog}% contacted</span>
                              <span style={{ color: C.yellow }}>{pend.length} pending</span>
                            </div>
                          </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                          {[["CALLS", pc, C.yellow], ["CONVERTED", cv, C.green], ["WIN RATE", rt + "%", C.purple]].map(([l, v, c]) => (
                            <div key={l} style={{ textAlign: "center" }}>
                              <div style={{ color: c, fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{v}</div>
                              <div style={{ color: C.muted, fontSize: 10, fontWeight: 600, marginTop: 4 }}>{l}</div>
                            </div>
                          ))}
                        </div>

                        <div style={{ color: C.brand, fontSize: 12, fontWeight: 700, textAlign: "center", marginTop: 12, padding: "6px", background: C.brand + "11", borderRadius: 6 }}>
                          Click to view agent breakdown →
                        </div>
                      </div>

                      <div style={{ display: "flex", borderTop: `1px solid ${C.border}` }}>
                        <button onClick={e => { e.stopPropagation(); editPromo(p); }} style={{ flex: 1, background: "#27272a", border: "none", color: C.text, padding: 10, cursor: "pointer", fontSize: 12, fontWeight: 600, borderRight: `1px solid ${C.border}` }}>Edit</button>
                        <button onClick={e => { e.stopPropagation(); delPromo(p.id, p.name); }} style={{ flex: 1, background: C.red + "18", border: "none", color: C.red, padding: 10, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* ── TEAM ── */}
        {tab === "agents" && (
          <div>
            {!agentInspect ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>Team Management</div>
                  <Btn onClick={() => { setASel(null); setAForm({ name: "", role: "Agent", phone_ext: "", pin: "", status: "Active" }); setAModal("add"); }}>+ Add Agent</Btn>
                </div>
                <DataTable headers={["Agent", "Role", "PIN", "Calls", "Conversions", "Win Rate", "Status", "Actions"]}>
                  {agStats.map(a => {
                    const rate = a.total ? Math.round((a.converted / a.total) * 100) : 0;
                    return (
                      <TR key={a.id}>
                        <td style={S.td}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Av name={a.name} /><div><div style={{ fontWeight: 600 }}>{a.name}</div><div style={{ color: C.muted, fontSize: 11 }}>Ext: {a.phone_ext || "—"}</div></div></div></td>
                        <td style={{ ...S.td, color: C.muted }}>{a.role}</td>
                        <td style={{ ...S.td, fontFamily: "monospace", letterSpacing: 2, color: C.subtle }}>{a.pin || "—"}</td>
                        <td style={{ ...S.td, textAlign: "center", fontWeight: 600 }}>{a.total}</td>
                        <td style={{ ...S.td, textAlign: "center", color: C.green, fontWeight: 600 }}>{a.converted}</td>
                        <td style={{ ...S.td, textAlign: "center", color: C.purple, fontWeight: 600 }}>{rate}%</td>
                        <td style={S.td}><Badge label={a.status} color={a.status === "Active" ? C.green : C.yellow} /></td>
                        <td style={S.td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => setAgentInspect(a)} style={{ background: C.brand + "22", border: `1px solid ${C.brand}33`, color: C.brand, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Inspect</button>
                            <button onClick={() => editAgent(a)} style={{ background: "#27272a", border: "none", color: C.text, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>Edit</button>
                            <button onClick={() => delAgent(a.id, a.name)} style={{ background: C.red + "18", border: `1px solid ${C.red}33`, color: C.red, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>Remove</button>
                          </div>
                        </td>
                      </TR>
                    );
                  })}
                </DataTable>
              </div>
            ) : (
              // Agent Inspect — workload by campaign
              <div>
                <button onClick={() => setAgentInspect(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 16px", marginBottom: 24, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>← Back to Team</button>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
                  <Av name={agentInspect.name} size={60} />
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 800 }}>{agentInspect.name}</div>
                    <div style={{ color: C.muted, fontSize: 14 }}>{agentInspect.role} · Supervisory View</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
                  <StatCard label="Total Calls" value={calls.filter(c => c.agent_name === agentInspect.name).length} />
                  <StatCard label="Conversions" value={calls.filter(c => c.agent_name === agentInspect.name && c.outcome === "Converted").length} accent={C.green} />
                  <StatCard label="Pending CBs" value={calls.filter(c => c.agent_name === agentInspect.name && c.callback_date && !c.callback_done).length} accent={C.yellow} />
                  <StatCard label="Assigned Leads" value={contacts.filter(c => c.assigned_agent === agentInspect.name).length} accent={C.purple} />
                </div>

                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>Workload by Campaign</div>
                {promos.map(p => {
                  const al = contacts.filter(c => c.assigned_agent === agentInspect.name && c.assigned_promo === p.name);
                  if (!al.length) return null;
                  const pnd = al.filter(l => l.lead_status === "Pending");
                  const ctd = al.filter(l => l.lead_status === "Contacted");
                  const acl = calls.filter(c => c.agent_name === agentInspect.name && c.promo_name === p.name);
                  const prog = al.length ? Math.round((ctd.length / al.length) * 100) : 0;

                  return (
                    <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                          <div style={{ color: C.muted, fontSize: 12 }}>{al.length} leads assigned</div>
                        </div>
                        <div style={{ display: "flex", gap: 20 }}>
                          {[["Pending", pnd.length, C.yellow], ["Contacted", ctd.length, C.green], ["Calls", acl.length, C.brand]].map(([l, v, c]) => (
                            <div key={l} style={{ textAlign: "center" }}>
                              <div style={{ color: c, fontWeight: 800, fontSize: 18 }}>{v}</div>
                              <div style={{ color: C.muted, fontSize: 10, fontWeight: 600 }}>{l.toUpperCase()}</div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => { setCampDetail(p); setAgentInspect(null); setTab("campaigns"); }} style={{ background: C.brand + "22", border: `1px solid ${C.brand}33`, color: C.brand, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>View Leads →</button>
                      </div>
                      <ProgBar value={prog} />
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{prog}% contacted</div>
                    </div>
                  );
                })}

                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, marginTop: 32 }}>Full Call History</div>
                <DataTable headers={["Contact", "Date", "Campaign", "Duration", "Outcome", "Interest", "Notes"]}>
                  {calls.filter(c => c.agent_name === agentInspect.name).length === 0
                    ? <tr><td colSpan={7} style={{ ...S.td, color: C.muted, textAlign: "center", padding: 50 }}>No calls logged.</td></tr>
                    : calls.filter(c => c.agent_name === agentInspect.name).map(c => (
                      <TR key={c.id}>
                        <td style={{ ...S.td, fontWeight: 600 }}>{c.contact_name}</td>
                        <td style={{ ...S.td, color: C.muted }}>{c.call_date}</td>
                        <td style={S.td}>{c.promo_name}</td>
                        <td style={{ ...S.td, color: C.muted, textAlign: "center" }}>{c.duration_minutes ? c.duration_minutes + "m" : "—"}</td>
                        <td style={S.td}><Badge label={c.outcome} color={OC[c.outcome] || C.muted} /></td>
                        <td style={S.td}><Badge label={c.interest_level} color={c.interest_level === "High" ? C.green : c.interest_level === "Medium" ? C.yellow : C.muted} /></td>
                        <td style={{ ...S.td, color: C.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</td>
                      </TR>
                    ))}
                </DataTable>
              </div>
            )}
          </div>
        )}

        {/* ── CALL LOGS ── */}
        {tab === "calls" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>Master Call Log</div>
              <Btn color="#27272a" textColor={C.text} onClick={() => exportCSV(filteredCalls.map(c => ({ date: c.call_date, time: c.call_time, contact: c.contact_name, agent: c.agent_name, campaign: c.promo_name, duration: c.duration_minutes, outcome: c.outcome, interest: c.interest_level, callback: c.callback_date, notes: c.notes })), "call_logs.csv")}>⬇ Export CSV</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, background: C.card, padding: "16px 20px", borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div><label style={S.lbl}>Search</label><input value={fSearch} onChange={e => setFS(e.target.value)} placeholder="Contact or notes..." style={S.inp} /></div>
              <div><label style={S.lbl}>Agent</label><select value={fAgent} onChange={e => setFA(e.target.value)} style={S.inp}><option value="">All Agents</option>{agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
              <div><label style={S.lbl}>Campaign</label><select value={fPromo} onChange={e => setFP(e.target.value)} style={S.inp}><option value="">All Campaigns</option>{promos.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
              <div><label style={S.lbl}>Outcome</label><select value={fOutcome} onChange={e => setFO(e.target.value)} style={S.inp}><option value="">All Outcomes</option>{Object.keys(OC).map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Showing {filteredCalls.length} of {calls.length}</div>
            <DataTable headers={["Contact", "Date & Time", "Agent", "Campaign", "Mins", "Outcome", "Callback", "Notes"]}>
              {filteredCalls.length === 0 && <tr><td colSpan={8} style={{ ...S.td, color: C.muted, textAlign: "center", padding: 60 }}>No calls match these filters.</td></tr>}
              {filteredCalls.map(c => (
                <TR key={c.id}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{c.contact_name}</td>
                  <td style={{ ...S.td, color: C.muted, whiteSpace: "nowrap" }}>{c.call_date} {c.call_time?.slice(0, 5)}</td>
                  <td style={S.td}><Badge label={c.agent_name} color={C.brand} /></td>
                  <td style={S.td}>{c.promo_name}</td>
                  <td style={{ ...S.td, color: C.muted, textAlign: "center" }}>{c.duration_minutes ? c.duration_minutes + "m" : "—"}</td>
                  <td style={S.td}><Badge label={c.outcome} color={OC[c.outcome] || C.muted} /></td>
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                    {c.callback_date ? <span style={{ color: c.callback_done ? C.green : C.yellow, fontWeight: 600 }}>{c.callback_date} {c.callback_done ? "✓" : "⏳"}</span> : <span style={{ color: C.border }}>—</span>}
                  </td>
                  <td style={{ ...S.td, color: C.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</td>
                </TR>
              ))}
            </DataTable>
          </div>
        )}

        {tab === "callbacks" && <CallbacksTab calls={calls} isAdmin onRefresh={onRefresh} toast={toast} />}
      </div>

      {/* ── PROMO MODAL ── */}
      {pModal && (
        <Modal title={pModal === "edit" ? "Edit Campaign" : "New Campaign"} onClose={() => { setPModal(null); setPSel(null); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div><label style={S.lbl}>Name *</label><input value={pForm.name} onChange={e => setPForm(p => ({ ...p, name: e.target.value }))} style={S.inp} /></div>
            <div><label style={S.lbl}>Description</label><input value={pForm.description} onChange={e => setPForm(p => ({ ...p, description: e.target.value }))} style={S.inp} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><label style={S.lbl}>Start Date</label><input type="date" value={pForm.start_date} onChange={e => setPForm(p => ({ ...p, start_date: e.target.value }))} style={S.inp} /></div>
              <div><label style={S.lbl}>End Date</label><input type="date" value={pForm.end_date} onChange={e => setPForm(p => ({ ...p, end_date: e.target.value }))} style={S.inp} /></div>
              <div><label style={S.lbl}>Status</label><select value={pForm.status} onChange={e => setPForm(p => ({ ...p, status: e.target.value }))} style={S.inp}><option>Active</option><option>Expired</option><option>Paused</option></select></div>
              <div><label style={S.lbl}>Target Audience</label><input value={pForm.target_audience} onChange={e => setPForm(p => ({ ...p, target_audience: e.target.value }))} style={S.inp} /></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Btn onClick={savePromo} disabled={!pForm.name} style={{ flex: 1, padding: 12 }}>Save Campaign</Btn>
            <Btn onClick={() => { setPModal(null); setPSel(null); }} color="transparent" textColor={C.text} outline style={{ flex: 1, padding: 12 }}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* ── AGENT MODAL ── */}
      {aModal && (
        <Modal title={aModal === "edit" ? "Edit Agent" : "Add Agent"} onClose={() => { setAModal(null); setASel(null); }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div><label style={S.lbl}>Full Name *</label><input value={aForm.name} onChange={e => setAForm(p => ({ ...p, name: e.target.value }))} style={S.inp} /></div>
            <div><label style={S.lbl}>Role</label><select value={aForm.role} onChange={e => setAForm(p => ({ ...p, role: e.target.value }))} style={S.inp}><option>Agent</option><option>Senior Agent</option><option>Junior Agent</option><option>Team Lead</option></select></div>
            <div><label style={S.lbl}>Login PIN *</label><input type="password" maxLength={6} value={aForm.pin} onChange={e => setAForm(p => ({ ...p, pin: e.target.value }))} style={S.inp} placeholder="e.g. 1234" /></div>
            <div><label style={S.lbl}>Phone Ext</label><input value={aForm.phone_ext} onChange={e => setAForm(p => ({ ...p, phone_ext: e.target.value }))} style={S.inp} /></div>
            <div><label style={S.lbl}>Status</label><select value={aForm.status} onChange={e => setAForm(p => ({ ...p, status: e.target.value }))} style={S.inp}><option>Active</option><option>On Leave</option><option>Inactive</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Btn onClick={saveAgent} disabled={!aForm.name || !aForm.pin} style={{ flex: 1, padding: 12 }}>{aModal === "edit" ? "Save Changes" : "Add Agent"}</Btn>
            <Btn onClick={() => { setAModal(null); setASel(null); }} color="transparent" textColor={C.text} outline style={{ flex: 1, padding: 12 }}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* ── IMPORT MODAL ── */}
      {impModal && (
        <Modal title="📥 Import & Assign Leads" onClose={() => { setImpModal(false); setCsv([]); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "#1c1200", border: `1px solid ${C.yellow}33`, borderRadius: 8, padding: 14, color: C.yellow, fontSize: 13, lineHeight: 1.6 }}>
              CSV headers: <code style={{ color: C.text }}>name, phone, customer_type, priority</code>
            </div>
            <div><label style={S.lbl}>1. Campaign</label><select value={impPromo} onChange={e => setIP(e.target.value)} style={S.inp}><option value="">Select...</option>{activePromos.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
            <div><label style={S.lbl}>2. Agent</label><select value={impAgent} onChange={e => setIA(e.target.value)} style={S.inp}><option value="">Select...</option>{agents.filter(a => a.status === "Active").map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
            <div><label style={S.lbl}>3. Upload CSV</label><input type="file" accept=".csv" onChange={parseCSV} style={{ ...S.inp, padding: 10 }} /></div>
            {csv.length > 0 && <div style={{ background: "#052e16", border: `1px solid ${C.green}44`, color: C.green, padding: 12, borderRadius: 8, fontWeight: 600, textAlign: "center" }}>✓ {csv.length} leads parsed</div>}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Btn onClick={doImport} disabled={importing || !csv.length || !impAgent || !impPromo} style={{ flex: 1, padding: 12 }}>{importing ? "Importing..." : `Import ${csv.length || ""} Leads`}</Btn>
            <Btn onClick={() => { setImpModal(false); setCsv([]); }} color="transparent" textColor={C.text} outline style={{ flex: 1, padding: 12 }}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {showLogCall && <LogCallModal contacts={contacts} promos={promos} agents={agents} defaultAgent={null} prefill={null} onClose={() => setShowLogCall(false)} onDone={onRefresh} toast={toast} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [d, setD] = useState({ contacts: [], calls: [], agents: [], promos: [] });
  const [loading, setLoading] = useState(true);
  const [toastState, setToastState] = useState(null);

  function toast(msg, type = "success") {
    setToastState({ msg, type });
    setTimeout(() => setToastState(null), 3500);
  }

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [contacts, calls, agents, promos] = await Promise.all([
        db.get("contacts"), db.get("call_logs"), db.get("agents", "name"), db.get("promotions")
      ]);
      setD({
        contacts: Array.isArray(contacts) ? contacts : [],
        calls: Array.isArray(calls) ? calls : [],
        agents: Array.isArray(agents) ? agents : [],
        promos: Array.isArray(promos) ? promos : [],
      });
    } catch { if (!silent) toast("Failed to connect.", "error"); }
    finally { if (!silent) setLoading(false); }
  }, []);

  // FIX: Only load once on mount. Auto 30-sec refresh rule is removed.
  useEffect(() => { load(); }, []);

  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: "'Inter',system-ui,sans-serif", flexDirection: "column", gap: 20 }}>
      <style>{`body{margin:0;padding:0;background:${C.bg}}*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.brand}`, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      Loading Tanishq CRM...
    </div>
  );

  const shared = { ...d, onRefresh: () => load(true), toast };

  return (
    <>
      <style>{`body{margin:0;padding:0;background:${C.bg}}*{box-sizing:border-box}input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:.5}`}</style>
      {toastState && <Toast msg={toastState.msg} type={toastState.type} />}
      {!user && <LoginScreen agents={d.agents} onLogin={setUser} />}
      {user?.role === "admin" && <AdminPage {...shared} onLogout={() => setUser(null)} />}
      {user?.role === "agent" && <AgentPage {...shared} user={user} onLogout={() => setUser(null)} />}
    </>
  );
}

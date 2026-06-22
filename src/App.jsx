import { useEffect, useMemo, useRef, useState } from "react";
import {
  GOLD,
  TABS,
  calculateProgress,
  clientName,
  cloneInitialState,
  downloadFile,
  initialState,
  statusFromProgress,
  summaryData,
  toText,
} from "./onboarding";

const STORAGE_KEY = "elite-client-onboarding-v2";

function hydrate(saved) {
  const base = cloneInitialState();
  if (!saved || typeof saved !== "object") return base;
  return {
    ...base,
    ...saved,
    welcome: { ...base.welcome, ...saved.welcome },
    client: { ...base.client, ...saved.client },
    scope: { ...base.scope, ...saved.scope },
    kickoff: { ...base.kickoff, ...saved.kickoff },
    documents: Array.isArray(saved.documents) ? saved.documents : base.documents,
    milestones: Array.isArray(saved.milestones) ? saved.milestones : base.milestones,
    approvals: Array.isArray(saved.approvals) ? saved.approvals : base.approvals,
    notes: Array.isArray(saved.notes) ? saved.notes : base.notes,
  };
}

function Field({ label, value, onChange, placeholder, type = "text", children }) {
  return <label className="field">
    <span>{label}</span>
    {children || <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}
  </label>;
}

function Panel({ eyebrow, title, description, children, className = "" }) {
  return <section className={`panel ${className}`}>
    {(eyebrow || title) && <div className="panel-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {title && <h2>{title}</h2>}
        {description && <p>{description}</p>}
      </div>
    </div>}
    {children}
  </section>;
}

function Stat({ label, value, detail, tone = "gold" }) {
  return <div className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Empty({ icon, title, text }) {
  return <div className="empty-state"><div>{icon}</div><h3>{title}</h3><p>{text}</p></div>;
}

function StepBadge({ value }) {
  const tone = value === "Complete" || value === "Approved" ? "success" : value === "Needs revision" || value === "Rejected" ? "danger" : "pending";
  return <span className={`status-badge ${tone}`}>{value}</span>;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

export default function App() {
  const [state, setState] = useState(() => {
    try { return hydrate(JSON.parse(window.localStorage.getItem(STORAGE_KEY))); }
    catch { return cloneInitialState(); }
  });
  const [activeTab, setActiveTab] = useState("welcome");
  const [newDocument, setNewDocument] = useState("");
  const [newMilestone, setNewMilestone] = useState({ label: "", date: "" });
  const [newApproval, setNewApproval] = useState("");
  const [newNote, setNewNote] = useState({ text: "", author: "Hira Khyzer", type: "Internal note" });
  const [toast, setToast] = useState("");
  const importRef = useRef(null);

  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const progress = useMemo(() => calculateProgress(state), [state]);
  const docsDone = state.documents.filter((item) => item.done).length;
  const milestoneDone = state.milestones.filter((item) => item.status === "Complete").length;
  const nextStep = useMemo(() => {
    if (!state.client.firstName || !state.client.email || !state.client.company) return { tab: "client", title: "Complete the client profile", text: "Add the client and company essentials first." };
    if (!state.scope.projectName || !state.scope.service) return { tab: "scope", title: "Confirm the project scope", text: "Capture the project name, service, and goals." };
    if (!state.documents.some((item) => item.done)) return { tab: "documents", title: "Collect a first document", text: "Mark received materials to build onboarding momentum." };
    if (state.kickoff.status === "Not scheduled") return { tab: "kickoff", title: "Schedule the kickoff", text: "Pick a date, platform, and meeting status." };
    return { tab: "approvals", title: "Request a client approval", text: "Keep the project moving by confirming the next decision." };
  }, [state]);

  const updateGroup = (group, key, value) => setState((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  const updateList = (list, id, changes) => setState((current) => ({ ...current, [list]: current[list].map((item) => item.id === id ? { ...item, ...changes } : item) }));
  const removeList = (list, id) => setState((current) => ({ ...current, [list]: current[list].filter((item) => item.id !== id) }));
  const addToast = (message) => setToast(message);

  function addDocument() {
    const label = newDocument.trim();
    if (!label) return;
    setState((current) => ({ ...current, documents: [...current.documents, { id: `doc-${Date.now()}`, label, done: false }] }));
    setNewDocument(""); addToast("Document added");
  }

  function addMilestone() {
    if (!newMilestone.label.trim()) return;
    setState((current) => ({ ...current, milestones: [...current.milestones, { id: `milestone-${Date.now()}`, label: newMilestone.label.trim(), date: newMilestone.date, status: "Not started" }] }));
    setNewMilestone({ label: "", date: "" }); addToast("Milestone added");
  }

  function addApproval() {
    const label = newApproval.trim();
    if (!label) return;
    setState((current) => ({ ...current, approvals: [...current.approvals, { id: `approval-${Date.now()}`, label, status: "Pending", note: "" }] }));
    setNewApproval(""); addToast("Approval item added");
  }

  function addNote() {
    if (!newNote.text.trim()) return;
    setState((current) => ({ ...current, notes: [{ id: `note-${Date.now()}`, ...newNote, text: newNote.text.trim(), time: new Date().toLocaleString() }, ...current.notes] }));
    setNewNote((current) => ({ ...current, text: "" })); addToast("Note logged");
  }

  function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        const candidate = imported.client ? {
          welcome: imported.welcome,
          client: imported.client,
          scope: imported.project,
          kickoff: imported.kickoff,
          documents: imported.documents,
          milestones: imported.milestones,
          approvals: imported.approvals,
          notes: imported.notes,
        } : imported;
        setState(hydrate(candidate)); addToast("Backup imported successfully");
      } catch { addToast("That file is not a valid onboarding backup"); }
    };
    reader.readAsText(file); event.target.value = "";
  }

  function printSummary() {
    const data = summaryData(state);
    const rows = (items) => items.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value || "—")}</td></tr>`).join("");
    const printWindow = window.open("", "_blank");
    if (!printWindow) return addToast("Please allow pop-ups to print the summary");
    printWindow.document.write(`<!doctype html><html><head><title>Elite Onboarding Summary</title><style>body{font-family:Arial,sans-serif;max-width:820px;margin:40px auto;color:#17130c;line-height:1.6}h1{font-size:28px;border-bottom:3px solid #f4af00;padding-bottom:12px}h2{font-size:14px;text-transform:uppercase;letter-spacing:.12em;border-left:4px solid #f4af00;padding-left:10px;margin-top:28px}table{width:100%;border-collapse:collapse;font-size:13px}td{padding:8px 10px;border-bottom:1px solid #eee}td:first-child{width:180px;color:#6b6256}.tag{display:inline-block;border-radius:999px;background:#fff3cd;padding:2px 8px;font-size:11px}.item{padding:9px 0;border-bottom:1px solid #eee}.footer{text-align:center;color:#888;border-top:1px solid #eee;margin-top:36px;padding-top:14px;font-size:11px}</style></head><body><h1>Elite Era Development L.L.C</h1><p>Client Onboarding Summary · Generated ${escapeHtml(data.generatedAt)}</p><h2>Client and company</h2><table>${rows([["Client", clientName(state)], ["Company", data.client.company], ["Email", data.client.email], ["Phone", data.client.phone], ["Role", data.client.role], ["Industry", data.client.industry], ["Website", data.client.website], ["Location", data.client.location]])}</table><h2>Project scope</h2><table>${rows([["Project", data.project.projectName], ["Service", data.project.service], ["Timeline", `${data.project.startDate || "—"} to ${data.project.endDate || "—"}`], ["Budget", data.project.budget], ["Priority", data.project.priority], ["Scope confirmation", data.project.confirmation], ["Goals", data.project.goals]])}</table><h2>Kickoff meeting</h2><table>${rows([["Status", data.kickoff.status], ["Date and time", `${data.kickoff.date || "—"} ${data.kickoff.time || ""}`], ["Platform", data.kickoff.platform], ["Meeting link", data.kickoff.link]])}</table><h2>Documents</h2>${data.documents.map((item) => `<div class="item"><span class="tag">${item.done ? "Received" : "Pending"}</span> ${escapeHtml(item.label)}</div>`).join("")}<h2>Milestones</h2>${data.milestones.map((item) => `<div class="item"><span class="tag">${escapeHtml(item.status)}</span> ${escapeHtml(item.label)} ${item.date ? `· ${escapeHtml(item.date)}` : ""}</div>`).join("")}<h2>Approvals</h2>${data.approvals.map((item) => `<div class="item"><span class="tag">${escapeHtml(item.status)}</span> ${escapeHtml(item.label)} ${item.note ? `· ${escapeHtml(item.note)}` : ""}</div>`).join("")}<h2>Communication log</h2>${data.notes.length ? data.notes.map((item) => `<div class="item"><strong>${escapeHtml(item.type)}</strong> — ${escapeHtml(item.text)}<br><small>${escapeHtml(item.author)} · ${escapeHtml(item.time)}</small></div>`).join("") : "<p>No notes logged.</p>"}<div class="footer">Made by Hira Khyzer · Elite Era Development L.L.C</div></body></html>`);
    printWindow.document.close();
    window.setTimeout(() => printWindow.print(), 350);
  }

  function resetAll() {
    if (!window.confirm("Clear all onboarding information from this browser?")) return;
    setState(cloneInitialState()); window.localStorage.removeItem(STORAGE_KEY); setActiveTab("welcome"); addToast("All onboarding data cleared");
  }

  const nav = <nav className="portal-nav">{TABS.map(([id, label, icon]) => <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}><i>{icon}</i>{label}</button>)}</nav>;

  return <div className="portal-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><div className="brand-mark">E</div><div><span>Elite Era Development L.L.C</span><strong>Client Onboarding</strong></div></div>
      {nav}
      <div className="side-card"><span>Onboarding status</span><strong>{progress.percent}%</strong><div className="progress-track"><i style={{ width: `${progress.percent}%` }} /></div><small>{statusFromProgress(progress.percent)}</small></div>
      <div className="side-profile"><div className="avatar">HK</div><div><strong>Hira Khyzer</strong><span>Founder · Elite Era</span></div></div>
    </aside>

    <main className="main-content">
      <header className="mobile-header"><div className="brand-lockup"><div className="brand-mark">E</div><strong>Elite Onboarding</strong></div><span>{progress.percent}%</span></header>
      <div className="mobile-nav">{nav}</div>
      <section className="top-progress"><div><span>Client onboarding progress</span><strong>{progress.complete} of {progress.total} checkpoints complete</strong></div><div className="progress-wrap"><div className="progress-track"><i style={{ width: `${progress.percent}%` }} /></div><span>{progress.percent}%</span></div></section>

      <div className="page-content">
        {activeTab === "welcome" && <>
          <section className="welcome-hero"><div><p className="eyebrow">Elite client experience</p><h1>{state.welcome.heading}</h1><p>{state.welcome.subtitle}</p><button className="gold-button" onClick={() => setActiveTab(nextStep.tab)}>Continue: {nextStep.title} →</button></div><div className="hero-orbit"><div className="orbit-inner"><b>{progress.percent}%</b><span>ready</span></div></div></section>
          <div className="stats-grid"><Stat label="Documents" value={`${docsDone}/${state.documents.length}`} detail="received"/><Stat label="Milestones" value={`${milestoneDone}/${state.milestones.length}`} detail="complete" tone="ink"/><Stat label="Approvals" value={state.approvals.filter((item) => item.status === "Approved").length} detail="approved" tone="success"/><Stat label="Notes" value={state.notes.length} detail="logged" tone="blue"/></div>
          <div className="two-column"><Panel eyebrow="Recommended next step" title={nextStep.title} description={nextStep.text}><button className="outline-button" onClick={() => setActiveTab(nextStep.tab)}>Open {TABS.find(([id]) => id === nextStep.tab)?.[1]}</button></Panel><Panel eyebrow="Personalize the portal" title="Welcome message" description="This message will be visible at the beginning of the onboarding experience."><div className="field-grid"><Field label="Heading" value={state.welcome.heading} onChange={(value) => updateGroup("welcome", "heading", value)} /><Field label="Subtitle" value={state.welcome.subtitle} onChange={(value) => updateGroup("welcome", "subtitle", value)} /></div></Panel></div>
          <Panel eyebrow="Onboarding map" title="A smooth path from kickoff to delivery"><div className="stage-map">{["Client profile", "Project scope", "Assets", "Kickoff", "Approvals"].map((item, index) => <div key={item}><b>{index + 1}</b><span>{item}</span></div>)}</div></Panel>
        </>}

        {activeTab === "client" && <>
          <PageTitle eyebrow="Step 01" title="Client and company details" text="Capture accurate contact information so your team can personalize every next step." />
          <Panel title="Primary contact"><div className="field-grid"><Field label="First name" value={state.client.firstName} onChange={(value) => updateGroup("client", "firstName", value)} placeholder="Jane"/><Field label="Last name" value={state.client.lastName} onChange={(value) => updateGroup("client", "lastName", value)} placeholder="Smith"/><Field label="Email address" value={state.client.email} onChange={(value) => updateGroup("client", "email", value)} placeholder="jane@company.com" type="email"/><Field label="Phone number" value={state.client.phone} onChange={(value) => updateGroup("client", "phone", value)} placeholder="+1 555 000 0000"/><Field label="Role or title" value={state.client.role} onChange={(value) => updateGroup("client", "role", value)} placeholder="Chief Executive Officer"/><Field label="LinkedIn profile" value={state.client.linkedin} onChange={(value) => updateGroup("client", "linkedin", value)} placeholder="linkedin.com/in/..."/></div></Panel>
          <Panel title="Company profile"><div className="field-grid"><Field label="Company name" value={state.client.company} onChange={(value) => updateGroup("client", "company", value)} placeholder="Acme Inc."/><Field label="Industry" value={state.client.industry} onChange={(value) => updateGroup("client", "industry", value)} placeholder="SaaS, e-commerce, healthcare..."/><Field label="Website" value={state.client.website} onChange={(value) => updateGroup("client", "website", value)} placeholder="https://company.com"/><Field label="Location" value={state.client.location} onChange={(value) => updateGroup("client", "location", value)} placeholder="City, Country"/><SelectField label="Team size" value={state.client.teamSize} onChange={(value) => updateGroup("client", "teamSize", value)} options={["1–10", "11–50", "51–200", "200+"]}/><SelectField label="Revenue range" value={state.client.revenue} onChange={(value) => updateGroup("client", "revenue", value)} options={["Under $100k", "$100k–$500k", "$500k–$2M", "$2M+"]}/></div><Field label="How did they hear about us?" value={state.client.referral} onChange={(value) => updateGroup("client", "referral", value)} placeholder="Referral, LinkedIn, community, event..."/></Panel>
        </>}

        {activeTab === "scope" && <>
          <PageTitle eyebrow="Step 02" title="Project scope and success" text="Define what will be delivered, what success looks like, and where the work begins and ends." />
          <Panel title="Project overview"><div className="field-grid"><Field label="Project name" value={state.scope.projectName} onChange={(value) => updateGroup("scope", "projectName", value)} placeholder="AI marketing system"/><SelectField label="Service type" value={state.scope.service} onChange={(value) => updateGroup("scope", "service", value)} options={["AI marketing automation", "Custom web development", "Mobile app development", "Brand identity and design", "SEO and growth strategy", "CRM integration", "Other"]}/><Field label="Start date" value={state.scope.startDate} onChange={(value) => updateGroup("scope", "startDate", value)} type="date"/><Field label="End date" value={state.scope.endDate} onChange={(value) => updateGroup("scope", "endDate", value)} type="date"/><Field label="Budget" value={state.scope.budget} onChange={(value) => updateGroup("scope", "budget", value)} placeholder="$5,000"/><SelectField label="Priority level" value={state.scope.priority} onChange={(value) => updateGroup("scope", "priority", value)} options={["High", "Medium", "Low"]}/></div><TextField label="Project description" value={state.scope.description} onChange={(value) => updateGroup("scope", "description", value)} placeholder="Describe the project need, target users, and core requirements..."/><TextField label="Goals and success metrics" value={state.scope.goals} onChange={(value) => updateGroup("scope", "goals", value)} placeholder="What must improve, launch, or be measured for this project to succeed?"/><TextField label="Out of scope" value={state.scope.outOfScope} onChange={(value) => updateGroup("scope", "outOfScope", value)} placeholder="Clarify items that are not included in this engagement."/></Panel>
          <Panel title="Scope confirmation" description="Record the client’s decision before work moves into production."><div className="field-grid"><SelectField label="Client confirmation" value={state.scope.confirmation} onChange={(value) => updateGroup("scope", "confirmation", value)} options={["Pending", "Confirmed", "Needs revision"]}/><div className="scope-status"><StepBadge value={state.scope.confirmation} /><p>Keep this updated as the scope is reviewed.</p></div></div><TextField label="Confirmation notes" value={state.scope.confirmationNotes} onChange={(value) => updateGroup("scope", "confirmationNotes", value)} placeholder="Record requested edits, decisions, or references."/></Panel>
        </>}

        {activeTab === "documents" && <>
          <PageTitle eyebrow="Step 03" title="Documents and access" text="Collect everything your team needs before work begins." />
          <Panel title="Required items" description={`${docsDone} of ${state.documents.length} documents marked as received.`}><div className="checklist">{state.documents.map((item) => <div className={`check-item ${item.done ? "done" : ""}`} key={item.id}><button aria-label={`Toggle ${item.label}`} className="check-toggle" onClick={() => updateList("documents", item.id, { done: !item.done })}>{item.done ? "✓" : ""}</button><div><strong>{item.label}</strong><span>{item.done ? "Received and ready" : "Waiting for client"}</span></div><button className="icon-button" aria-label={`Remove ${item.label}`} onClick={() => removeList("documents", item.id)}>×</button></div>)}</div><div className="add-row"><input value={newDocument} onChange={(event) => setNewDocument(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addDocument()} placeholder="Add a custom document or access request"/><button className="gold-button compact" onClick={addDocument}>Add item</button></div></Panel>
        </>}

        {activeTab === "kickoff" && <>
          <PageTitle eyebrow="Step 04" title="Kickoff meeting" text="Set a clear, client-friendly kickoff that gives everyone the same starting point." />
          <div className="two-column kickoff-layout"><Panel title="Meeting details"><div className="field-grid"><Field label="Preferred date" value={state.kickoff.date} onChange={(value) => updateGroup("kickoff", "date", value)} type="date"/><Field label="Preferred time" value={state.kickoff.time} onChange={(value) => updateGroup("kickoff", "time", value)} type="time"/><SelectField label="Timezone" value={state.kickoff.timezone} onChange={(value) => updateGroup("kickoff", "timezone", value)} options={["Pacific Time (UTC-8)", "Eastern Time (UTC-5)", "GMT (UTC+0)", "China Standard Time (UTC+8)", "Other"]}/><SelectField label="Platform" value={state.kickoff.platform} onChange={(value) => updateGroup("kickoff", "platform", value)} options={["Google Meet", "Zoom", "Microsoft Teams", "Calendly", "Other"]}/></div><Field label="Meeting link" value={state.kickoff.link} onChange={(value) => updateGroup("kickoff", "link", value)} placeholder="https://meet.google.com/..."/><TextField label="Agenda" value={state.kickoff.agenda} onChange={(value) => updateGroup("kickoff", "agenda", value)} placeholder="Introductions, goals, timeline, access needs, questions..."/><SelectField label="Meeting status" value={state.kickoff.status} onChange={(value) => updateGroup("kickoff", "status", value)} options={["Not scheduled", "Scheduled", "Completed", "Rescheduled"]}/></Panel><Panel eyebrow="Quick availability" title="Suggested time slots" description="Choose a template slot to prefill the meeting time."><div className="slot-list">{["09:00", "11:00", "14:00", "16:00"].map((slot) => <button key={slot} className={state.kickoff.slot === slot ? "slot selected" : "slot"} onClick={() => setState((current) => ({ ...current, kickoff: { ...current.kickoff, slot, time: slot, status: current.kickoff.status === "Not scheduled" ? "Scheduled" : current.kickoff.status } }))}><span>◷</span><div><strong>{slot}</strong><small>{state.kickoff.timezone}</small></div>{state.kickoff.slot === slot && <b>Selected</b>}</button>)}</div><div className="meeting-summary"><span>Meeting status</span><StepBadge value={state.kickoff.status}/></div></Panel></div>
        </>}

        {activeTab === "milestones" && <>
          <PageTitle eyebrow="Step 05" title="Milestones and timeline" text="Make delivery visible with simple phases, dates, and status tracking." />
          <Panel title="Delivery roadmap"><div className="timeline">{state.milestones.map((item, index) => <div className="timeline-item" key={item.id}><div className={`timeline-dot ${item.status === "Complete" ? "complete" : item.status === "In progress" ? "active" : ""}`}>{item.status === "Complete" ? "✓" : index + 1}</div><div className="timeline-content"><div className="timeline-title"><strong>{item.label}</strong><StepBadge value={item.status}/></div><div className="timeline-controls"><Field label="Due date" value={item.date} onChange={(value) => updateList("milestones", item.id, { date: value })} type="date"/><SelectField label="Status" value={item.status} onChange={(value) => updateList("milestones", item.id, { status: value })} options={["Not started", "In progress", "Complete"]}/><button className="icon-button delete" onClick={() => removeList("milestones", item.id)}>×</button></div></div></div>)}</div><div className="add-milestone"><input value={newMilestone.label} onChange={(event) => setNewMilestone((current) => ({ ...current, label: event.target.value }))} placeholder="New milestone"/><input type="date" value={newMilestone.date} onChange={(event) => setNewMilestone((current) => ({ ...current, date: event.target.value }))}/><button className="gold-button compact" onClick={addMilestone}>Add milestone</button></div></Panel>
        </>}

        {activeTab === "approvals" && <>
          <PageTitle eyebrow="Step 06" title="Client approvals" text="Keep decisions documented and make it obvious what needs attention next." />
          <Panel title="Approval tracker"><div className="approval-list">{state.approvals.map((item) => <article className="approval-item" key={item.id}><div className="approval-top"><div><strong>{item.label}</strong><p>Track the decision and record any client feedback.</p></div><StepBadge value={item.status}/></div><div className="approval-controls"><SelectField label="Decision" value={item.status} onChange={(value) => updateList("approvals", item.id, { status: value })} options={["Pending", "Approved", "Rejected", "Needs revision"]}/><Field label="Approval note" value={item.note} onChange={(value) => updateList("approvals", item.id, { note: value })} placeholder="Feedback, version link, or decision date"/><button className="icon-button delete" onClick={() => removeList("approvals", item.id)}>×</button></div></article>)}</div><div className="add-row"><input value={newApproval} onChange={(event) => setNewApproval(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addApproval()} placeholder="Add an item requiring approval"/><button className="gold-button compact" onClick={addApproval}>Add item</button></div></Panel>
        </>}

        {activeTab === "notes" && <>
          <PageTitle eyebrow="Step 07" title="Communication log" text="Save calls, decisions, updates, and handoff notes in one shared project record." />
          <div className="two-column notes-layout"><Panel title="Add a note"><TextField label="New note" value={newNote.text} onChange={(value) => setNewNote((current) => ({ ...current, text: value }))} placeholder="Log a meeting decision, an update, or a follow-up commitment..."/><div className="field-grid"><Field label="Author" value={newNote.author} onChange={(value) => setNewNote((current) => ({ ...current, author: value }))} placeholder="Hira Khyzer"/><SelectField label="Type" value={newNote.type} onChange={(value) => setNewNote((current) => ({ ...current, type: value }))} options={["Internal note", "Client update", "Call summary", "Decision made", "Follow-up"]}/></div><button className="gold-button" onClick={addNote}>Log note</button></Panel><Panel title="Project activity">{state.notes.length ? <div className="note-list">{state.notes.map((item) => <article className="note-item" key={item.id}><div className="note-meta"><span>{item.type}</span><time>{item.time}</time></div><p>{item.text}</p><footer><strong>{item.author}</strong><button className="text-button" onClick={() => removeList("notes", item.id)}>Remove</button></footer></article>)}</div> : <Empty icon="✎" title="No notes yet" text="Add the first client update or meeting summary to create a shared project history."/>}</Panel></div>
        </>}

        {activeTab === "export" && <>
          <PageTitle eyebrow="Step 08" title="Export and data controls" text="Create a backup, generate a client-friendly summary, or restore saved onboarding data." />
          <div className="export-grid"><Panel title="Export onboarding summary" description="Share a simple snapshot with your client or internal team."><div className="export-actions"><button className="gold-button" onClick={printSummary}>Print / save as PDF</button><button className="outline-button" onClick={() => { downloadFile("elite-onboarding-backup.json", JSON.stringify(summaryData(state), null, 2), "application/json"); addToast("JSON backup downloaded"); }}>Download JSON</button><button className="outline-button" onClick={() => { downloadFile("elite-onboarding-summary.txt", toText(state), "text/plain"); addToast("Text summary downloaded"); }}>Download TXT</button></div></Panel><Panel title="Restore a backup" description="Import a previous onboarding JSON file to continue working."><button className="outline-button" onClick={() => importRef.current?.click()}>Import JSON backup</button><input ref={importRef} type="file" accept="application/json,.json" onChange={importJson} hidden/></Panel><Panel title="Data management" description="All onboarding details are saved only in this browser."><button className="danger-button" onClick={resetAll}>Clear all onboarding data</button></Panel></div>
        </>}
      </div>
      <footer className="portal-footer"><strong>Made by Hira Khyzer</strong><span>Elite Era Development L.L.C</span><b style={{ color: GOLD }}>#f4af00</b></footer>
      {toast && <div className="toast">{toast}</div>}
    </main>
  </div>;
}

function PageTitle({ eyebrow, title, text }) {
  return <header className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></header>;
}

function SelectField({ label, value, onChange, options }) {
  return <Field label={label}><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select an option</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>;
}

function TextField({ label, value, onChange, placeholder }) {
  return <label className="field full"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows="4" /></label>;
}

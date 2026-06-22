export const GOLD = "#f4af00";

export const TABS = [
  ["welcome", "Welcome", "⌂"],
  ["client", "Client Info", "◉"],
  ["scope", "Project Scope", "◎"],
  ["documents", "Documents", "✓"],
  ["kickoff", "Kickoff", "◷"],
  ["milestones", "Milestones", "↗"],
  ["approvals", "Approvals", "✦"],
  ["notes", "Notes", "✎"],
  ["export", "Export", "↓"],
];

export const initialState = {
  welcome: {
    heading: "Welcome to Elite Era Development",
    subtitle: "We are excited to partner with you. Complete each stage below to begin your project with clarity and confidence.",
  },
  client: {
    firstName: "", lastName: "", email: "", phone: "", role: "", linkedin: "",
    company: "", industry: "", website: "", location: "", teamSize: "", revenue: "", referral: "",
  },
  scope: {
    projectName: "", service: "", startDate: "", endDate: "", budget: "", priority: "",
    description: "", goals: "", outOfScope: "", confirmation: "Pending", confirmationNotes: "",
  },
  kickoff: {
    date: "", time: "", timezone: "Pacific Time (UTC-8)", platform: "Google Meet", link: "", agenda: "", status: "Not scheduled", slot: "",
  },
  documents: [
    { id: "contract", label: "Signed Contract / NDA", done: false },
    { id: "brand", label: "Brand assets: logo, colors, and fonts", done: false },
    { id: "access", label: "Access credentials", done: false },
    { id: "analytics", label: "Existing analytics or reports", done: false },
    { id: "materials", label: "Past marketing materials", done: false },
    { id: "billing", label: "Payment and invoice details", done: false },
  ],
  milestones: [
    { id: "kickoff", label: "Kickoff meeting", date: "", status: "Not started" },
    { id: "discovery", label: "Discovery and research", date: "", status: "Not started" },
    { id: "strategy", label: "Strategy delivery", date: "", status: "Not started" },
    { id: "review", label: "Client review and feedback", date: "", status: "Not started" },
    { id: "launch", label: "Final delivery", date: "", status: "Not started" },
  ],
  approvals: [
    { id: "scope", label: "Project scope document", status: "Pending", note: "" },
    { id: "brief", label: "Creative brief or strategy", status: "Pending", note: "" },
    { id: "designs", label: "Initial designs or mockups", status: "Pending", note: "" },
  ],
  notes: [],
};

export const cloneInitialState = () => JSON.parse(JSON.stringify(initialState));

export function calculateProgress(state) {
  const checks = [
    state.client.firstName,
    state.client.email,
    state.client.company,
    state.scope.projectName,
    state.scope.service,
    state.scope.description,
    state.documents.some((item) => item.done),
    state.kickoff.status === "Scheduled" || state.kickoff.status === "Completed",
    state.milestones.some((item) => item.date),
    state.approvals.some((item) => item.status === "Approved"),
    state.notes.length > 0,
  ];
  const complete = checks.filter(Boolean).length;
  return { complete, total: checks.length, percent: Math.round((complete / checks.length) * 100) };
}

export function clientName(state) {
  return `${state.client.firstName} ${state.client.lastName}`.trim() || "Your client";
}

export function statusFromProgress(percent) {
  if (percent === 100) return "Complete";
  if (percent >= 55) return "In progress";
  return "Just started";
}

export function summaryData(state) {
  return {
    generatedAt: new Date().toLocaleString(),
    agency: "Elite Era Development L.L.C",
    madeBy: "Hira Khyzer",
    client: state.client,
    project: state.scope,
    kickoff: state.kickoff,
    documents: state.documents,
    milestones: state.milestones,
    approvals: state.approvals,
    notes: state.notes,
  };
}

export function toText(state) {
  const data = summaryData(state);
  const lines = [
    "ELITE ERA DEVELOPMENT L.L.C — CLIENT ONBOARDING SUMMARY",
    "Made by Hira Khyzer",
    `Generated: ${data.generatedAt}`,
    "",
    "--- CLIENT ---",
    `Name: ${clientName(state)}`,
    `Company: ${data.client.company}`,
    `Email: ${data.client.email}`,
    `Phone: ${data.client.phone}`,
    `Industry: ${data.client.industry}`,
    "",
    "--- PROJECT ---",
    `Project: ${data.project.projectName}`,
    `Service: ${data.project.service}`,
    `Timeline: ${data.project.startDate} to ${data.project.endDate}`,
    `Budget: ${data.project.budget}`,
    `Goals: ${data.project.goals}`,
    "",
    "--- KICKOFF ---",
    `Status: ${data.kickoff.status}`,
    `Schedule: ${data.kickoff.date} ${data.kickoff.time} ${data.kickoff.timezone}`,
    `Platform: ${data.kickoff.platform}`,
    "",
    "--- DOCUMENTS ---",
    ...data.documents.map((item) => `[${item.done ? "x" : " "}] ${item.label}`),
    "",
    "--- MILESTONES ---",
    ...data.milestones.map((item) => `[${item.status === "Complete" ? "x" : " "}] ${item.label} — ${item.date || "No date"}`),
    "",
    "--- APPROVALS ---",
    ...data.approvals.map((item) => `${item.label}: ${item.status}${item.note ? ` — ${item.note}` : ""}`),
    "",
    "--- NOTES ---",
    ...data.notes.map((item) => `[${item.time}] ${item.author} (${item.type}): ${item.text}`),
  ];
  return lines.join("\n") + "\n";
}

export function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

import { describe, expect, it } from "vitest";
import { calculateProgress, cloneInitialState, statusFromProgress, toText } from "./onboarding";

describe("onboarding helpers", () => {
  it("starts at zero progress", () => {
    expect(calculateProgress(cloneInitialState()).percent).toBe(0);
  });

  it("counts completed onboarding checkpoints", () => {
    const state = cloneInitialState();
    state.client.firstName = "Jane";
    state.client.email = "jane@example.com";
    state.client.company = "Acme";
    state.scope.projectName = "Website refresh";
    state.scope.service = "Custom web development";
    state.scope.description = "A modern client portal";
    state.documents[0].done = true;
    state.kickoff.status = "Scheduled";
    state.milestones[0].date = "2026-06-25";
    state.approvals[0].status = "Approved";
    state.notes.push({ id: "note-1", text: "Initial call complete", author: "Hira", type: "Call summary", time: "Today" });
    expect(calculateProgress(state).percent).toBe(100);
    expect(statusFromProgress(100)).toBe("Complete");
  });

  it("creates a readable text summary", () => {
    const state = cloneInitialState();
    state.client.firstName = "Jane";
    state.client.company = "Acme";
    state.scope.projectName = "Website refresh";
    const text = toText(state);
    expect(text).toContain("ELITE ERA DEVELOPMENT L.L.C");
    expect(text).toContain("Website refresh");
    expect(text).toContain("Jane");
  });
});

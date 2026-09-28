import assert from "node:assert/strict";
import test from "node:test";
import { planContent } from "./content_policy.js";

test("a campaign report is addressed to the board and preserves its metrics", () => {
  const plan = planContent({
    kind: "campaign_report",
    campaign: "Winter shelter",
    donations: 18450,
    volunteerHours: 326,
    beneficiariesReached: 91,
  });

  assert.equal(plan.audience, "board");
  assert.deepEqual(plan.facts, {
    campaign: "Winter shelter",
    donations: 18450,
    volunteerHours: 326,
    beneficiariesReached: 91,
  });
  assert.match(plan.systemInstruction, /three short next actions/);
});

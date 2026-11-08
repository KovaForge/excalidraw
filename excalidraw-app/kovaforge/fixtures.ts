// Diagram fixtures shared by the kovaforge tests.

import type { Diagram } from "./diagram";

type N = Diagram["nodes"][number];
const n = (id: string, label: string, kind: N["kind"] = "step"): N => ({
  id,
  label,
  kind,
});

export const linear: Diagram = {
  version: 1,
  title: "Linear",
  direction: "TB",
  nodes: [
    n("start", "Start", "start"),
    n("a", "Collect the order"),
    n("b", "Pack the goods"),
    n("c", "Ship to the customer"),
    n("end", "Done", "end"),
  ],
  edges: [
    { from: "start", to: "a" },
    { from: "a", to: "b" },
    { from: "b", to: "c" },
    { from: "c", to: "end" },
  ],
};

export const branching: Diagram = {
  version: 1,
  title: "Approval",
  direction: "TB",
  nodes: [
    n("start", "Request received", "start"),
    n("check", "Is the amount over 1000 dollars?", "decision"),
    n("manager", "Manager approves"),
    n("auto", "Approve automatically"),
    n("pay", "Pay the invoice"),
    n("end", "Finished", "end"),
  ],
  edges: [
    { from: "start", to: "check" },
    { from: "check", to: "manager", label: "Yes" },
    { from: "check", to: "auto", label: "No" },
    { from: "manager", to: "pay" },
    { from: "auto", to: "pay" },
    { from: "pay", to: "end" },
  ],
};

export const loop: Diagram = {
  version: 1,
  title: "Review loop",
  direction: "TB",
  nodes: [
    n("start", "Start", "start"),
    n("draft", "Write the draft"),
    n("review", "Review the draft"),
    n("ok", "Is it good enough?", "decision"),
    n("end", "Publish", "end"),
  ],
  edges: [
    { from: "start", to: "draft" },
    { from: "draft", to: "review" },
    { from: "review", to: "ok" },
    { from: "ok", to: "draft", label: "No" },
    { from: "ok", to: "end", label: "Yes" },
  ],
};

export const leftToRight: Diagram = {
  ...linear,
  title: "Left to right",
  direction: "LR",
};

/** Edges that go back to an earlier step, which the position assertions skip. */
export const backEdges = new Set(["ok->draft"]);

export function big(): Diagram {
  const nodes: N[] = [n("n0", "Start", "start")];
  const edges: Diagram["edges"] = [];
  for (let i = 1; i < 39; i++) {
    const kind = i % 6 === 0 ? "decision" : "step";
    nodes.push(n(`n${i}`, `Step number ${i} of the long process`, kind));
    edges.push({ from: `n${Math.ceil(i / 2) - 1}`, to: `n${i}` });
  }
  nodes.push(n("n39", "Finish", "end"));
  edges.push({ from: "n38", to: "n39" }, { from: "n20", to: "n39" });
  return { version: 1, title: "Big", direction: "TB", nodes, edges };
}

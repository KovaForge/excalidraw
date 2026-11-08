// Copied byte-for-byte to KovaForge/excalidraw at excalidraw-app/kovaforge/diagram.ts; canvas/build.sh refuses to build when the two differ.
// The neutral Diagram: what the AI produces and what every drawing engine consumes. No coordinates, no styling.
// Pure and free of I/O, so the Worker and the editor can share it.

export type DiagramDirection = "TB" | "LR";
export type NodeKind = "start" | "end" | "step" | "decision";

export type Diagram = {
  version: 1;
  title: string;
  direction: DiagramDirection;
  nodes: { id: string; label: string; kind: NodeKind }[];
  edges: { from: string; to: string; label?: string }[];
};

export const MAX_NODES = 40;
export const MAX_EDGES = 80;
export const MAX_TITLE = 80;
export const MAX_LABEL = 80;
export const MAX_JSON_BYTES = 65536;
const MAX_ID = 32;

export type DiagramRejection = "not_object" | "no_nodes" | "too_many_nodes" | "too_many_edges" | "too_large";
export type DiagramResult = { ok: true; diagram: Diagram; repairs: string[] } | { ok: false; reason: DiagramRejection };

const KINDS: readonly string[] = ["start", "end", "step", "decision"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// C0 and C1 controls (tab, line feed and carriage return are left for the whitespace collapse), zero-width characters,
// line and paragraph separators, bidi embeddings, word joiner and invisible operators, and the byte order mark.
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF]/g;

// The one place text is cleaned: strip invisible characters first, then collapse whitespace and trim.
function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(INVISIBLE, "").replace(/\s+/g, " ").trim() : "";
}

function tidyText(value: unknown, max: number) {
  return cleanText(value).slice(0, max).trim();
}

function cleanId(value: unknown) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, MAX_ID);
}

export function validateDiagram(input: unknown): DiagramResult {
  if (!isRecord(input)) return { ok: false, reason: "not_object" };
  let size: number;
  try {
    size = new TextEncoder().encode(JSON.stringify(input)).length;
  } catch {
    return { ok: false, reason: "not_object" };
  }
  if (size > MAX_JSON_BYTES) return { ok: false, reason: "too_large" };

  const repairs = new Set<string>();
  const rawNodes = Array.isArray(input.nodes) ? input.nodes : [];
  if (rawNodes.length > MAX_NODES) return { ok: false, reason: "too_many_nodes" };
  const rawEdges = Array.isArray(input.edges) ? input.edges : [];
  if (rawEdges.length > MAX_EDGES) return { ok: false, reason: "too_many_edges" };

  if (input.version !== undefined && input.version !== 1) repairs.add("set the format version");

  let title = tidyText(input.title, MAX_TITLE);
  if (!title) {
    title = "Untitled workflow";
    repairs.add("added a missing title");
  } else if (cleanText(input.title).length > MAX_TITLE) repairs.add("shortened a long title");

  const direction: DiagramDirection = input.direction === "TB" || input.direction === "LR" ? input.direction : "TB";
  if (direction !== input.direction) repairs.add("set the direction to top to bottom");

  const nodes: Diagram["nodes"] = [];
  const seen = new Set<string>();
  rawNodes.forEach((raw, index) => {
    if (!isRecord(raw)) {
      repairs.add("dropped an unusable step");
      return;
    }
    let id = cleanId(raw.id);
    if (id !== raw.id) repairs.add("fixed some step ids");
    if (!id) id = `n${index + 1}`;
    if (seen.has(id)) {
      repairs.add("dropped a repeated step");
      return;
    }
    const fullLabel = cleanText(raw.label);
    if (!fullLabel) {
      repairs.add("dropped a step with no label");
      return;
    }
    if (fullLabel.length > MAX_LABEL) repairs.add("shortened a long label");
    let kind = raw.kind as NodeKind;
    if (!KINDS.includes(raw.kind as string)) {
      kind = "step";
      repairs.add("set an unknown step type to a plain step");
    }
    seen.add(id);
    nodes.push({ id, label: fullLabel.slice(0, MAX_LABEL).trim(), kind });
  });
  if (nodes.length === 0) return { ok: false, reason: "no_nodes" };

  const edges: Diagram["edges"] = [];
  const edgeKeys = new Set<string>();
  for (const raw of rawEdges) {
    if (!isRecord(raw)) {
      repairs.add("dropped an unusable arrow");
      continue;
    }
    const from = cleanId(raw.from);
    const to = cleanId(raw.to);
    if (!seen.has(from) || !seen.has(to)) {
      repairs.add("dropped an arrow that pointed at nothing");
      continue;
    }
    if (from === to) {
      repairs.add("dropped an arrow that loops back to its own step");
      continue;
    }
    const fullLabel = cleanText(raw.label);
    if (fullLabel.length > MAX_LABEL) repairs.add("shortened a long label");
    const label = fullLabel.slice(0, MAX_LABEL).trim();
    const key = JSON.stringify([from, to, label]);
    if (edgeKeys.has(key)) {
      repairs.add("dropped a repeated arrow");
      continue;
    }
    edgeKeys.add(key);
    edges.push(label ? { from, to, label } : { from, to });
  }

  return { ok: true, diagram: { version: 1, title, direction, nodes, edges }, repairs: [...repairs] };
}

// The diagram behind the AI draft on screen, kept for the share feature that comes later.

import type { Diagram } from "./diagram";

let current: Diagram | null = null;

export const getCurrentDiagram = () => current;
export const setCurrentDiagram = (diagram: Diagram | null) => {
  current = diagram;
};

import { createRoot } from "react-dom/client";

/** Racine de composition du navigateur (ADR-0017) : câblera les adaptateurs Yjs, HTTP et localStorage. */
const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<h1>Event Storming</h1>);
}

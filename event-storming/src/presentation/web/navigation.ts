import { useEffect, useState } from "react";
import { parseRoute, type Route } from "./routes";

/** Navigue sans recharger la page (History API) ; `useRoute` réagit au changement. */
export function navigate(path: string): void {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useRoute(): Route {
  const [pathname, setPathname] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return parseRoute(pathname);
}

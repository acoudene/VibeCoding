import { useEffect, useState, type MouseEvent } from "react";
import { isPlainLeftClick } from "./link-click";
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

/** Gestionnaire de clic d'un lien interne : navigue sans recharger, sauf pour les clics laissés au navigateur. */
export function followLink(href: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    navigate(href);
  };
}

export type Route =
  | { readonly page: "home" }
  | { readonly page: "board"; readonly id: string }
  | { readonly page: "notFound" };

/** Routage minimal par l'URL : `/` (accueil) et `/b/<id>` (tableau). */
export function parseRoute(pathname: string): Route {
  const segments = pathname.split("/").filter((segment) => segment !== "");
  if (segments.length === 0) return { page: "home" };
  const [head, id] = segments;
  if (segments.length === 2 && head === "b" && id !== undefined) return { page: "board", id };
  return { page: "notFound" };
}

export function boardPath(id: string): string {
  return `/b/${id}`;
}

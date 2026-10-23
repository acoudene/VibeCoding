/** `localStorage` du navigateur, ou `undefined` s'il est indisponible (accès refusé, mode privé, hors navigateur). */
export function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

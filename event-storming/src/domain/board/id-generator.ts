/** Port domaine : fournit des identifiants uniques (post-its, liens, cadres). */
export interface IdGenerator {
  next(): string;
}

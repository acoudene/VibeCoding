/**
 * Enregistrement différé : seule la dernière valeur est enregistrée, après `delayMs` sans nouvelle valeur ;
 * `flush` l'enregistre tout de suite (en quittant le tableau ou la page).
 */
export class DebouncedSave<T> {
  private pending: { readonly timer: ReturnType<typeof setTimeout>; readonly value: T } | undefined;

  constructor(
    private readonly delayMs: number,
    private readonly save: (value: T) => void,
  ) {}

  schedule(value: T): void {
    if (this.pending !== undefined) clearTimeout(this.pending.timer);
    this.pending = { timer: setTimeout(() => this.flush(), this.delayMs), value };
  }

  flush(): void {
    if (this.pending === undefined) return;
    const { timer, value } = this.pending;
    this.pending = undefined;
    clearTimeout(timer);
    this.save(value);
  }
}

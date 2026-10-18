import { After, Status, World, setWorldConstructor, type IWorldOptions } from "@cucumber/cucumber";
import type { BoardHistory } from "../../../../src/application/ports/board-history";
import type { BoardStore } from "../../../../src/application/ports/board-store";
import { CreateBoard } from "../../../../src/application/board/create-board";
import { OpenBoard } from "../../../../src/application/board/open-board";
import { RenameBoard } from "../../../../src/application/board/rename-board";
import { LinkStickies } from "../../../../src/application/board/link-stickies";
import { PlaceSticky } from "../../../../src/application/board/place-sticky";
import { boardId, type BoardFragment, type BoardId } from "../../../../src/domain/board/board";
import { STICKY_SIZE, type Sticky } from "../../../../src/domain/board/sticky";
import { STICKY_KINDS, type StickyKind } from "../../../../src/domain/board/sticky-kind";
import { FixedClock } from "../../../../src/infrastructure/memory/fixed-clock";
import { InMemoryBoardGateway } from "../../../../src/infrastructure/memory/in-memory-board-gateway";
import { InMemoryBoardStore } from "../../../../src/infrastructure/memory/in-memory-board-store";
import { InMemoryRecentBoards } from "../../../../src/infrastructure/memory/in-memory-recent-boards";
import { ScriptedIdGenerator } from "../../../../src/infrastructure/memory/scripted-id-generator";

/** Instant par défaut des scénarios qui ne fixent pas l'heure (« il est … »). */
const DEFAULT_NOW = new Date("2026-01-01T00:00:00Z");

/**
 * Monde partagé par tous les steps du contexte Board : adaptateurs en mémoire câblés comme le ferait
 * `src/main.web.tsx`. Les steps exécutent les cas d'usage avec ces dépendances.
 */
export class BoardWorld extends World {
  /** Identifiants de tableaux et d'éléments ; « le prochain identifiant généré est … » le pilote. */
  readonly ids = new ScriptedIdGenerator();
  readonly clock = new FixedClock(DEFAULT_NOW);
  readonly gateway = new InMemoryBoardGateway(this.ids);
  readonly recentBoards = new InMemoryRecentBoards();
  private readonly memoryStore = new InMemoryBoardStore();
  readonly store: BoardStore = this.memoryStore;
  readonly history: BoardHistory = this.memoryStore;

  /** Type choisi dans la palette (« le type actif … »). */
  activeKind: StickyKind = "DomainEvent";
  /** Dernier post-it posé et dernier lien créé : « ce post-it », « ce lien ». */
  lastStickyId: string | undefined;
  lastLinkId: string | undefined;
  /** État de l'interface, pas du domaine : post-its sélectionnés, presse-papiers et derniers post-its collés. */
  selection: readonly string[] = [];
  clipboard: BoardFragment | undefined;
  pastedIds: readonly string[] = [];
  /** Contenu du tableau juste avant « j'annule » : « le tableau est inchangé » le compare. */
  contentBeforeUndo: string | undefined;

  private readonly boardIdsByName = new Map<string, BoardId>();
  private readonly pendingSync: Promise<void>[] = [];
  private error: Error | undefined;

  constructor(options: IWorldOptions) {
    super(options);
    // Synchronisation du tableau ouvert vers le serveur (en production : regroupée, côté infrastructure).
    this.store.onUpdate((update) => {
      this.pendingSync.push(this.gateway.pushUpdate(this.store.current().id, update));
    });
  }

  /** Exécute une action qui peut échouer ; l'erreur est conservée pour « j'obtiens l'erreur … ». */
  async attempt(action: () => unknown): Promise<void> {
    try {
      await action();
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      this.error = error;
    }
  }

  /** Erreur de la dernière action tentée ; la consommer évite qu'elle soit signalée en fin de scénario. */
  takeError(): Error {
    const error = this.error;
    if (error === undefined) throw new Error("Aucune erreur n'a été levée");
    this.error = undefined;
    return error;
  }

  /** Erreur levée mais jamais vérifiée par le scénario. */
  get uncheckedError(): Error | undefined {
    return this.error;
  }

  /** Crée un tableau et l'ouvre, comme le parcours « Nouveau tableau » de l'accueil. */
  async createAndOpenBoard(): Promise<BoardId> {
    const { id } = await new CreateBoard(this.gateway).execute();
    await this.openBoard(id);
    return id;
  }

  async openBoard(id: string): Promise<void> {
    await new OpenBoard(this.gateway, this.store, this.recentBoards, this.clock).execute({ id });
  }

  /** Tableau désigné par son nom dans les scénarios ; créé (et enregistré côté serveur) au premier usage. */
  async boardNamed(name: string): Promise<BoardId> {
    const known = this.boardIdsByName.get(name);
    if (known !== undefined) return known;
    const id = await this.createAndOpenBoard();
    new RenameBoard(this.store, this.recentBoards).execute({ name });
    await this.flushSync();
    this.boardIdsByName.set(name, id);
    return id;
  }

  /** Pose un post-it nommé par son texte, en dessous des précédents pour qu'ils ne se recouvrent pas. */
  placeSticky(label: string, kind: StickyKind, position = { x: 0, y: this.store.current().stickies.length * 200 }): string {
    const { id } = new PlaceSticky(this.store, this.ids).execute({ kind, position, label });
    this.lastStickyId = id;
    return id;
  }

  /** Relie deux post-its désignés par leur texte. */
  linkStickies(sourceLabel: string, targetLabel: string): void {
    const { id } = new LinkStickies(this.store, this.ids).execute({
      sourceId: this.stickyNamed(sourceLabel).id,
      targetId: this.stickyNamed(targetLabel).id,
    });
    this.lastLinkId = id;
  }

  /** Pose un post-it dont le centre est `center` (le cadre auquel il appartient en découle). */
  placeStickyCentered(label: string, kind: StickyKind, center: { x: number; y: number }): string {
    return this.placeSticky(label, kind, { x: center.x - STICKY_SIZE.width / 2, y: center.y - STICKY_SIZE.height / 2 });
  }

  /** Post-it désigné par son texte dans les scénarios. */
  stickyNamed(label: string): Sticky {
    const sticky = this.store.current().stickies.find((s) => s.label === label);
    if (sticky === undefined) throw new Error(`Aucun post-it « ${label} » sur le tableau`);
    return sticky;
  }

  get lastSticky(): Sticky {
    const sticky = this.lastStickyId === undefined ? undefined : this.store.current().sticky(this.lastStickyId);
    if (sticky === undefined) throw new Error("Aucun post-it posé dans ce scénario");
    return sticky;
  }

  /** Identifiant d'un tableau désigné par son nom s'il est connu, sinon par son identifiant. */
  boardRef(nameOrId: string): BoardId {
    return this.boardIdsByName.get(nameOrId) ?? boardId(nameOrId);
  }

  /** Attend les envois au serveur en cours ; une synchronisation rejetée fait échouer le scénario. */
  async flushSync(): Promise<void> {
    await Promise.all(this.pendingSync.splice(0));
  }
}

/** Type de post-it nommé dans un scénario ; un nom inconnu est une faute de frappe de la feature. */
export function stickyKind(raw: string): StickyKind {
  const kind = STICKY_KINDS.find((k) => k === raw);
  if (kind === undefined) throw new Error(`Type de post-it inconnu : ${raw}`);
  return kind;
}

setWorldConstructor(BoardWorld);

After(async function (this: BoardWorld, { result }) {
  await this.flushSync();
  if (result?.status === Status.PASSED && this.uncheckedError !== undefined) {
    throw new Error(`Erreur non vérifiée par le scénario : ${this.uncheckedError.message}`);
  }
});

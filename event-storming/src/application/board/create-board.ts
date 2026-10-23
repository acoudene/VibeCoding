import type { BoardId } from "../../domain/board/board";
import type { BoardGateway } from "../ports/board-gateway";

export interface CreateBoardResult {
  readonly id: BoardId;
}

/** Crée un tableau vide côté serveur (FR-001) ; on l'ouvre ensuite par son identifiant (`OpenBoard`). */
export class CreateBoard {
  constructor(private readonly gateway: BoardGateway) {}

  async execute(): Promise<CreateBoardResult> {
    return { id: await this.gateway.create() };
  }
}

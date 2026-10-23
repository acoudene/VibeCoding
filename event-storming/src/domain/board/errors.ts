/** Erreurs métier du contexte Board. */
export class EmptyBoardNameError extends Error {
  constructor() {
    super("Le nom du tableau est obligatoire");
    this.name = "EmptyBoardNameError";
  }
}

export class InvalidRectError extends Error {
  constructor() {
    super("La largeur et la hauteur d'un rectangle doivent être strictement positives");
    this.name = "InvalidRectError";
  }
}

export class EmptyBoardIdError extends Error {
  constructor() {
    super("L'identifiant du tableau est obligatoire");
    this.name = "EmptyBoardIdError";
  }
}

export class SelfLinkError extends Error {
  constructor() {
    super("Un post-it ne peut pas être relié à lui-même");
    this.name = "SelfLinkError";
  }
}

export class UnknownStickyError extends Error {
  constructor(readonly stickyId: string) {
    super(`Post-it inconnu : ${stickyId}`);
    this.name = "UnknownStickyError";
  }
}

export class UnknownLinkError extends Error {
  constructor(readonly linkId: string) {
    super(`Lien inconnu : ${linkId}`);
    this.name = "UnknownLinkError";
  }
}

export class UnknownFrameError extends Error {
  constructor(readonly frameId: string) {
    super(`Cadre inconnu : ${frameId}`);
    this.name = "UnknownFrameError";
  }
}

export class EmptyFrameNameError extends Error {
  constructor() {
    super("Le nom du cadre est obligatoire");
    this.name = "EmptyFrameNameError";
  }
}

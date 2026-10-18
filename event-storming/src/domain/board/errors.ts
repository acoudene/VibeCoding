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

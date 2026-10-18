# language: fr
@wip
Fonctionnalité: Post-its typés
  On choisit un type, jamais une couleur ; la couleur découle du type.
  (spec 002 : FR-010, FR-011, FR-012, FR-014, FR-015, FR-017 ; ADR-0016)

  Scénario: Poser un post-it du type actif à l'endroit cliqué
    Étant donné un tableau vide
    Et le type actif "Command"
    Quand je pose un post-it en (400, 300)
    Alors le tableau contient 1 post-it de type "Command" en (400, 300)
    Et ce post-it est bleu
    Et son texte est vide

  Plan du scénario: La couleur découle du type
    Étant donné un tableau vide
    Quand je pose un post-it de type "<type>"
    Alors ce post-it est <couleur>

    Exemples:
      | type           | couleur    |
      | DomainEvent    | orange     |
      | Actor          | jaune pâle |
      | Aggregate      | jaune      |
      | Policy         | violet     |
      | ReadModel      | vert       |
      | ExternalSystem | rose       |
      | Hotspot        | rouge      |
      | Rule           | gris       |

  Scénario: Tous les post-its ont la même taille
    Étant donné un tableau avec un post-it "Commande passée" de type "DomainEvent" et un post-it "Passer commande" de type "Command"
    Alors les deux post-its ont la même taille

  Scénario: Modifier le texte, l'identifiant et les notes d'un post-it
    Étant donné un tableau avec un post-it "Commande" de type "DomainEvent"
    Quand je modifie son texte en "Commande passée", son identifiant en "OrderPlaced" et ses notes en "Montant > 0"
    Alors le post-it a le texte "Commande passée", l'identifiant "OrderPlaced" et les notes "Montant > 0"

  Scénario: Changer le type d'un post-it requalifie ses liens
    Étant donné un tableau avec un lien de "Passer commande" (Command) vers "Commande" (Aggregate)
    Et ce lien respecte la grammaire
    Quand je change le type de "Commande" en "ReadModel"
    Alors le lien de "Passer commande" vers "Commande" est hors grammaire

  Scénario: Déplacer un post-it
    Étant donné un tableau avec un post-it "Commande passée" de type "DomainEvent" en (100, 100)
    Quand je déplace "Commande passée" en (250, 180)
    Alors "Commande passée" est en (250, 180)

  Scénario: Supprimer un post-it supprime ses liens
    Étant donné un tableau avec un lien de "Passer commande" (Command) vers "Commande" (Aggregate)
    Quand je supprime le post-it "Commande"
    Alors le tableau ne contient plus "Commande"
    Et le tableau ne contient aucun lien

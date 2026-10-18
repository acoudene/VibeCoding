# language: fr
Fonctionnalité: Liens entre post-its
  Un lien hors grammaire est accepté mais signalé ; on ne bloque jamais l'atelier.
  (spec 002 : FR-020, FR-022, FR-023, FR-024 ; grammaire de docs/domain/README.md)

  Plan du scénario: Un lien conforme à la grammaire « design level »
    Étant donné un tableau avec un post-it "A" de type "<source>" et un post-it "B" de type "<cible>"
    Quand je relie "A" à "B"
    Alors le lien de "A" vers "B" respecte la grammaire

    Exemples:
      | source         | cible       |
      | Actor          | Command     |
      | Command        | Aggregate   |
      | Aggregate      | DomainEvent |
      | DomainEvent    | Policy      |
      | Policy         | Command     |
      | DomainEvent    | ReadModel   |
      | ReadModel      | Actor       |
      | ExternalSystem | DomainEvent |
      | Command        | ExternalSystem |
      | Rule           | Aggregate   |

  Scénario: Un lien hors grammaire est créé mais signalé
    Étant donné un tableau avec un post-it "Commande passée" de type "DomainEvent" et un post-it "Passer commande" de type "Command"
    Quand je relie "Commande passée" à "Passer commande"
    Alors le lien de "Commande passée" vers "Passer commande" est hors grammaire
    Et la règle attendue citée est "DomainEvent → Policy, DomainEvent → ReadModel"

  Scénario: Un post-it ne peut pas être relié à lui-même
    Étant donné un tableau avec un post-it "Commande passée" de type "DomainEvent"
    Quand je relie "Commande passée" à "Commande passée"
    Alors j'obtiens l'erreur "Un post-it ne peut pas être relié à lui-même"
    Et le tableau ne contient aucun lien

  Scénario: Inverser un lien
    Étant donné un tableau avec un lien de "Commande passée" (DomainEvent) vers "Passer commande" (Command)
    Quand j'inverse ce lien
    Alors le tableau contient un lien de "Passer commande" vers "Commande passée"
    Et ce lien est hors grammaire

  Scénario: Supprimer un lien conserve les post-its
    Étant donné un tableau avec un lien de "Passer commande" (Command) vers "Commande" (Aggregate)
    Quand je supprime ce lien
    Alors le tableau ne contient aucun lien
    Et le tableau contient 2 post-its

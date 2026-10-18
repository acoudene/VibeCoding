# language: fr
Fonctionnalité: Sélection, presse-papiers et historique
  (spec 002 : FR-041, FR-042, FR-043, FR-044 ; ADR-0016)

  Scénario: Supprimer une sélection
    Étant donné un tableau avec un lien de "Passer commande" (Command) vers "Commande" (Aggregate)
    Et un post-it "Client" de type "Actor"
    Quand je sélectionne "Passer commande" et "Client"
    Et je supprime la sélection
    Alors le tableau ne contient que "Commande"
    Et le tableau ne contient aucun lien

  Scénario: Dupliquer place la copie juste en dessous et la sélectionne
    Étant donné un tableau avec un post-it "Commande passée" de type "DomainEvent" en (100, 100)
    Quand je sélectionne "Commande passée"
    Et je duplique la sélection
    Alors le tableau contient 2 post-its "Commande passée" de type "DomainEvent"
    Et la copie est juste en dessous de l'original
    Et la sélection contient uniquement la copie

  Scénario: Copier-coller au pointeur conserve les liens internes à la sélection
    Étant donné un tableau avec un lien de "Passer commande" (Command) vers "Commande" (Aggregate)
    Et un post-it "Client" de type "Actor"
    Et un lien de "Client" vers "Passer commande"
    Quand je sélectionne "Passer commande" et "Commande"
    Et je copie la sélection
    Et je colle au pointeur en (2000, 1000)
    Alors le tableau contient 5 post-its
    Et les post-its collés sont groupés autour de (2000, 1000)
    Et le tableau contient 3 liens
    Et le lien collé relie les copies de "Passer commande" et "Commande"

  Scénario: Annuler puis rétablir une opération
    Étant donné un tableau vide
    Et le type actif "DomainEvent"
    Quand je pose un post-it en (100, 100)
    Et je modifie son texte en "Commande passée"
    Et j'annule
    Alors le post-it est toujours présent avec un texte vide
    Quand je rétablis
    Alors le post-it a le texte "Commande passée"

  Scénario: Rien à annuler
    Étant donné un tableau vide
    Quand j'annule
    Alors le tableau est inchangé

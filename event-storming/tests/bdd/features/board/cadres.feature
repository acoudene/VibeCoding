# language: fr
@wip
Fonctionnalité: Cadres de contextes bornés
  Un cadre représente un contexte borné ; un post-it appartient au cadre qui contient son centre.
  (spec 002 : FR-030, FR-031, FR-032 ; docs/domain/README.md)

  Scénario: Les nouveaux cadres sont nommés « Contexte N »
    Étant donné un tableau vide
    Quand je dessine un cadre de (0, 0) à (800, 600)
    Et je dessine un cadre de (1000, 0) à (1800, 600)
    Alors les cadres s'appellent "Contexte 1" et "Contexte 2"

  Scénario: Un post-it appartient au cadre qui contient son centre
    Étant donné un tableau avec un cadre "Commandes" de (0, 0) à (800, 600)
    Et un post-it "Commande passée" de type "DomainEvent" centré en (400, 300)
    Et un post-it "Colis expédié" de type "DomainEvent" centré en (900, 300)
    Alors "Commande passée" appartient au cadre "Commandes"
    Et "Colis expédié" n'appartient à aucun cadre

  Scénario: Avec des cadres imbriqués, le post-it appartient au plus petit
    Étant donné un tableau avec un cadre "Ventes" de (0, 0) à (2000, 1000)
    Et un cadre "Paiement" de (100, 100) à (700, 600)
    Et un post-it "Paiement accepté" de type "DomainEvent" centré en (400, 300)
    Alors "Paiement accepté" appartient au cadre "Paiement"

  Scénario: Déplacer un cadre déplace ses post-its
    Étant donné un tableau avec un cadre "Commandes" de (0, 0) à (800, 600)
    Et un post-it "Commande passée" de type "DomainEvent" centré en (400, 300)
    Et un post-it "Colis expédié" de type "DomainEvent" centré en (900, 300)
    Quand je déplace le cadre "Commandes" de (100, 50)
    Alors le cadre "Commandes" va de (100, 50) à (900, 650)
    Et "Commande passée" est centré en (500, 350)
    Et "Colis expédié" est centré en (900, 300)

  Scénario: Renommer un cadre
    Étant donné un tableau avec un cadre "Contexte 1" de (0, 0) à (800, 600)
    Quand je renomme le cadre "Contexte 1" en "Livraison"
    Alors le tableau contient un cadre "Livraison"

  Scénario: Redimensionner un cadre change l'appartenance
    Étant donné un tableau avec un cadre "Commandes" de (0, 0) à (800, 600)
    Et un post-it "Colis expédié" de type "DomainEvent" centré en (900, 300)
    Quand je redimensionne le cadre "Commandes" de (0, 0) à (1000, 600)
    Alors "Colis expédié" appartient au cadre "Commandes"

  Scénario: Supprimer un cadre conserve ses post-its
    Étant donné un tableau avec un cadre "Commandes" de (0, 0) à (800, 600)
    Et un post-it "Commande passée" de type "DomainEvent" centré en (400, 300)
    Quand je supprime le cadre "Commandes"
    Alors le tableau ne contient aucun cadre
    Et "Commande passée" n'appartient à aucun cadre

# language: fr
Fonctionnalité: Types de post-it
  Le type d'un post-it détermine sa couleur ; la couleur n'est jamais saisie.

  Scénario: Un événement de domaine est orange
    Étant donné un post-it de type "DomainEvent"
    Alors sa couleur est "orange"

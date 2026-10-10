# language: fr
Fonctionnalité: Résolution d'un tour avec test de caractéristique
  Le Game Master IA arbitre l'action d'un joueur ; les règles SRD 5.1 restent déterministes.

  Contexte:
    Étant donné une partie "s1" avec le joueur "p1"

  Scénario: Une action sans risque ne déclenche aucun test
    Étant donné que l'arbitre décide qu'aucun test n'est requis
    Quand "p1" joue l'action "je regarde autour de moi"
    Alors le tour 1 est enregistré avec la narration "Rien d'inquiétant."

  Scénario: Une action risquée déclenche un test réussi
    Étant donné que l'arbitre exige un test de difficulté 12
    Et que le dé donne 14
    Quand "p1" joue l'action "je force la porte"
    Alors le narrateur reçoit le résultat "réussite"

  Scénario: Une action risquée déclenche un test raté
    Étant donné que l'arbitre exige un test de difficulté 12
    Et que le dé donne 5
    Quand "p1" joue l'action "je force la porte"
    Alors le narrateur reçoit le résultat "échec"

# language: fr
Fonctionnalité: Fiche de personnage minimale
  Chaque joueur crée un personnage dont les caractéristiques (tableau standard SRD) déterminent ses tests.

  Contexte:
    Étant donné une partie "s1" avec le joueur "p1"

  Scénario: Créer un personnage avec le tableau standard
    Quand "p1" crée le personnage "Aria" avec FOR 15, DEX 14, CON 13, INT 12, SAG 10, CHA 8
    Alors le personnage "Aria" existe pour "p1"

  Scénario: Répartition hors tableau standard refusée
    Quand "p1" crée le personnage "Aria" avec FOR 18, DEX 14, CON 13, INT 12, SAG 10, CHA 8
    Alors la création est refusée pour "répartition invalide"

  Scénario: Nom vide refusé
    Quand "p1" crée le personnage "" avec FOR 15, DEX 14, CON 13, INT 12, SAG 10, CHA 8
    Alors la création est refusée pour "nom requis"

  Scénario: Un seul personnage par joueur et par partie
    Étant donné que "p1" a le personnage "Aria" avec FOR 15, DEX 14, CON 13, INT 12, SAG 10, CHA 8
    Quand "p1" crée le personnage "Borin" avec FOR 15, DEX 14, CON 13, INT 12, SAG 10, CHA 8
    Alors la création est refusée pour "personnage déjà existant"

  Scénario: Joueur absent de la partie refusé
    Quand "p9" crée le personnage "Zed" avec FOR 15, DEX 14, CON 13, INT 12, SAG 10, CHA 8
    Alors la création est refusée pour "joueur absent de la partie"

  Scénario: Le test utilise la caractéristique du personnage
    Étant donné que "p1" a le personnage "Aria" avec FOR 8, DEX 14, CON 13, INT 12, SAG 10, CHA 15
    Et que l'arbitre exige un test de CHA de difficulté 12
    Et que le dé donne 10
    Quand "p1" joue l'action "je charme le garde"
    Alors le narrateur reçoit le résultat "réussite"

  Scénario: Une caractéristique faible fait échouer le même jet
    Étant donné que "p1" a le personnage "Aria" avec FOR 8, DEX 14, CON 13, INT 12, SAG 10, CHA 15
    Et que l'arbitre exige un test de FOR de difficulté 10
    Et que le dé donne 10
    Quand "p1" joue l'action "je soulève la herse"
    Alors le narrateur reçoit le résultat "échec"

  Scénario: Le test utilise le personnage du joueur qui agit
    Étant donné une partie "s1" avec les joueurs "p1" et "p2"
    Et que "p1" a le personnage "Aria" avec FOR 8, DEX 14, CON 13, INT 12, SAG 10, CHA 15
    Et que "p2" a le personnage "Borin" avec FOR 15, DEX 14, CON 13, INT 12, SAG 10, CHA 8
    Et que l'arbitre exige un test de CHA de difficulté 10
    Et que le dé donne 8
    Quand "p2" joue l'action "je persuade le marchand"
    Alors le narrateur reçoit le résultat "échec"

  Scénario: Caractéristique inconnue proposée par l'arbitre
    Étant donné que "p1" a le personnage "Aria" avec FOR 8, DEX 14, CON 13, INT 12, SAG 10, CHA 15
    Et que l'arbitre exige un test de LUCK de difficulté 12
    Quand "p1" joue l'action "je tente ma chance"
    Alors le tour est refusé car la réponse de l'arbitre est invalide

  Scénario: Jouer sans personnage est impossible
    Quand "p1" joue l'action "j'avance"
    Alors le tour est refusé car le joueur n'a pas de personnage

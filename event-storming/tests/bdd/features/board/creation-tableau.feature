# language: fr
@wip
Fonctionnalité: Création et ouverture d'un tableau
  Un animateur crée un tableau, le retrouve par son URL et dans la liste des tableaux récents de son navigateur.
  (spec 002 : FR-001, FR-002, FR-005, FR-006)

  Scénario: Créer un tableau lui donne un identifiant et un nom par défaut
    Étant donné que le prochain identifiant généré est "b-7f3a9c2e"
    Quand je crée un tableau
    Alors le tableau "b-7f3a9c2e" existe
    Et son nom est "Tableau sans titre"
    Et il ne contient aucun post-it, aucun lien et aucun cadre

  Scénario: Ouvrir un tableau inconnu
    Quand j'ouvre le tableau "b-inconnu"
    Alors j'obtiens l'erreur "Tableau introuvable"

  Scénario: Renommer un tableau
    Étant donné un tableau vide
    Quand je renomme le tableau en "Atelier commandes"
    Alors son nom est "Atelier commandes"

  Scénario: Un nom de tableau vide est refusé
    Étant donné un tableau vide
    Quand je renomme le tableau en "   "
    Alors j'obtiens l'erreur "Le nom du tableau est obligatoire"
    Et son nom est "Tableau sans titre"

  Scénario: Les tableaux ouverts apparaissent dans les tableaux récents, du plus récent au plus ancien
    Étant donné qu'il est "2026-10-18T10:00:00Z" et que j'ouvre le tableau "Atelier A"
    Et qu'il est "2026-10-18T11:00:00Z" et que j'ouvre le tableau "Atelier B"
    Alors les tableaux récents sont, dans l'ordre :
      | nom       |
      | Atelier B |
      | Atelier A |

  Scénario: Retirer un tableau des récents ne le supprime pas
    Étant donné que j'ai ouvert le tableau "Atelier A"
    Quand je retire "Atelier A" des tableaux récents
    Alors les tableaux récents sont vides
    Et le tableau "Atelier A" existe toujours

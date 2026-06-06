# Spécification fonctionnelle — Call Screening

## 1. Vision

Une application backend qui **filtre les appels entrants pour éviter le spam**, en
s'appuyant sur une **liste noire de préfixes téléphoniques interdits**. Quand un appel
provient d'un numéro dont le préfixe est interdit, l'appel est **renvoyé en messagerie**
et **marqué comme spam** (avec notification). Les autres appels passent normalement.

Le cœur est un moteur de décision indépendant de la téléphonie ; un adaptateur Twilio
permet de brancher de vrais appels (réponse TwiML).

## 2. Acteurs

- **Appelant** : émet un appel entrant (numéro E.164, ex. `+33899700000`).
- **Fournisseur téléphonie** (Twilio ou webhook générique) : notifie l'app d'un appel
  entrant et applique la décision rendue.
- **Administrateur** : gère la liste des préfixes interdits via API/UI.

## 3. Concepts du domaine

- **Numéro** : chaîne au format E.164 normalisé (`+` suivi de chiffres). L'entrée peut
  arriver non normalisée (`0899...`, espaces, tirets) et doit être normalisée.
- **Préfixe interdit** : un motif de début de numéro normalisé (ex. `+33899`). Un numéro
  *correspond* si son E.164 commence par ce préfixe.
- **Décision** : résultat de l'évaluation d'un numéro → `ALLOW` ou `BLOCK`, avec l'action
  associée et, si bloqué, le préfixe ayant déclenché le blocage.
- **Action de blocage** : `VOICEMAIL` (renvoi messagerie) + marquage `spam`.
- **Journal d'appel (CallLog)** : trace persistante de chaque évaluation.

## 4. Exigences fonctionnelles

### FR-1 — Normalisation du numéro
Le système normalise tout numéro entrant en E.164 avant évaluation.
- Supprime espaces, tirets, points, parenthèses.
- `00XXXX...` → `+XXXX...`.
- Un numéro national français `0XXXXXXXXX` est interprété avec l'indicatif pays par
  défaut configuré (`DEFAULT_COUNTRY_CODE`, défaut `+33`) → `0899700000` → `+33899700000`.
- Un numéro déjà en `+...` est conservé tel quel (après nettoyage des séparateurs).
- Une entrée vide ou non numérique est invalide → décision `ALLOW` mais journalisée comme
  `invalid` (on ne bloque jamais sur une entrée qu'on ne comprend pas).

### FR-2 — Évaluation par liste noire de préfixes
Étant donné un numéro normalisé et l'ensemble des préfixes interdits actifs :
- Si le numéro **commence par au moins un** préfixe interdit → `BLOCK`.
- En cas de plusieurs préfixes correspondants, on retient **le plus long** (le plus
  spécifique) comme préfixe déclencheur.
- Sinon → `ALLOW`.
- L'évaluation est insensible aux séparateurs mais sensible à la valeur normalisée.

### FR-3 — Action sur blocage
Quand la décision est `BLOCK` :
- L'action retournée est `VOICEMAIL`.
- L'appel est marqué `spam = true`.
- (Notification : un événement de notification est émis/journalisé ; le canal réel
  — push/email — est hors périmètre v1, on journalise l'intention.)

### FR-4 — Gestion des préfixes (CRUD)
L'administrateur peut :
- **Lister** les préfixes interdits.
- **Ajouter** un préfixe (valeur + libellé optionnel). Le préfixe est normalisé et
  validé (`+` puis chiffres, longueur ≥ 2). Un doublon est rejeté (409).
- **Supprimer** un préfixe par identifiant.
Les modifications prennent effet immédiatement sur les évaluations suivantes.

### FR-5 — Journalisation
Chaque appel évalué crée un `CallLog` : numéro brut, numéro normalisé, décision, action,
préfixe déclencheur (si bloqué), spam (bool), horodatage.
L'administrateur peut **lister** les journaux (ordre antéchronologique).

### FR-6 — Endpoint d'appel entrant (cœur générique)
`POST /api/calls/incoming` reçoit `{ from: string }` et retourne :
```json
{ "decision": "BLOCK", "action": "VOICEMAIL", "spam": true, "matchedPrefix": "+33899", "normalized": "+33899700000" }
```
ou pour un appel autorisé :
```json
{ "decision": "ALLOW", "action": "RING", "spam": false, "normalized": "+33612345678" }
```
L'appel est journalisé dans tous les cas.

### FR-7 — Adaptateur Twilio (TwiML)
`POST /api/twilio/voice` reçoit un webhook Twilio (form-encoded, champ `From`) et
retourne du **TwiML** :
- `BLOCK` → `<Response><Say>...</Say><Reject reason="rejected"/></Response>` ou redirection
  voicemail (`<Dial>`/`<Redirect>` vers messagerie) — v1 : message + raccrochage poli +
  marquage. Réutilise exactement le même moteur de décision que FR-6.
- `ALLOW` → TwiML laissant sonner (ex. `<Dial>` ou réponse vide).
L'appel est journalisé comme pour FR-6.

### FR-8 — UI d'administration
Page web `/admin` :
- Affiche la liste des préfixes interdits, permet d'en ajouter et d'en supprimer.
- Affiche le journal des appels récents (numéro, décision, préfixe, spam, date).

## 5. Exigences non fonctionnelles

- **NFR-1** : la décision est rendue de façon déterministe et < 200 ms hors latence DB.
- **NFR-2** : aucune donnée d'appel n'est perdue silencieusement (journalisation systématique).
- **NFR-3** : la liste de préfixes peut contenir des centaines d'entrées sans dégradation
  notable (recherche par préfixe).
- **NFR-4** : configuration via variables d'environnement (`DATABASE_URL`,
  `DEFAULT_COUNTRY_CODE`).

## 6. Hors périmètre (v1)

- Canaux de notification réels (push/email/SMS) — on journalise l'intention.
- Liste blanche / exceptions.
- Règles horaires, fréquence, scoring.
- Authentification de l'admin (ajoutée ultérieurement ; v1 suppose un accès de confiance).
- Apps natives iOS/Android.

## 7. Critères d'acceptation (vérifiés en E2E)

- **AC-1** : Préfixe `+33899` interdit ⇒ `POST /api/calls/incoming {from:"0899700000"}`
  renvoie `decision=BLOCK, action=VOICEMAIL, spam=true, matchedPrefix=+33899`.
- **AC-2** : Aucun préfixe correspondant ⇒ `{from:"+33612345678"}` renvoie `decision=ALLOW`.
- **AC-3** : Ajout d'un préfixe via l'API le rend actif immédiatement pour l'évaluation.
- **AC-4** : Suppression d'un préfixe via l'API laisse repasser un numéro auparavant bloqué.
- **AC-5** : Chaque évaluation apparaît dans `GET /api/logs`.
- **AC-6** : Le webhook Twilio renvoie du TwiML de rejet/voicemail pour un préfixe interdit.
- **AC-7** : La page `/admin` affiche les préfixes et permet d'en ajouter un (E2E navigateur).

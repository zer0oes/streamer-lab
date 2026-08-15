# Streamer Lab

Un environnement local pour développer et tester des **Custom Widgets StreamElements et Streamlabs** sans modifier un overlay déjà publié, avec en complément un **éditeur d’overlays** visuel (mise en page par calques) qui réutilise cette même bibliothèque de widgets.

Le widget s’exécute dans une iframe isolée et reçoit les mêmes événements navigateur que sur StreamElements :

- `onWidgetLoad` avec `fieldData`, `session`, `recents`, `currency` et `channel` ;
- `onEventReceived` pour les follows, abonnements, dons, cheers, raids, messages et boutons ;
- `onSessionUpdate` après une modification de session ;
- une émulation locale des fonctions courantes de `SE_API`, notamment le store persistant.

Le serveur peut également relayer les événements réels du canal via le gateway WebSocket Astro. Le jeton reste dans le processus Node local : il n’est ni envoyé à l’iframe, ni enregistré dans le navigateur.

## Démarrage

Prérequis : Node.js 18 ou plus récent.

```powershell
npm install
npm run dev
```

`npm install` installe aussi les dépendances de `frontend/` (via `postinstall`). `npm run dev` ouvre automatiquement [http://localhost:4173](http://localhost:4173) dans le navigateur par défaut. Toute modification du frontend (`frontend/src/`, y compris `styles/*.scss` qu'il importe directement) ou de la bibliothèque `library/` recharge la page automatiquement (rechargement complet pour le frontend, rafraîchissement ciblé de l'aperçu pour un widget de `library/`). Les changements dans `server.mjs` ou `lib/` nécessitent en revanche de relancer `npm run dev` manuellement.

`npm run dev` build d'abord le frontend Vue (`frontend/` vers `frontend/dist/`, gitignoré) puis lance le serveur et un watcher Vite en parallèle : toute modification dans `frontend/src/` recompile automatiquement. `npm start` fait un build unique sans watcher, pour une exécution proche de la production. Pendant un développement frontend actif (itération rapide sur l'UI), `npm run dev:vue` lance à la place le serveur de dev Vite seul (rechargement à chaud, proxy `/api` vers le serveur Node qui doit tourner en parallèle sur le port 4173) : c'est le mode le plus confortable pour modifier des composants Vue, mais il ne sert pas le build final. `npm run typecheck` vérifie les types TypeScript du frontend sans build.

Le code source du frontend vit dans `frontend/` : Vue 3 (Composition API, `<script setup>`), TypeScript, Pinia pour l'état partagé, Vitest pour les tests unitaires de la logique pure (snapping du canevas d'overlay, tokenizer de surlignage syntaxique, construction du document `srcdoc` de l'aperçu, export ZIP, etc.). Il n'y a pas de routeur : la bascule entre le dashboard et les deux éditeurs (widget/alerte, overlay) est un simple état, pas une vraie navigation d'URL, mais les liens `?widget=<id>` et `?overlay=<id>` restent pris en charge pour ouvrir directement un élément.

`styles/` est organisé en trois dossiers : `base/` (tokens, reset, atomes partagés comme `.eyebrow`/`.hint`), `layouts/` (les régions macro de la page : topbar, sidebar, preview, dashboard) et `components/` (pièces UI autonomes : bibliothèque, éditeur, simulateur d'événements, tiroir compte, boutons/formulaires, toast). `_responsive.scss` reste à la racine, hors de ces trois dossiers, car ses règles touchent plusieurs composants par palier de largeur.

Les classes suivent la convention BEM (`bloc__élément--modificateur`), avec les sélecteurs imbriqués via `&` dans chaque partial (`&__élément`, `&--modificateur`, `&:état`) plutôt qu'une liste plate de sélecteurs répétés. Deux exceptions documentées dans le code : `.material-symbols-rounded` (classe vendor de la police d'icônes) et les classes `.tok-*` du surlignage syntaxique (namespace plat façon `hljs-*`) ne suivent pas BEM et ne sont pas imbriquées.

Le mode simulation fonctionne immédiatement. La bibliothèque située dans `library/` est organisée en **projets** : chaque projet a son propre dossier `library/<id-projet>/`, contenant lui-même `overlays/`, `widgets/` et `alerts/`. Un overlay/widget/alerte appartient à un seul projet à la fois ; le panneau **Ma bibliothèque** regroupe la liste sous un en-tête repliable par projet, et un bouton « Nouveau projet » permet d'en créer d'autres (icône, nom, description). `library/media/` reste partagé entre tous les projets. Une bibliothèque existante créée avant l'introduction des projets est migrée automatiquement, une seule fois, au démarrage du serveur, dans un projet nommé « Bibliothèque principale » (`library/principal/`). Les changements apportés au widget actif déclenchent automatiquement un rechargement de l’aperçu, sans dépendre du mode `node --watch` de Node.

L’éditeur intégré, placé entre l’aperçu et la console, permet aussi de modifier directement les quatre fichiers utilisés par la plateforme active. L’aperçu est actualisé pendant la saisie et les changements sont enregistrés automatiquement dans `library/`. `Ctrl + S` force l’enregistrement immédiat. L’onglet **Fields** vérifie que le JSON est valide avant toute sauvegarde.

## Choisir la plateforme simulée

Le sélecteur placé dans l’en-tête permet de passer d’un environnement à l’autre :

- **StreamElements** : événements `onWidgetLoad`, `onEventReceived` et `onSessionUpdate` sur `window`, payload `{ listener, event }` et émulation de `SE_API` ;
- **Streamlabs** : événement `onLoad` avec `detail.custom_json`, puis `onEventReceived` sur `document` avec l’événement directement dans `detail`.

Le choix est mémorisé dans le navigateur. Il sélectionne également la version locale de **JS** et de **Fields** correspondante. Les simulations Follow, Sub, Tip, Bits, Raid et Chat utilisent le format de la plateforme sélectionnée.

Le menu d’export génère une archive ZIP prête à copier dans l’éditeur de la plateforme active, ou permet de la convertir directement pour l’autre plateforme. Elle contient les quatre onglets, les valeurs de champs actuellement réglées et un fichier d’instructions. Lorsque le code utilise uniquement les événements de l’autre plateforme, un pont de compatibilité est automatiquement ajouté au début du JavaScript exporté.

## Développer un widget

Chaque widget possède son propre dossier, accompagné d’un fichier `widget.json` qui définit son nom, sa description et son icône. La bibliothèque dans le panneau de gauche (« Ma bibliothèque ») propose deux onglets, **Widgets** et **Alertes**, pour passer de l’un à l’autre sans déplacer de fichiers ; l’onglet actif détermine dans quel sous-dossier (`widgets/` ou `alerts/`) du projet choisi un nouveau widget est créé — la création demande explicitement le projet cible. Le crayon placé sur chaque entrée permet de modifier ces informations, de choisir visuellement une icône Material, et de basculer un widget entre les deux catégories (ce qui déplace son dossier) ; déplacer un widget vers un autre projet n’est pas pris en charge depuis l’interface. Les sections **Ma bibliothèque** et **Champs** peuvent être repliées ; leur état est mémorisé dans le navigateur.

Par exemple, le dossier `library/principal/widgets/zer0oes-goal-bar/` contient :

| Fichier local | Plateforme | Onglet |
|---|---|---|
| `widget.html` | Commun | HTML |
| `widget.css` | Commun | CSS |
| `widget.streamelements.js` | StreamElements | JS |
| `fields.streamelements.json` | StreamElements | FIELDS |
| `widget.streamlabs.js` | Streamlabs | JS |
| `fields.streamlabs.json` | Streamlabs | FIELDS |
| `data.streamelements.json` | StreamElements | DATA |
| `data.streamlabs.json` | Streamlabs | DATA |

Le widget d’exemple affiche le dernier événement avec une animation. Il peut être remplacé sans modifier le code du laboratoire.

Les valeurs de champs sont disponibles via `event.detail.fieldData` et les formes `{{nomDuChamp}}` / `{nomDuChamp}` sont remplacées dans le HTML, le CSS et le JavaScript. Les valeurs modifiées dans l’interface locale sont conservées dans le stockage du navigateur.

L’onglet **DATA** contient un objet JSON libre (`{}` par défaut) fusionné sous les valeurs de Fields avant chaque envoi de `fieldData` à l’aperçu. Il sert à rejouer fidèlement un payload brut récupéré manuellement depuis la vraie plateforme (par exemple des clés parasites laissées par un ancien widget dans le même emplacement d’overlay), sans polluer le schéma de Fields. StreamElements n’exposant aucune API publique pour récupérer ces valeurs, ce contenu doit être collé à la main depuis le tableau de bord de la plateforme.

Les données initiales de session se trouvent dans `mocks/session.json`. Le panneau **Événement JSON personnalisé** permet d’envoyer directement le contenu de `detail` attendu par `onEventReceived`.

## Éditeur d’overlays

En plus du mode simulation, un éditeur visuel permet de composer un overlay complet par calques, en réutilisant les widgets et alertes de la bibliothèque. Il partage la même application que le simulateur : la bibliothèque de gauche propose un onglet **Overlays** à côté de **Widgets** et **Alertes**, et ouvrir un overlay bascule le panneau principal vers la vue édition (lien direct possible via `?overlay=<id>`).

Un overlay est composé d’éléments positionnés librement sur un canevas : widget ou alerte de la bibliothèque, texte, image, vidéo, embed (URL uniquement — les `data:` URI sont refusées), icône, forme ou groupe. Le canevas propose des formats prédéfinis 16:9 et 9:16, ou des dimensions personnalisées (100 à 7680 px).

- **Calques** : réordonner, renommer, masquer et verrouiller depuis le panneau dédié ; les enfants d'un groupe s'affichent indentés sous lui.
- **Barre d’outils** : outil sélection, menu « Ajouter » (widget/alerte existant de la bibliothèque, ou nouveau texte/image/icône/forme/vidéo/embed depuis un lien), groupement, duplication, suppression, centrage, alignement (6 directions) et répartition horizontale/verticale.
- **Zoom** avec boutons `+`/`−` et pourcentage cliquable pour ajuster à la fenêtre.
- Le déplacement et le redimensionnement (poignées aux 4 coins, y compris un redimensionnement proportionnel pour un groupe entier) s'accrochent au centre horizontal/vertical du canevas.
- **Annuler/rétablir** : `Ctrl/Cmd + Z`, `Ctrl/Cmd + Maj + Z` ou `Ctrl/Cmd + Y` ; `Ctrl/Cmd + D` duplique la sélection ; `Suppr`/`Retour arrière` supprime la sélection ; `Échap` la vide. Ces raccourcis sont inactifs pendant l'édition d'un champ texte.

Chaque overlay est enregistré dans `library/<id-projet>/overlays/<id>/overlay.json` (taille de canevas, éléments, guides, dates), sur le même principe que les widgets. Un overlay ne peut référencer que des widgets/alertes de son propre projet.

Écarts encore ouverts par rapport à la bibliothèque d'origine : pas de règles/guides visuels ni de repères personnalisés déplaçables (seul l'accrochage au centre du canevas est actif), pas de pipette de style pour un texte, pas de réglages avancés de texte (dégradé, ombre, contour) ni de personnalisation des valeurs de champs par item widget/alerte depuis le canevas, et pas encore d'export ZIP dédié à un overlay complet (l'export ZIP d'un widget/alerte individuel, lui, est disponible depuis son éditeur).

## Comptes et médias

Un panneau compte, accessible depuis la barre du haut, permet de connecter des comptes externes — ces connexions sont optionnelles et indépendantes du flux d’événements réels décrit ci-dessous.

- **Twitch** (`dev.twitch.tv/console/apps`) active le panneau compte et une session locale signée.
- **StreamElements (OAuth2)** sert uniquement à alimenter la section **Médias** de la bibliothèque, en retrouvant les images/vidéos déjà utilisées dans les overlays existants du compte connecté. C’est une connexion **en lecture seule** : le laboratoire ne publie ni ne modifie rien sur StreamElements, y compris pour les overlays composés dans l’éditeur. Les identifiants ne sont pas en self-service (à demander au support StreamElements) et StreamElements n’accepte pas `localhost` comme `redirect_uri` ; la procédure de contournement (fichier hosts) est détaillée dans `.env.example`. Un jeton manuel (JWT ou clé API) déjà renseigné pour les événements réels alimente aussi cette section Médias, sans passer par l’OAuth2.

La bibliothèque propose également une section **Médias locaux**, indépendante de tout compte : import de fichiers (25 Mo max, nom normalisé), stockés dans `library/media/` et servis sous `/library-media/`.

Les jetons des comptes connectés sont chiffrés (`TOKEN_ENCRYPTION_KEY`) et stockés dans `data/app.sqlite`.

## Recevoir les événements réels

1. Copier le fichier d’exemple :

   ```powershell
   Copy-Item .env.example .env
   ```

2. Dans le dashboard StreamElements, sélectionner le bon compte/canal puis copier son JWT ou son Overlay Token.

3. Renseigner au minimum :

   ```dotenv
   SE_CHANNEL_ID=identifiant_interne_du_canal
   SE_CHANNEL_NAME=NomDeLaChaine
   SE_TOKEN=le_jeton
   SE_TOKEN_TYPE=jwt
   ```

4. Redémarrer `npm run dev`.

Le statut en haut à droite devient `connected`. Les sujets configurés par défaut sont :

- `channel.activities` ;
- `channel.session.update` ;
- `channel.session.reset` ;
- `channel.chat.message`.

Ils sont modifiables avec `SE_TOPICS`. Le jeton doit disposer des scopes correspondant aux sujets demandés (`activities:read`, `session:read`, `overlays:read`, etc.). Si un abonnement est refusé, le détail apparaît dans le statut de l’interface.

> Ne jamais versionner `.env` ni exposer le JWT/Overlay Token. `.env` est déjà ignoré par Git.

### Streamlabs

1. Dans le dashboard Streamlabs, aller dans **Réglages > API Settings** et copier le **Socket API Token**.
2. Renseigner dans `.env` :

   ```dotenv
   SL_SOCKET_TOKEN=le_jeton
   ```

3. Redémarrer `npm run dev`.

Le statut passe à `connected` dès que la plateforme simulée sélectionnée en haut de la page est **Streamlabs**. Les deux connexions (StreamElements et Streamlabs) peuvent tourner en parallèle indépendamment ; l’indicateur affiche toujours le statut de la plateforme actuellement sélectionnée dans l’outil. Les événements réels reçus (follow, subscription, donation, host, bits) sont convertis vers la forme interne du laboratoire puis retraduits au format natif de la plateforme simulée avant d’être envoyés au widget.

> Le Socket API Streamlabs utilise le protocole socket.io v2 ; ne pas mettre à jour la dépendance `socket.io-client` vers une version majeure supérieure sans vérifier la compatibilité.

## Compatibilité et limites

- jQuery est chargé avant le code du widget, comme dans l’environnement StreamElements.
- `SE_API.store.get/set`, `getOverlayStatus`, `setField`, `resumeQueue`, `sanitize`, `cheerFilter` et `counters.get` possèdent une émulation locale. Les compteurs renvoient actuellement `0`, et la reprise de queue est simulée.
- Les payloads chat Astro Twitch, YouTube et Kick sont normalisés vers la forme historique `obj.detail.event.data`. Le payload original reste disponible dans `_raw`.
- Le laboratoire ne publie rien sur StreamElements, ni pour les widgets ni pour les overlays composés dans l’éditeur (la connexion OAuth2 associée est en lecture seule). La mise en production reste volontaire : copier les quatre fichiers dans un nouveau Custom Widget, valider, puis seulement remplacer le widget utilisé par l’overlay.

## Vérification

```powershell
npm test
```

`npm test` enchaîne les tests backend (`node --test` : conversion des activités, mises à jour de session, messages chat Astro, bibliothèque de widgets/overlays/projets…) puis les tests frontend (`npm run test:frontend`, Vitest : logique pure du frontend Vue — snapping et géométrie du canevas d'overlay, tokenizer de surlignage syntaxique, construction du `srcdoc` de l'aperçu, export ZIP…). `npm run typecheck` vérifie séparément les types TypeScript du frontend.

## Réinstallation propre

En cas de comportement étrange (dépendances corrompues, build frontend obsolète, session Twitch bloquée), repartir d'un état propre :

```powershell
npm run reinstall
npm run dev
```

`npm run reinstall` exécute `scripts/clean.mjs` (suppression de `node_modules` à la racine et dans `frontend/`, du build `frontend/dist/` et de `data/app.sqlite` via l'API `fs` de Node, donc indépendant du shell) puis `npm install` (qui réinstalle aussi `frontend/` via `postinstall`).

- `node_modules/` (racine et `frontend/`) : réinstallés par `npm install` à partir des `package-lock.json` respectifs.
- `frontend/dist/` : régénéré automatiquement au prochain `npm run dev`, `npm start` ou `npm run build`.
- `data/app.sqlite` : base SQLite locale (comptes Twitch et StreamElements liés, jetons chiffrés, sessions). La supprimer réinitialise l'authentification et l'historique local ; elle est recréée automatiquement au démarrage du serveur.
- `.env` n'est **pas** supprimé par cette procédure : il contient les jetons (`SE_TOKEN`, `SL_SOCKET_TOKEN`, secrets OAuth Twitch et StreamElements, `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`) et n'est pas versionné. Le recréer avec `Copy-Item .env.example .env` uniquement si besoin de repartir aussi de zéro sur la config.

## Références officielles

- [Événements des Custom Widgets](https://docs.streamelements.com/overlays/events)
- [Structure et champs personnalisés](https://docs.streamelements.com/overlays/widget-structure)
- [WebSockets Astro](https://docs.streamelements.com/websockets)
- [Sujets WebSocket disponibles](https://docs.streamelements.com/websockets/topics)
- [Custom Widgets Streamlabs](https://support.streamlabs.com/hc/en-us/articles/46771000147739-How-to-Get-Started-with-Streamlabs-Custom-Widgets)

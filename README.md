# Streamer Lab

Un environnement local pour développer et tester des **Custom Widgets StreamElements et Streamlabs** sans modifier un overlay déjà publié.

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

`npm run dev` ouvre automatiquement [http://localhost:4173](http://localhost:4173) dans le navigateur par défaut. Toute modification de `public/` (HTML, JS, CSS compilé) ou de la bibliothèque `library/` recharge la page automatiquement (rechargement complet pour `public/`, rafraîchissement ciblé de l'aperçu pour un widget de `library/`). Les changements dans `server.mjs` ou `lib/` nécessitent en revanche de relancer `npm run dev` manuellement.

`npm run dev` compile d'abord le CSS (`styles/*.scss` → `public/styles.css`, écrit par Sass et gitignoré) puis lance le serveur et un watcher Sass en parallèle — toute modification dans `styles/` recompile automatiquement. `npm start` fait un build unique sans watcher. Le CSS source vit dans `styles/` ; ne jamais éditer `public/styles.css` directement, il est régénéré à chaque build.

`styles/` est organisé en trois dossiers : `base/` (tokens, reset, atomes partagés comme `.eyebrow`/`.hint`), `layouts/` (les régions macro de la page : topbar, sidebar, preview, dashboard) et `components/` (pièces UI autonomes : bibliothèque, éditeur, simulateur d'événements, tiroir compte, boutons/formulaires, toast). `_responsive.scss` reste à la racine, hors de ces trois dossiers, car ses règles touchent plusieurs composants par palier de largeur.

Les classes suivent la convention BEM (`bloc__élément--modificateur`), avec les sélecteurs imbriqués via `&` dans chaque partial (`&__élément`, `&--modificateur`, `&:état`) plutôt qu'une liste plate de sélecteurs répétés. Deux exceptions documentées dans le code : `.material-symbols-rounded` (classe vendor de la police d'icônes) et les classes `.tok-*` du surlignage syntaxique (namespace plat façon `hljs-*`) ne suivent pas BEM et ne sont pas imbriquées.

Le mode simulation fonctionne immédiatement. La bibliothèque située dans `library/` rassemble tous les widgets dans des sous-dossiers, eux-mêmes répartis entre `library/widgets/` (widgets classiques) et `library/alerts/` (alertes). Les changements apportés au widget actif déclenchent automatiquement un rechargement de l’aperçu, sans dépendre du mode `node --watch` de Node.

L’éditeur intégré, placé entre l’aperçu et la console, permet aussi de modifier directement les quatre fichiers utilisés par la plateforme active. L’aperçu est actualisé pendant la saisie et les changements sont enregistrés automatiquement dans `library/`. `Ctrl + S` force l’enregistrement immédiat. L’onglet **Fields** vérifie que le JSON est valide avant toute sauvegarde.

## Choisir la plateforme simulée

Le sélecteur placé dans l’en-tête permet de passer d’un environnement à l’autre :

- **StreamElements** : événements `onWidgetLoad`, `onEventReceived` et `onSessionUpdate` sur `window`, payload `{ listener, event }` et émulation de `SE_API` ;
- **Streamlabs** : événement `onLoad` avec `detail.custom_json`, puis `onEventReceived` sur `document` avec l’événement directement dans `detail`.

Le choix est mémorisé dans le navigateur. Il sélectionne également la version locale de **JS** et de **Fields** correspondante. Les simulations Follow, Sub, Tip, Bits, Raid et Chat utilisent le format de la plateforme sélectionnée.

Le menu d’export génère une archive ZIP prête à copier dans l’éditeur de la plateforme active, ou permet de la convertir directement pour l’autre plateforme. Elle contient les quatre onglets, les valeurs de champs actuellement réglées et un fichier d’instructions. Lorsque le code utilise uniquement les événements de l’autre plateforme, un pont de compatibilité est automatiquement ajouté au début du JavaScript exporté.

## Développer un widget

Chaque widget possède son propre dossier, accompagné d’un fichier `widget.json` qui définit son nom, sa description et son icône. La bibliothèque dans le panneau de gauche (« Ma bibliothèque ») propose deux onglets, **Widgets** et **Alertes**, pour passer de l’un à l’autre sans déplacer de fichiers ; l’onglet actif détermine dans quel sous-dossier (`library/widgets/` ou `library/alerts/`) un nouveau widget est créé. Le crayon placé sur chaque entrée permet de modifier ces informations, de choisir visuellement une icône Material, et de basculer un widget entre les deux catégories (ce qui déplace son dossier). Les sections **Ma bibliothèque** et **Champs** peuvent être repliées ; leur état est mémorisé dans le navigateur.

Par exemple, le dossier `library/widgets/zer0oes-goal-bar/` contient :

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
- Le laboratoire ne publie rien sur StreamElements. La mise en production reste volontaire : copier les quatre fichiers dans un nouveau Custom Widget, valider, puis seulement remplacer le widget utilisé par l’overlay.

## Vérification

```powershell
npm test
```

Les tests couvrent la conversion des activités, des mises à jour de session et des messages chat Astro.

## Réinstallation propre

En cas de comportement étrange (dépendances corrompues, CSS obsolète, session Twitch bloquée), repartir d'un état propre :

```powershell
npm run reinstall
npm run dev
```

`npm run reinstall` exécute `scripts/clean.mjs` (suppression de `node_modules`, du CSS compilé et de `data/app.sqlite` via l'API `fs` de Node, donc indépendant du shell) puis `npm install`.

- `node_modules/` : réinstallé par `npm install` à partir de `package-lock.json`.
- `public/styles.css` et `.map` : régénérés automatiquement au prochain `npm run dev` ou `npm run build:css` (le CSS source vit dans `styles/`).
- `data/app.sqlite` : base SQLite locale (comptes Twitch liés, sessions). La supprimer réinitialise l'authentification et l'historique local ; elle est recréée automatiquement au démarrage du serveur.
- `.env` n'est **pas** supprimé par cette procédure : il contient les jetons (`SE_TOKEN`, `SL_SOCKET_TOKEN`, secrets OAuth Twitch) et n'est pas versionné. Le recréer avec `Copy-Item .env.example .env` uniquement si besoin de repartir aussi de zéro sur la config.

## Références officielles

- [Événements des Custom Widgets](https://docs.streamelements.com/overlays/events)
- [Structure et champs personnalisés](https://docs.streamelements.com/overlays/widget-structure)
- [WebSockets Astro](https://docs.streamelements.com/websockets)
- [Sujets WebSocket disponibles](https://docs.streamelements.com/websockets/topics)
- [Custom Widgets Streamlabs](https://support.streamlabs.com/hc/en-us/articles/46771000147739-How-to-Get-Started-with-Streamlabs-Custom-Widgets)

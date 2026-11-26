# Portail PassCool

**Lien : https://passcool17.github.io/**

Le portail de PassCool : tous ses jeux et apps publiés sur GitHub Pages, ses montages ESP32, ses 66 apps Grok et sa musique Suno. En français, pensé d’abord pour le téléphone en portrait (Samsung Galaxy S20 FE, 412×915). Remplace l’ancien site https://bold-birch-kind-tulip.grok.me/ (sans le code à 4 chiffres : la liste vit maintenant dans `apps.json`).

## État

Version **1.3.21** (26 nov. 2026 : carte Comprendre l’ICD 1.1.1). HTML, CSS et JavaScript simples, aucune étape de build. Le CSS est **dans `index.html`** (balise `<style>`) : il n’y a plus de `styles.css`. PWA installable ; fonctionne hors ligne après la première visite.

## Ce qu’il y a

1. **Jeux et apps (GitHub)** : une carte par dépôt publié, avec une vraie capture, une courte description, des étiquettes (2D, 3D, App, Éducatif), la mention « Prototype » au besoin et un gros bouton « Jouer » (jeux) ou « Ouvrir » (apps). Filtres et recherche (gardés dans l’adresse : `?filtre=3D&q=baass`).
2. **ESP32** : les montages en ligne (« En ligne ») et à venir (« Bientôt », sans lien ni capture), plus la liste « Mon matériel ».
3. **Apps Grok** : les 66 apps de l’ancien site, noms et liens copiés tels quels le 16 nov. 2026, avec une recherche. Les 34 apps qui vivent seulement sur Grok viennent d’abord ; les 32 qui pointent vers une page `*.github.io` (déjà en cartes) sont repliées dans « Aussi dans mes jeux et apps ». Le tri se fait sur `hote` : rien à ajouter dans `apps.json`.
4. **Musique Suno** : deux comptes (@passcool17 et @coolcamille7), chacun avec ses chiffres datés, ses chansons les plus écoutées (10 pour @passcool17, 8 pour @coolcamille7) et un lien vers le profil.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html`, `app.js` | La page (CSS en ligne dans `index.html`). `app.js` lit `apps.json` et dessine tout ; Grok et Suno se dessinent seulement quand on s’en approche. |
| `apps.json` | **Toutes les données** (cartes, ESP32, Grok, Suno). |
| `shots/` | Captures des cartes (WebP). |
| `img/` | Avatars et pochettes Suno. |
| `sw.js` | Service worker (hors ligne). |
| `manifest.webmanifest`, `icons/`, `screens/` | Installation : raccourcis (Jeux, ESP32, Musique) et vraies captures du portail (`node tests/manifest-shots.mjs` les refait). Le bouton « Installer l’app » n’apparaît que si Chrome propose l’installation. |
| `tests/` | Tests Playwright et outils de capture. |

## Ajouter une app ou un jeu (pour les bots, à chaque sortie)

1. Capture : `npm install` une fois, puis `node tests/shoot.mjs mon-depot=https://passcool17.github.io/mon-depot/` (portrait 412×915, sortie `shots/mon-depot.webp`, 360×800, environ 10 à 40 Ko). Pour un jeu qui se joue couché : `node tests/shoot-paysage.mjs …` (720×324) et `"format": "paysage"`. Regarde la capture : un écran « tourne ton téléphone » ou vide ne va pas.
2. Ajoute un objet dans `projets` de `apps.json` :

```json
{
 "id": "mon-depot",
 "nom": "Nom affiché",
 "url": "https://passcool17.github.io/mon-depot/",
 "depot": "https://github.com/passcool17/mon-depot",
 "categorie": "jeux-apps",
 "type": "jeu",
 "tags": ["2D"],
 "prototype": false,
 "description": "Une ou deux phrases tirées du README. Rien d’inventé.",
 "capture": "shots/mon-depot.webp",
 "format": "portrait",
 "ajoute": "2026-11-16"
}
```

- `categorie` : `"jeux-apps"` (grille principale) ou `"esp32"` (section ESP32).
- `type` : `"jeu"` (bouton « Jouer ») ou `"app"` (bouton « Ouvrir »).
- `tags` : seulement parmi `"2D"`, `"3D"`, `"app"`, `"éducatif"`.
- `prototype` : `true` si l’écran montre des tuiles plates, des pions emoji, aucune illustration ou très peu d’animation (règle de Pascal). Juge sur la capture, honnêtement.
- ESP32 seulement : `"statut": "live"` (en ligne, avec `url` et `capture`) ou `"statut": "bientôt"` (`url`, `capture` et `depot` à `null`, et un champ `"materiel"` court, ex. `"3 × ESP32-S3 N16R8"`). Option `"liens": [{"label": "…", "url": "…"}]` pour des boutons en plus.
3. Monte la version : `VERSION` dans **`app.js` et `sw.js`** (ex. `1.0.0` → `1.0.1`). Sinon le hors-ligne garde l’ancienne liste de captures.
4. `node tests/e2e.mjs` (local) puis, après le push, `node tests/e2e.mjs https://passcool17.github.io`.
5. Commit, push normal sur `main` (jamais de force-push).

Apps Grok : `grok.apps` (`nom`, `hote`, `description`, `url`). Suno : `suno.comptes` (`pseudo`, `nom`, `profil`, `ecoutes`, `chansons`, `date`, `source`, `avatar`, `top` avec `rang`, `titre`, `ecoutes`, `url`, `pochette`). Un chiffre qu’on ne peut pas lire n’est pas inventé : laisse le champ vide et il ne s’affiche pas.

## Sources des données (16 nov. 2026)

- Dépôts : `gh api /users/passcool17/repos` + `/repos/passcool17/<dépôt>/pages`, chaque adresse vérifiée (200). Plus `pascalcoulombe-tech/pat-escape` (autre compte de Pascal, publié).
- Apps Grok : page de l’ancien site rendue avec Playwright (66 liens).
- Suno @passcool17 : 26 k écoutes repris de l’ancien site. 715 chansons et top 10 : vrai classement par écoutes de toutes les chansons, lu sur l’API publique de Suno le 16 nov. 2026 (`/api/profiles/passcool17`, toutes les pages).
- Suno @coolcamille7 : API publique du profil (73 chansons, 4 768 écoutes au total, affiché 4,8 k), top 8 trié par écoutes.

## Service worker : ne casse pas les autres sites

Le portail est à la racine de `passcool17.github.io`, donc son service worker a la portée `/`. Il ne répond **que** pour ses propres fichiers (liste exacte : la page, `apps.json`, CSS, JS, police, icônes, captures et images de `apps.json`). Toute autre adresse (`/test-qi/`, `/wifi-radar/`…) n’est jamais interceptée et va au réseau. Pas de `404.html` à la racine, pour ne pas détourner les erreurs des autres dépôts.

## Tests

`node tests/e2e.mjs [URL]` à 412×915 : nombre de cartes, 10 chansons pour @passcool17 et 8 pour @coolcamille7 (liens 200),, prototypes, filtres, recherche, état vide, section ESP32, 66 apps Grok aux liens exacts, deux comptes Suno, chaque bouton répond 200, SW installé, rechargement hors ligne, console propre ; en ligne, `/test-qi/`, `/la-tribu/`, `/wifi-radar/` et `/dossier-baass/` chargent encore avec le SW du portail installé. Captures dans `/workspace/apps/portail-shots/`. Depuis 1.1.0 aussi : Grok/Suno vides avant défilement, héros (pas d’étiquette, 3 captures = liens vers leur jeu), nom du logo, marge des étiquettes, 6 filtres visibles sur 2 lignes à 412, bouton Installer (caché / visible / caché), barre compacte au défilement et bouton du filtre actif, 34 + 32 Grok repliés, Grok hors ligne, barre pas collante en paysage 915×412, raccourcis et captures du manifeste. `node tests/apres.mjs [URL] [préfixe]` fait les captures de comparaison.

## Changements 1.1.0

1. Grok : 34 apps seulement sur Grok d’abord, 32 doublons repliés (compte affiché).
2. Barre de recherche : compacte quand on défile dans les cartes (le bouton orange montre le filtre actif et ramène aux filtres) ; pas collante en paysage.
3. Filtres : passent à la ligne, tous visibles à 412 px.
4. Chargement : Grok et Suno dessinés à l’approche, CSS en ligne, plus de `text-wrap: balance` sur les titres des cartes.
5. Accessibilité : nom du logo « PassCool – retour en haut », étiquettes à 6 px de marge.
6. Héros : « Salut, c’est PassCool. », phrase personnelle, plus de numéros de section, les 3 captures ouvrent leur jeu.
7. PWA : raccourcis, captures du manifeste, bouton « Installer l’app ».

## Changements 1.3.21

- Carte **Comprendre l’ICD** : version 1.1.1 (cibles du lexique et des citations sans chevauchement). Capture inchangée.

## Changements 1.3.20

- Carte **Comprendre l’ICD** : capture mise à jour (illustration d’accueil v1.1.0). Description : mentions les illustrations. Rien d’autre ne change.

## Changements 1.3.19

- Carte **La mallette de l’Entité** : version 0.5.3, nouvelle capture (`shots/entite-mallette.webp`). Labyrinthe dans le noir, mur mobile, clavier bloqué après un faux code.

## Changements 1.3.18

- Nouvelle carte **Comprendre l’ICD · Insensibilité congénitale à la douleur** (app, étiquettes App et Éducatif) : https://passcool17.github.io/analgesie-congenitale/. Capture `shots/analgesie-congenitale.webp`.

## Changements 1.3.17

- Archive figée **Tamagotchi Elon Man — Prototype v2.1** ajoutée dans **Prototypes** : https://passcool17.github.io/tamagotchi-elon-man-v2-1/. La section Prototypes passe de 16 à 17 cartes. Les fiches **Prototype v2.0.1** et **Prototype v1** sont conservées.
- Carte ESP32 Tamagotchi Elon Man : version 2.2, nouvelle capture (`shots/tamagotchi-elon-man.webp`, print-v2). Description mise à jour.

## Changements 1.3.16

- Archive figée **Tamagotchi Elon Man — Prototype v2.0.1** ajoutée dans **Prototypes** : https://passcool17.github.io/tamagotchi-elon-man-v2/. La section Prototypes passe de 15 à 16 cartes. La fiche **Prototype v1** est conservée.
- Carte ESP32 Tamagotchi Elon Man : version 2.1, nouvelle capture (`shots/tamagotchi-elon-man.webp`, visage v2.1). Description mise à jour (formes exactes, plaque de visage découpée).

## Changements 1.3.15

- Carte « La mallette de l’Entité » : version 0.5.2.1 (correctifs QA : tremblement des trappes visible, zone d’appui du joystick plus grande), nouvelle capture. Rien d’autre ne change.

## Changements 1.3.14

- Carte « La mallette de l’Entité » : version 0.5.2, nouvelle capture, description (trappes qui tremblent, deux clés au signal vert). Rien d’autre ne change.

## Changements 1.3.13

- Carte « La mallette de l’Entité » : version 0.5.1, nouvelle capture, description (Simon à notes, barrettes LED vivantes). Rien d’autre ne change.

## Changements 1.3.12

- Carte « La mallette de l’Entité » : version 0.5.0, nouvelle capture, description (étape 1 « mot mêlé » sur les molettes). Rien d’autre ne change.

## Changements 1.3.11

- Archive figée de la **v0.4.0** de La mallette de l’Entité ajoutée dans **Prototypes** : https://passcool17.github.io/entite-mallette-v040/ (cache `entite-mallette-v040-0.4.0`). Aucune autre fiche modifiée.

## Changements 1.3.10

- Carte ESP32 Tamagotchi Elon Man : version 2.0.1, nouvelle capture (`shots/tamagotchi-elon-man.webp`, visage v2.0.1).

## Changements 1.3.9

- La fiche **Tamagotchi Elon Man** en ESP32 passe en **2.0** (réplique 2D du vrai robot, 3 écrans OLED, tête articulée) : https://passcool17.github.io/tamagotchi-elon-man/. Nouvelle capture WebP 360×800.
- Archive figée **Tamagotchi Elon Man — Prototype v1** ajoutée dans **Prototypes** : https://passcool17.github.io/tamagotchi-elon-man-v1/. La section Prototypes passe de 13 à 14 cartes. Aucune autre fiche modifiée.

## Changements 1.3.8

- La fiche **La mallette de l’Entité** passe en **v0.4.0** (plan d’impression v0.8 : deux trappes A B, deux serrures I II, molettes en ligne), nouvelle capture. Aucune autre fiche modifiée.

## Changements 1.3.7

- Archive figée de la **v0.3.2** de La mallette de l’Entité ajoutée dans **Prototypes** : https://passcool17.github.io/entite-mallette-v032/ (cache `entite-mallette-v032-0.3.2`). La section Prototypes passe de 12 à 13 cartes. Aucune autre carte modifiée.

## Changements 1.3.6

- **La mallette de l’Entité** en Jeux passe en v0.3.2 (trappes, cinq molettes KY-040 pour des mots de 5 lettres, Simon sur cinq barrettes LED, minuterie TM1637) : https://passcool17.github.io/entite-mallette/. Nouvelle capture WebP 360×800 de la mallette ouverte (version en ligne, cache `entite-mallette-v0.3.2`).
- Archive figée de la **v0.2.6a** ajoutée dans **Prototypes** : https://passcool17.github.io/entite-mallette-v026a/. La section Prototypes passe de 11 à 12 cartes. Les cartes v0.1.5 et v0.1.6 restent en place.
- **Tamagotchi Elon Man** ajouté dans **ESP32** : https://passcool17.github.io/tamagotchi-elon-man/. Jeu web pour le robot de bureau Elon Man, aucun matériel requis. Capture WebP 360×800 de l’écran de jeu.

## Changements 1.3.5

- **La mallette de l’Entité** en Jeux passe en v0.2.0 (mallette à trois faces, consignes dictées à la voix, pression psychologique de l’Entité, 12 étapes) : https://passcool17.github.io/entite-mallette/. Nouvelle capture WebP 360×800 de la face Mallette.
- Archive figée de la **v0.1.5** ajoutée dans **Prototypes** : https://passcool17.github.io/entite-mallette-v015/. La carte v0.1.6 reste en place. La section Prototypes passe de 10 à 11 cartes.

## Changements 1.3.4

- **La mallette de l’Entité** en Jeux passe en v0.1.5 (voix ElevenLabs, 12 étapes, 8 min) : https://passcool17.github.io/entite-mallette/.
- Archive figée de la **v0.1.6** ajoutée dans **Prototypes** : https://passcool17.github.io/entite-mallette-v016/. Capture d’une vraie partie (suite de couleurs, étape 1/12), WebP 360×800 d’environ 36 Ko. La section Prototypes passe de 9 à 10 cartes.

## Changements 1.3.3

- **La mallette de l’Entité** (v0.1.4) ajouté dans **Jeux et apps** (pas dans Prototypes) : https://passcool17.github.io/entite-mallette/. La capture vient d’une vraie partie (œil et panneau, trappe ouverte), en WebP 360×800 de 36 Ko. La grille principale passe de 25 à 26 cartes.

## Changements 1.3.2

- **Défuse la mallette** (v0.1.1) ajouté dans **Jeux et apps** (pas dans Prototypes) : https://passcool17.github.io/defuse-mallette/. La capture vient d’une vraie partie (couvercle ouvert), en WebP 360×800 de 20 Ko. La grille principale passe de 24 à 25 cartes.

## Changements 1.3.1

- **Liens du menu et ancres** : le titre de la section finit juste sous le bandeau collant (44 px sous lui), même après la fin du défilement, à 412×915, 915×412 et 1280×800. Avant, « Prototypes » finissait 458 px trop haut.
  - Cause : les cartes hors écran étaient en `content-visibility:auto` avec une hauteur estimée de 500 px. Elles mesuraient en vrai environ 400 px de moins, donc la page raccourcissait pendant le trajet. En plus, la barre de recherche collante passait de 207 à 59 px en route, et `scroll-padding-top` (64 px) était plus petit que le bandeau (65 px).
  - Correctif : au premier clic sur une ancre, `html.ancre` met toutes les cartes en page. Au chargement, elles gardent `content-visibility:auto`, qui sert le TBT. La liste Grok n’a plus de `content-visibility`. Le défilement vise donc la position finale du premier coup, mesuré sans correction aux 3 tailles. La hauteur réelle du bandeau est suivie par un `ResizeObserver` (variable CSS `--haut`). Un clic sur une ancre dessine d’abord les sections paresseuses au-dessus de la cible, met la barre de recherche dans son état d’arrivée, défile, puis corrige une fois le défilement fini (`scrollend`). Saut direct si « réduire les animations » est activé. Le titre reçoit le focus.
  - Même chose pour une adresse chargée avec une ancre (`/#prototypes`) et pour `hashchange`.
- **Lien « N dans Prototypes »** : cible de 44 px de haut (avant 19 px), sans changer la hauteur de la ligne de compte.
- **Tests** : `tests/ancres.mjs`, appelé par `tests/e2e.mjs`, attend l’arrêt réel du défilement. Il vérifie les 5 liens du menu, le lien du compte et 5 adresses avec ancre, aux 3 tailles d’écran.

## Changements 1.3.0

- Nouvelle section **Prototypes** juste après « Jeux et apps », lien « Prototypes » dans le menu. Elle regroupe les 9 jeux que Pascal a choisis (17 nov. 2026) : `desamorce`, `babel-rpg`, `desamorcage-diagnostic`, `foreuse-boreale`, `abime-apocalypse`, `cite-stellaire`, `vita`, `pendragon-aventure`, `pat-escape`.
- Données : ces 9 entrées ont `"categorie": "prototypes"` et `"prototype": true`. Pour en ajouter une : même format qu’une carte, avec `"categorie": "prototypes"`. `"prototype": true` seul (sans cette catégorie) garde la carte dans la grille principale avec l’étiquette Prototype (cas de `coffret-futuriste`).
- La recherche et les filtres s’appliquent aux deux grilles ; la ligne de compte indique « N dans Prototypes » (lien) quand des prototypes correspondent.
- Sur téléphone (≤ 560 px), le logo garde seulement la pastille « P » pour que les 5 liens du menu tiennent sur une ligne (nom accessible inchangé).

## Changements 1.2.1

- Lecteur : l’état Lire / Pause suit les événements de l’audio (`play`, `playing`, `pause`, `ended`, `emptied`, `error`), plus le toucher. Si une chanson ne peut pas se lancer (hors ligne, fichier retiré par Suno), le bouton revient à « Lire », la source est vidée et un message propose de réessayer ou d’écouter sur Suno ; le toucher suivant recharge proprement (bogue QA 1.2.0). L’e2e coupe le réseau, touche Lire, vérifie le retour à « Lire » et le message, puis rejoue une fois en ligne.

## Changements 1.2.0

- **Lecteur du top 5 Suno** (@passcool17) en haut, sous la phrase d’accueil : pochette, titre, précédente / lecture-pause / suivante, barre de progression (on peut la glisser) et temps. Cibles ≥ 44×44, titres annoncés (`aria-live`), commandes de l’écran verrouillé (Media Session).
- Données : `suno.lecteur.pistes` dans `apps.json` (`titre`, `url`, `pochette`, `audio`, `duree` en secondes). `audio: null` = pas de fichier public : le lecteur affiche un lien « L’écouter sur Suno ».
- Source audio : `https://cdn1.suno.ai/<id>.mp4`, le fichier public que joue le partage Suno (CORS `*`, lecture par plages). `audio_url` de Suno renvoie « forbidden », les `.m4a` de `media_urls` sont brouillés, et l’intégration `suno.com/embed/<id>` ne joue pas non plus. **Placebo Mon Ami** n’a pas de fichier public (HTTP 403 le 16 nov. 2026).
- Aucun octet audio avant le premier toucher (l’élément `<audio>` est créé au premier « Lire », `preload="none"`), pas de lecture automatique. Le service worker ignore toute autre origine : les fichiers audio ne sont jamais mis en cache.
- Poids : un mp4 Suno fait 7 à 15 Mo (piste vidéo comprise) ; il se charge seulement pendant l’écoute.

## Changements 1.1.1

- Barre compacte : la pastille du filtre actif (`#actif`) fait au moins 44×44 px, même pour « 3D » (bogue QA). L’e2e vérifie que chaque cible visible de la barre compacte fait ≥ 44×44.

## Limites connues

- Les chiffres Suno et la liste Grok sont une photo du 16 nov. 2026 ; ils ne se mettent pas à jour seuls.
- Les captures montrent l’écran d’accueil de chaque jeu, pas la partie en cours.

## Prochaines étapes

- Mettre les chiffres Suno à jour de temps en temps (à la main, avec la date).
- Ajouter RuView et l’écran CYD en « live » quand ils seront publiés.

Police : Young Serif (SIL Open Font License, `fonts/OFL.txt`).

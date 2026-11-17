# Portail PassCool

**Lien : https://passcool17.github.io/**

Le portail de PassCool : tous ses jeux et apps publiés sur GitHub Pages, ses montages ESP32, ses 66 apps Grok et sa musique Suno. En français, pensé d’abord pour le téléphone en portrait (Samsung Galaxy S20 FE, 412×915). Remplace l’ancien site https://bold-birch-kind-tulip.grok.me/ (sans le code à 4 chiffres : la liste vit maintenant dans `apps.json`).

## État

Version **1.0.0** (16 nov. 2026). HTML, CSS et JavaScript simples, aucune étape de build. PWA installable ; fonctionne hors ligne après la première visite.

## Ce qu’il y a

1. **Jeux et apps (GitHub)** : une carte par dépôt publié, avec une vraie capture, une courte description, des étiquettes (2D, 3D, App, Éducatif), la mention « Prototype » au besoin et un gros bouton « Jouer » (jeux) ou « Ouvrir » (apps). Filtres et recherche (gardés dans l’adresse : `?filtre=3D&q=baass`).
2. **ESP32** : les montages en ligne (« En ligne ») et à venir (« Bientôt », sans lien ni capture), plus la liste « Mon matériel ».
3. **Apps Grok** : les 66 apps de l’ancien site, noms et liens copiés tels quels le 16 nov. 2026, avec une recherche.
4. **Musique Suno** : deux comptes (@passcool17 et @coolcamille7), chacun avec ses chiffres datés, ses 8 chansons les plus écoutées et un lien vers le profil.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html`, `styles.css`, `app.js` | La page. `app.js` lit `apps.json` et dessine tout. |
| `apps.json` | **Toutes les données** (cartes, ESP32, Grok, Suno). |
| `shots/` | Captures des cartes (WebP). |
| `img/` | Avatars et pochettes Suno. |
| `sw.js` | Service worker (hors ligne). |
| `manifest.webmanifest`, `icons/` | Installation. |
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
- Suno @passcool17 : 26 k écoutes, 715 chansons et top 8 repris de l’ancien site (715 confirmé par l’API publique de Suno).
- Suno @coolcamille7 : API publique du profil (73 chansons, 4 768 écoutes au total, affiché 4,8 k), top 8 trié par écoutes.

## Service worker : ne casse pas les autres sites

Le portail est à la racine de `passcool17.github.io`, donc son service worker a la portée `/`. Il ne répond **que** pour ses propres fichiers (liste exacte : la page, `apps.json`, CSS, JS, police, icônes, captures et images de `apps.json`). Toute autre adresse (`/test-qi/`, `/wifi-radar/`…) n’est jamais interceptée et va au réseau. Pas de `404.html` à la racine, pour ne pas détourner les erreurs des autres dépôts.

## Tests

`node tests/e2e.mjs [URL]` à 412×915 : nombre de cartes, prototypes, filtres, recherche, état vide, section ESP32, 66 apps Grok aux liens exacts, deux comptes Suno, chaque bouton répond 200, SW installé, rechargement hors ligne, console propre ; en ligne, `/test-qi/`, `/la-tribu/`, `/wifi-radar/` et `/dossier-baass/` chargent encore avec le SW du portail installé. Captures dans `/workspace/apps/portail-shots/`.

## Limites connues

- Les chiffres Suno et la liste Grok sont une photo du 16 nov. 2026 ; ils ne se mettent pas à jour seuls.
- Le top 8 de @passcool17 suit l’ancien site ; l’API Suno montre aujourd’hui aussi « Still Yours » (1 694) et « Placebo Mon Ami » (628), absents de l’ancien top.
- Les captures montrent l’écran d’accueil de chaque jeu, pas la partie en cours.

## Prochaines étapes

- Mettre les chiffres Suno à jour de temps en temps (à la main, avec la date).
- Ajouter RuView et l’écran CYD en « live » quand ils seront publiés.

Police : Young Serif (SIL Open Font License, `fonts/OFL.txt`).

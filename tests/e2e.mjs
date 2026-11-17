// Test de bout en bout à 412x915. Usage : node tests/e2e.mjs [URL]  (sans URL : serveur local)
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startServer, root } from './server.mjs';
const SHOTS = '/workspace/apps/portail-shots';
fs.mkdirSync(SHOTS, { recursive: true });
let base = process.argv[2], server;
if (!base) ({ server, base } = await startServer());
base = base.replace(/\/$/, '');
const live = base.startsWith('https://');
const data = JSON.parse(fs.readFileSync(`${root}/apps.json`, 'utf8'));
const jeuxApps = data.projets.filter((p) => p.categorie !== 'esp32');
const esp = data.projets.filter((p) => p.categorie === 'esp32');
const ok = (m) => console.log('OK  ' + m);
const shot = async (p, sel, name) => { await p.evaluate((s) => document.querySelector(s).scrollIntoView(), sel); await p.waitForTimeout(900); await p.screenshot({ path: `${SHOTS}/${name}` }); };

const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
ctx.setDefaultTimeout(20000);
const p = await ctx.newPage();
const media = []; p.on('request', (r) => { if (/suno\.ai\/.*\.(mp4|mp3)|cloudfront\.net\/.*\.m4a/.test(r.url())) media.push(r.url()); });
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(e.message));

await p.goto(base + '/', { waitUntil: 'networkidle' });
await p.waitForSelector('#grille .card');
const vis = () => p.$$eval('#grille .card', (c) => c.filter((x) => getComputedStyle(x).display !== 'none').length);
assert.equal(await vis(), jeuxApps.length); ok(`${jeuxApps.length} cartes jeux et apps`);
assert.equal(await p.$$eval('#grille .tag.proto', (t) => t.length), jeuxApps.filter((x) => x.prototype).length); ok('prototypes marqués');
await p.screenshot({ path: `${SHOTS}/1-accueil.png` });

// 1.1.0 — rendu différé : Grok et Suno vides au chargement
assert.equal(await p.$$eval('#liste-grok li, #top li', (l) => l.length), 0); ok('Grok et Suno pas encore dessinés au chargement');
// 1.1.0 — héros
assert.equal(await p.$$eval('.eyebrow, .kicker', (e) => e.length), 0); ok('plus d’étiquette au-dessus du titre ni de sections numérotées');
const urlsProjets = new Set(data.projets.map((x) => x.url));
const heros = await p.$$eval('.shelf a', (a) => a.map((x) => [x.getAttribute('href'), x.getAttribute('aria-label'), x.getBoundingClientRect().height]));
assert.equal(heros.length, 3); for (const [h, l, ht] of heros) { assert.ok(urlsProjets.has(h), h); assert.ok(l && ht >= 44); } ok('3 captures du héros = liens vers leur jeu');
// 1.2.0 — lecteur du top 5 Suno en haut
const L = data.suno.lecteur;
assert.equal(L.pistes.length, 5);
assert.deepEqual(L.pistes.map((x) => x.titre), ['The Real Code Was Never a Bloodline', 'Still Yours', 'Nested Heaven', 'Black Triangle (Men in Black Style 4)', 'Placebo Mon Ami']);
const lect = await p.$eval('#lecteur', (e) => { const r = e.getBoundingClientRect(); return [r.top, r.bottom]; });
assert.ok(lect[1] <= 915, 'lecteur visible sans défiler'); ok(`lecteur visible en haut (bas à ${Math.round(lect[1])}px)`);
assert.equal(await p.textContent('#pl-titre'), L.pistes[0].titre);
await p.waitForTimeout(1500);
assert.equal(media.length, 0, 'aucun audio avant le toucher'); assert.equal(await p.$$eval('audio', (a) => a.length), 0);
assert.ok(!(await p.$eval('#lecteur', (e) => e.classList.contains('joue')))); ok('pas de lecture automatique, 0 octet audio avant le toucher');
const cibl = await p.$$eval('#pl-prev, #pl-play, #pl-next, #pl-seek', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [e.id, r.width, r.height]; }));
assert.ok(cibl.every(([id, w, h]) => h >= 44 && w >= 44), JSON.stringify(cibl)); ok('cibles du lecteur ≥ 44×44');
for (const id of ['#pl-prev', '#pl-play', '#pl-next', '#pl-seek']) assert.ok((await p.getAttribute(id, 'aria-label'))?.length > 3, id);
await p.click('#pl-play');
await p.waitForFunction(() => document.querySelector('#pl-t').textContent !== '0:00', null, { timeout: 20000 });
assert.ok(await p.$eval('#lecteur', (e) => e.classList.contains('joue'))); assert.ok(media.length > 0 && media[0] === L.pistes[0].audio);
assert.match(await p.getAttribute('#pl-play', 'aria-label'), /^Pause/); ok(`lecture : le temps avance (${await p.textContent('#pl-t')}), source ${media[0]}`);
await p.click('#pl-next');
assert.equal(await p.textContent('#pl-titre'), L.pistes[1].titre); assert.equal(await p.textContent('#pl-live'), `Chanson 2 sur 5 : ${L.pistes[1].titre}`);
await p.click('#pl-prev'); assert.equal(await p.textContent('#pl-titre'), L.pistes[0].titre); ok('suivante / précédente changent le titre (annoncé en aria-live)');
await p.click('#pl-play'); await p.waitForTimeout(300); assert.ok(!(await p.$eval('#lecteur', (e) => e.classList.contains('joue')))); ok('pause');
for (let k = 0; k < 4; k++) await p.click('#pl-next');
assert.equal(await p.textContent('#pl-titre'), 'Placebo Mon Ami');
if (!L.pistes[4].audio) { assert.equal(await p.getAttribute('#pl-play', 'aria-disabled'), 'true'); assert.equal(await p.isVisible('#pl-err a'), true); assert.equal(await p.getAttribute('#pl-err a', 'href'), L.pistes[4].url); ok('Placebo Mon Ami : pas d’audio public, lien vers Suno'); }
await p.click('#pl-next'); assert.equal(await p.textContent('#pl-titre'), L.pistes[0].titre); ok('boucle 5 → 1');
// 1.2.1 — hors ligne : « Lire » échoue proprement (bouton revient à Lire + message), puis en ligne ça rejoue
await p.click('#pl-next'); await p.click('#pl-next'); assert.equal(await p.textContent('#pl-titre'), L.pistes[2].titre);
await ctx.setOffline(true);
await p.click('#pl-play');
await p.waitForFunction(() => !document.querySelector('#pl-err').hidden, null, { timeout: 20000 });
await p.waitForTimeout(500);
assert.ok(!(await p.$eval('#lecteur', (e) => e.classList.contains('joue'))), 'classe joue retirée');
assert.match(await p.getAttribute('#pl-play', 'aria-label'), /^Lire/);
assert.equal(await p.$eval('#pl-play .i-play', (s) => getComputedStyle(s).display !== 'none'), true);
assert.match(await p.textContent('#pl-err'), /connexion/); ok('hors ligne : bouton revient à « Lire » + message');
await ctx.setOffline(false);
await p.click('#pl-play');
await p.waitForFunction(() => document.querySelector('#lecteur').classList.contains('joue') && document.querySelector('#pl-t').textContent !== '0:00', null, { timeout: 20000 });
assert.equal(await p.isVisible('#pl-err'), false); ok('de retour en ligne : le même toucher relance la chanson');
await p.click('#pl-play'); await p.waitForTimeout(300); assert.ok(!(await p.$eval('#lecteur', (e) => e.classList.contains('joue'))));
for (const x of L.pistes.filter((t) => t.audio)) { const r = await ctx.request.get(x.audio, { headers: { Range: 'bytes=0-15' } }); assert.ok([200, 206].includes(r.status()), x.audio); }
ok(`${L.pistes.filter((t) => t.audio).length} fichiers audio répondent`);

// 1.1.0 — a11y
assert.equal(await p.getAttribute('.brand', 'aria-label'), null);
assert.equal(await p.getByRole('link', { name: /^PassCool\b.*retour en haut$/ }).count(), 1); ok('nom du logo commence par le texte visible');
const pad = await p.$eval('#grille .tag', (t) => parseFloat(getComputedStyle(t).paddingTop));
assert.ok(pad >= 6 && pad <= 8); ok(`étiquettes : ${pad}px de marge`);
// 1.1.0 — filtres sur 2 lignes, tous visibles à 412
const chips = await p.$$eval('#chips .chip', (c) => c.map((x) => { const r = x.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top)]; }));
assert.ok(chips.every(([l, r]) => l >= 0 && r <= 412)); assert.equal(new Set(chips.map((c) => c[2])).size, 2); ok(`${chips.length} filtres visibles sur 2 lignes`);
// 1.1.0 — bouton Installer caché sans invite, visible avec, caché après installation
assert.equal(await p.isVisible('#installer'), false);
await p.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => {}; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); dispatchEvent(e); });
assert.equal(await p.isVisible('#installer'), true);
await p.evaluate(() => dispatchEvent(new Event('appinstalled'))); assert.equal(await p.isVisible('#installer'), false); ok('bouton Installer : caché / visible avec invite / caché après installation');
// 1.1.0 — barre compacte au défilement
await p.evaluate(() => scrollTo({ top: document.querySelector('#grille').getBoundingClientRect().top + scrollY + 1200, behavior: 'instant' })); await p.waitForTimeout(400);
assert.ok(await p.$eval('#outils', (o) => o.classList.contains('compact'))); assert.equal(await p.isVisible('#chips'), false); assert.equal(await p.textContent('#actif'), 'Tout');
const hBarre = await p.$eval('#outils', (o) => o.getBoundingClientRect().height); assert.ok(hBarre < 80, hBarre); ok(`barre compacte au défilement (${Math.round(hBarre)}px)`);
// 1.1.1 — cibles tactiles de la barre compacte ≥ 44×44, même avec une étiquette courte (« 3D »)
await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(300);
await p.click('.chip[data-filtre="3D"]');
await p.evaluate(() => scrollTo({ top: document.querySelector('#grille').getBoundingClientRect().top + scrollY + 600, behavior: 'instant' })); await p.waitForTimeout(400);
assert.ok(await p.$eval('#outils', (o) => o.classList.contains('compact'))); assert.equal(await p.textContent('#actif'), '3D');
const pil = await p.$eval('#actif', (b) => { const r = b.getBoundingClientRect(); return [r.width, r.height]; });
assert.ok(pil[0] >= 44 && pil[1] >= 44, `#actif ${pil}`);
const cibles = await p.$$eval('#outils a, #outils button, #outils input', (els) => els.filter((e) => e.offsetParent && getComputedStyle(e).visibility !== 'hidden').map((e) => { const r = e.getBoundingClientRect(); return [e.id || e.className, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; }));
assert.ok(cibles.length >= 2 && cibles.every(([, w, h]) => w >= 44 && h >= 44), JSON.stringify(cibles));
const hBarre3D = await p.$eval('#outils', (o) => o.getBoundingClientRect().height); assert.ok(hBarre3D < 80, hBarre3D);
ok(`barre compacte « 3D » : pastille ${pil.map((x) => x.toFixed(1)).join('×')}, ${cibles.length} cibles ≥ 44, barre ${Math.round(hBarre3D)}px`);
await p.click('#actif'); await p.waitForTimeout(900);
assert.ok(!(await p.$eval('#outils', (o) => o.classList.contains('compact')))); assert.equal(await p.isVisible('#chips'), true); ok('bouton du filtre actif rouvre les filtres');
await p.click('.chip[data-filtre="tout"]');
await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));

await p.click('.chip[data-filtre="3D"]');
assert.equal(await vis(), jeuxApps.filter((x) => x.tags.includes('3D')).length); ok('filtre 3D');
await shot(p, '#jeux', '2-filtre-3d.png');
await p.click('.chip[data-filtre="tout"]');
await p.fill('#q', 'baass');
assert.equal(await vis(), 3); ok('recherche « baass » = 3');
assert.match(p.url(), /q=baass/); ok('recherche gardée dans l’URL');
await p.fill('#q', 'zzzz'); assert.equal(await p.isVisible('#vide'), true); ok('état vide');
await p.click('#reset'); assert.equal(await vis(), jeuxApps.length); ok('bouton Tout afficher');

assert.equal(await p.$$eval('#grille-esp32 .card', (c) => c.length), esp.length);
assert.equal(await p.$$eval('#grille-esp32 .tag.live', (c) => c.length), esp.filter((x) => x.statut === 'live').length);
assert.equal(await p.$$eval('#grille-esp32 .card.bientot a', (c) => c.length), 0);
assert.equal(await p.$$eval('#materiel li', (c) => c.length), data.esp32.materiel.carte.length + data.esp32.materiel.kit.length); ok('section ESP32 (live, bientôt sans lien, matériel)');
await shot(p, '#esp32', '3-esp32.png');

await shot(p, '#grok', '4-grok.png');
const seuls = data.grok.apps.filter((a) => !/\.github\.io$/.test(a.hote)), doubles = data.grok.apps.filter((a) => /\.github\.io$/.test(a.hote));
assert.equal(seuls.length, 34); assert.equal(doubles.length, 32);
assert.deepEqual(await p.$$eval('#liste-grok a', (a) => a.map((x) => x.getAttribute('href'))), seuls.map((a) => a.url)); ok('34 apps seulement sur Grok en premier, liens exacts');
assert.deepEqual(await p.$$eval('#liste-grok-dups a', (a) => a.map((x) => x.getAttribute('href'))), doubles.map((a) => a.url));
assert.equal(await p.$eval('#doublons', (d) => d.open), false); assert.equal(await p.textContent('#nb-dups'), '(32)'); assert.equal(await p.isVisible('#liste-grok-dups'), false); ok('32 doublons repliés, compte affiché');
await p.fill('#qg', 'baass'); assert.equal(await p.$eval('#doublons', (d) => d.open), true); assert.match(await p.textContent('#count-grok'), /^\d+ sur 66/); ok('recherche Grok ouvre les doublons quand eux seuls correspondent');
await p.fill('#qg', ''); await p.$eval('#doublons', (d) => { d.open = false; });

const attendu = { '@passcool17': 10, '@coolcamille7': 8 };
const vraiTop = ['The Real Code Was Never a Bloodline', 'Still Yours', 'Nested Heaven', 'Black Triangle (Men in Black Style 4)', 'Placebo Mon Ami', 'Globalism Must Fall', 'Broken Collectors of the Outer Seal', 'Quantum Fracture', 'Through the Veil of Planes', 'Harvard’s Secret Terminal V2'];
for (const [i, c] of data.suno.comptes.entries()) {
  assert.equal(c.top.length, attendu[c.pseudo]);
  if (c.pseudo === '@passcool17') assert.deepEqual(c.top.map((t) => t.titre), vraiTop);
  await p.click(`.seg .chip >> nth=${i}`);
  assert.equal(await p.$$eval('#top li', (l) => l.length), attendu[c.pseudo]);
  if (c.pseudo === '@passcool17') assert.deepEqual(await p.$$eval('#top .t', (l) => l.map((x) => x.firstChild.textContent)), vraiTop);
  assert.deepEqual(await p.$$eval('#top a', (a) => a.map((x) => x.getAttribute('href'))), c.top.map((t) => t.url));
  assert.equal(await p.getAttribute('#profil-suno', 'href'), c.profil);
  ok(`Suno ${c.pseudo} : ${c.top.length} chansons, liens exacts`);
  await shot(p, '#musique', `5-musique-${i + 1}.png`);
  if (c.pseudo === '@passcool17') { await p.evaluate(() => window.scrollTo({ top: document.querySelector('#musique').offsetTop - 64, behavior: 'instant' })); await p.waitForTimeout(800); { await p.evaluate(() => { for (const i of document.querySelectorAll('#musique img')) i.loading = 'eager'; window.scrollTo(0, 0); }); await p.addStyleTag({ content: '.top{position:static}' }); await p.waitForTimeout(1200); const r = await p.evaluate(() => { const e = document.querySelector('#musique').getBoundingClientRect(); return { x: 0, y: e.top + scrollY, width: 412, height: e.height }; }); await p.screenshot({ path: `${SHOTS}/7-musique-vrai-top10.png`, fullPage: true, clip: r }); } }
  const sunoBad = [];
  await Promise.all([...c.top.map((t) => t.url), c.profil].map(async (h) => { const r = await ctx.request.get(h, { timeout: 30000 }).catch(() => null); if (!r || r.status() !== 200) sunoBad.push(h); }));
  assert.deepEqual(sunoBad, []); ok(`Suno ${c.pseudo} : ${c.top.length + 1} liens répondent 200`);
}

const hrefs = await p.$$eval('#grille a.btn, #grille-esp32 a.btn', (a) => [...new Set(a.map((x) => x.href))]);
const bad = [];
await Promise.all(hrefs.map(async (h) => { const r = await ctx.request.get(h, { maxRedirects: 5, timeout: 30000 }).catch((e) => ({ status: () => e.message })); if (r.status() !== 200) bad.push(`${r.status()} ${h}`); }));
assert.deepEqual(bad, []); ok(`${hrefs.length} liens Jouer/Ouvrir répondent 200`);

const etat = await p.evaluate(async () => { const r = await Promise.race([navigator.serviceWorker.ready.then(() => 'pret'), new Promise((s) => setTimeout(() => s('timeout'), 15000))]); return r; });
assert.equal(etat, 'pret'); ok('service worker installé');
await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(500);
assert.ok(await p.evaluate(() => !!navigator.serviceWorker.controller)); ok('page contrôlée par le SW');
await ctx.setOffline(true);
await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#grille .card');
assert.equal(await vis(), jeuxApps.length);
assert.ok(await p.$eval('#grille .card img', (i) => i.complete)); ok('rechargement hors ligne (cartes et captures)');
await p.evaluate(() => document.querySelector('#grok').scrollIntoView()); await p.waitForTimeout(500);
assert.equal(await p.$$eval('#liste-grok li, #liste-grok-dups li', (l) => l.length), 66); ok('Grok se dessine hors ligne');
await ctx.setOffline(false);

// 1.1.0 — paysage : barre de recherche pas collante
const pl = await b.newPage({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
await pl.goto(base + '/', { waitUntil: 'load' });
assert.equal(await pl.$eval('#outils', (o) => getComputedStyle(o).position), 'static');
await pl.evaluate(() => scrollTo({ top: document.querySelector('#grille').getBoundingClientRect().top + scrollY + 600, behavior: 'instant' })); await pl.waitForTimeout(300);
assert.ok(await pl.$eval('#outils', (o) => o.getBoundingClientRect().bottom < 0)); ok('paysage 915x412 : barre de recherche pas collante'); await pl.close();

// 1.1.0 — manifeste : raccourcis et captures
const man = await (await ctx.request.get(base + '/manifest.webmanifest')).json();
assert.deepEqual(man.shortcuts.map((x) => x.url), ['/#jeux', '/#esp32', '/#musique']);
assert.ok(man.screenshots.some((x) => x.form_factor === 'wide') && man.screenshots.some((x) => x.form_factor === 'narrow'));
for (const sc of man.screenshots) { const r = await ctx.request.get(base + sc.src); assert.equal(r.status(), 200, sc.src); }
ok(`manifeste : ${man.shortcuts.length} raccourcis, ${man.screenshots.length} captures (200)`);

if (live) {
  for (const [path, re] of [['/test-qi/', /QI/i], ['/la-tribu/', /tribu/i], ['/wifi-radar/', /radar/i], ['/dossier-baass/', /baass/i]]) {
    const r = await p.goto(base + path, { waitUntil: 'load' });
    assert.equal(r.status(), 200); assert.match(await p.title(), re);
    ok(`${path} charge encore avec le SW du portail installé (« ${await p.title()} »)`);
  }
  const r404 = await ctx.request.get(base + '/nexistepas-' + Date.now() + '/'); assert.ok([404, 503].includes(r404.status())); assert.ok(!(await r404.text()).includes('Salut, c’est PassCool')); ok(`adresse inconnue : page d’erreur de GitHub (${r404.status()}), pas le portail`);
}
const vraies = errs.filter((e) => !/ERR_INTERNET_DISCONNECTED|net::ERR_FAILED/.test(e));
assert.deepEqual(vraies, []); ok('console propre');
await b.close(); server?.close();
console.log('TOUT EST OK');

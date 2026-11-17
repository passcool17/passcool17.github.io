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
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(e.message));

await p.goto(base + '/', { waitUntil: 'networkidle' });
await p.waitForSelector('#grille .card');
const vis = () => p.$$eval('#grille .card', (c) => c.filter((x) => getComputedStyle(x).display !== 'none').length);
assert.equal(await vis(), jeuxApps.length); ok(`${jeuxApps.length} cartes jeux et apps`);
assert.equal(await p.$$eval('#grille .tag.proto', (t) => t.length), jeuxApps.filter((x) => x.prototype).length); ok('prototypes marqués');
await p.screenshot({ path: `${SHOTS}/1-accueil.png` });

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

assert.equal(await p.$$eval('#liste-grok li', (l) => l.length), 66); ok('66 apps Grok');
assert.deepEqual(await p.$$eval('#liste-grok a', (a) => a.map((x) => x.getAttribute('href'))), data.grok.apps.map((a) => a.url)); ok('liens Grok identiques à apps.json');
await shot(p, '#grok', '4-grok.png');

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
  if (c.pseudo === '@passcool17') { await p.evaluate(() => window.scrollTo({ top: document.querySelector('#musique').offsetTop - 64, behavior: 'instant' })); await p.waitForTimeout(800); await p.locator('#musique').screenshot({ path: `${SHOTS}/7-musique-vrai-top10.png` }); }
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
await ctx.setOffline(false);

if (live) {
  for (const [path, re] of [['/test-qi/', /QI/i], ['/la-tribu/', /tribu/i], ['/wifi-radar/', /radar/i], ['/dossier-baass/', /baass/i]]) {
    const r = await p.goto(base + path, { waitUntil: 'load' });
    assert.equal(r.status(), 200); assert.match(await p.title(), re);
    ok(`${path} charge encore avec le SW du portail installé (« ${await p.title()} »)`);
  }
  const r404 = await ctx.request.get(base + '/nexistepas-' + Date.now() + '/'); assert.ok([404, 503].includes(r404.status())); assert.ok(!(await r404.text()).includes('Le portail de PassCool')); ok(`adresse inconnue : page d’erreur de GitHub (${r404.status()}), pas le portail`);
}
const vraies = errs.filter((e) => !/ERR_INTERNET_DISCONNECTED|net::ERR_FAILED/.test(e));
assert.deepEqual(vraies, []); ok('console propre');
await b.close(); server?.close();
console.log('TOUT EST OK');

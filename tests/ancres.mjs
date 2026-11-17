// Navigation par ancres : le titre de la section doit finir juste sous le bandeau collant,
// une fois le défilement vraiment terminé (pas seulement après un délai fixe).
import assert from 'node:assert/strict';

export const VUES = [[412, 915, true], [915, 412, true], [1280, 800, false]];
export const SECTIONS = ['jeux', 'prototypes', 'esp32', 'grok', 'musique'];

export async function attendreArret(p, max = 3500) {
  await p.waitForFunction((max) => new Promise((ok) => {
    const t0 = performance.now(); let y = scrollY, stable = t0;
    const tic = () => { const t = performance.now(); if (scrollY !== y) { y = scrollY; stable = t; } if (t - stable >= 500 || t - t0 > max) ok(true); else requestAnimationFrame(tic); };
    requestAnimationFrame(tic);
  }), max, { timeout: max + 2000 });
}

export async function titreSousEntete(p, id) {
  return p.evaluate((id) => {
    const h = document.querySelector(`#${id} h2`).getBoundingClientRect().top;
    const e = document.querySelector('.top').getBoundingClientRect().bottom;
    return { titre: Math.round(h), entete: Math.round(e), ecart: Math.round(h - e) };
  }, id);
}

export async function verifierAncres(b, base, ok) {
  for (const [w, h, mobile] of VUES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const res = [];
    const verifier = async (id, quoi) => {
      await attendreArret(p);
      const r = await titreSousEntete(p, id);
      assert.ok(r.ecart >= 0 && r.ecart <= 80, `${w}x${h} ${quoi} → #${id} titre ${r.titre}, bandeau ${r.entete}`);
      res.push(`${id}:${r.ecart}`);
    };
    for (const id of SECTIONS) {
      await p.goto(base + '/?v=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
      await p.click(`.top nav a[href="#${id}"]`);
      await verifier(id, 'menu');
      assert.equal(new URL(p.url()).hash, '#' + id);
    }
    // lien « N dans Prototypes » de la ligne de compte
    await p.goto(base + '/?v=' + Date.now(), { waitUntil: 'networkidle' });
    await p.fill('#q', 'merlin');
    const lien = await p.$eval('#count a', (a) => { const r = a.getBoundingClientRect(); return [a.textContent, r.width, r.height]; });
    assert.equal(lien[0], '1 dans Prototypes'); assert.ok(lien[1] >= 44 && lien[2] >= 44, `lien compte ${lien}`);
    await p.click('#count a');
    await verifier('prototypes', 'lien du compte');
    // adresse chargée directement avec l’ancre
    for (const id of SECTIONS) {
      await p.goto(base + '/?v=' + Date.now() + '#' + id, { waitUntil: 'networkidle' });
      await verifier(id, 'adresse #');
    }
    ok(`ancres ${w}x${h} : menu ×5, lien du compte (${Math.round(lien[1])}×${Math.round(lien[2])}), adresse #×5 — écart titre/bandeau ${res.join(' ')}`);
    await ctx.close();
  }
}

// Captures réelles du portail pour « screenshots » du manifeste (screens/*.webp)
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { startServer } from './server.mjs';
const { server, base } = await startServer();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const go = async (w, h, dsf, nom, f) => {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, isMobile: w < 900, hasTouch: w < 900 });
  await p.goto(base + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  if (f) { await p.evaluate(f); await p.waitForTimeout(600); }
  await p.screenshot({ path: `/tmp/${nom}.png` });
  execFileSync('/home/box/opt/bin/magick', [`/tmp/${nom}.png`, '-quality', '70', `screens/${nom}.webp`]);
  await p.close();
};
await go(412, 915, 2, 'accueil-412x915');
await go(412, 915, 2, 'jeux-412x915', () => scrollTo({ top: document.querySelector('#jeux').getBoundingClientRect().top + scrollY - 64, behavior: 'instant' }));
await go(1280, 800, 1, 'accueil-1280x800');
await b.close(); server.close();

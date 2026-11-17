// Captures locales rapides pour vérifier la mise en page (412x915)
import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
const { server, base } = await startServer();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(base + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
await p.screenshot({ path: '/tmp/l-home.png' });
await p.screenshot({ path: '/tmp/l-full.png', fullPage: true });
console.log('errors', errs);
await b.close(); server.close();

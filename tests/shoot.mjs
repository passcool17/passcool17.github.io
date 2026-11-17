// Capture une vraie capture 412x915 de chaque app (usage: node tests/shoot.mjs id=url ...)
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
for (const arg of process.argv.slice(2)) {
  const [id, url] = arg.split(/=(.*)/s);
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  try { await p.goto(url, { waitUntil: 'load', timeout: 45000 }); } catch (e) { errs.push('goto ' + e.message); }
  await p.waitForTimeout(7000);
  const png = `/tmp/shot-${id}.png`;
  await p.screenshot({ path: png });
  execFileSync('/home/box/opt/bin/magick', [png, '-resize', '360x800', '-quality', '62', `shots/${id}.webp`]);
  console.log(id, fs.statSync(`shots/${id}.webp`).size, errs.slice(0, 2).join(' | ').slice(0, 200));
  await ctx.close();
}
await b.close();

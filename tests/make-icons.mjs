// Dessine les icônes (192, 512, masquable 512) avec Chrome et la police Fraunces du dépôt
import { chromium } from 'playwright-core';
import { root } from './server.mjs';
const font = `file://${root}/fonts/young-serif-latin.woff2`;
const html = (s, safe) => `<html><head><style>@font-face{font-family:F;src:url(${font})}
html,body{margin:0;width:${s}px;height:${s}px;background:#0f0d0b;display:grid;place-items:center}
.d{width:${s * safe}px;height:${s * safe}px;border-radius:50%;background:#ff8c2b;display:grid;place-items:center;position:relative}
.d span{font:400 ${s * safe * .62}px/1 F;color:#1c0e02;transform:translateY(-3%)}
.d i{position:absolute;top:${s * safe * .02}px;right:${s * safe * .16}px;width:${s * safe * .22}px;height:${s * safe * .12}px;background:#5fae4e;border-radius:100% 0 100% 0;transform:rotate(-20deg)}
</style></head><body><div class="d"><i></i><span>P</span></div></body></html>`;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const [s, safe, name] of [[192, .78, 'icon-192'], [512, .78, 'icon-512'], [512, .58, 'icon-maskable-512']]) {
  const p = await b.newPage({ viewport: { width: s, height: s } });
  await p.setContent(html(s, safe)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: `${root}/icons/${name}.png` }); await p.close();
}
await b.close();

// Service worker du portail. Il ne touche QUE les fichiers du portail (liste exacte).
// Tout le reste (ex. /test-qi/, /wifi-radar/) passe au réseau sans être intercepté.
const VERSION = '1.3.16';
const CACHE = `portail-${VERSION}`;
const SHELL = ['/', '/index.html', '/app.js', '/apps.json', '/manifest.webmanifest',
  '/fonts/young-serif-latin.woff2', '/icons/icon-192.png', '/icons/icon-512.png'];
let fichiers = new Set(SHELL);

async function listeComplete() {
  const r = await fetch('/apps.json', { cache: 'reload' });
  const d = await r.clone().json();
  const extra = [...d.projets.filter((p) => p.capture).map((p) => '/' + p.capture),
    ...d.suno.comptes.flatMap((c) => [c.avatar, ...c.top.map((t) => t.pochette)]).map((u) => '/' + u)];
  return [...SHELL, ...extra];
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const liste = await listeComplete();
    fichiers = new Set(liste);
    const c = await caches.open(CACHE);
    await c.addAll(liste.map((u) => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('portail-') && k !== CACHE) await caches.delete(k);
    const c = await caches.open(CACHE);
    fichiers = new Set((await c.keys()).map((r) => new URL(r.url).pathname));
    await self.clients.claim();
  })());
});

async function connus() {
  if (fichiers.size > SHELL.length) return fichiers;
  const c = await caches.open(CACHE);
  for (const r of await c.keys()) fichiers.add(new URL(r.url).pathname);
  return fichiers;
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const p = url.pathname;
  // Liste rapide : le portail n'a que la racine et ces dossiers. Le reste n'est jamais intercepté.
  const candidat = SHELL.includes(p) || /^\/(shots|img)\/[\w.-]+\.webp$/.test(p);
  if (!candidat) return;
  e.respondWith((async () => {
    const liste = await connus();
    if (!liste.has(p)) return fetch(e.request);
    const c = await caches.open(CACHE);
    if (p === '/' || p === '/index.html' || p === '/apps.json') {
      try {
        const r = await fetch(e.request);
        if (r.ok) c.put(p === '/index.html' ? '/' : p, r.clone());
        return r;
      } catch {
        return (await c.match(p === '/index.html' ? '/' : p)) || Response.error();
      }
    }
    return (await c.match(p)) || fetch(e.request);
  })());
});

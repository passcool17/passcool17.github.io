// Portail PassCool — rendu des cartes depuis apps.json (aucune étape de build)
export const VERSION = '1.1.0';

const FILTRES = [
  { id: 'tout', label: 'Tout' },
  { id: 'jeu', label: 'Jeux' },
  { id: 'app', label: 'Apps' },
  { id: '2D', label: '2D' },
  { id: '3D', label: '3D' },
  { id: 'éducatif', label: 'Éducatif' },
];
const $ = (s) => document.querySelector(s);
const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const k of kids) if (k) n.append(k);
  return n;
};
const svgIcon = (d, cls = '') => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls);
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.append(p); return s;
};
const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Filtre : 'tout' | 'jeu' | 'app' (type) | '2D' | '3D' | 'éducatif' (tag)
export function correspond(p, filtre, q) {
  const okFiltre = filtre === 'tout' || (filtre === 'jeu' ? p.type === 'jeu' : filtre === 'app' ? p.type === 'app' : p.tags.includes(filtre));
  if (!okFiltre) return false;
  if (!q) return true;
  const hay = norm(`${p.nom} ${p.description} ${p.tags.join(' ')} ${p.prototype ? 'prototype' : ''}`);
  return norm(q).split(/\s+/).filter(Boolean).every((m) => hay.includes(m));
}

function carte(p) {
  const tags = el('ul', { class: 'tags', 'aria-label': 'Étiquettes' });
  for (const t of p.tags) tags.append(el('li', { class: 'tag', text: t === 'app' ? 'App' : t === 'éducatif' ? 'Éducatif' : t }));
  if (p.prototype) tags.append(el('li', { class: 'tag proto', text: 'Prototype' }));
  if (p.statut) tags.prepend(el('li', { class: `tag statut ${p.statut === 'live' ? 'live' : 'soon'}`, text: p.statut === 'live' ? 'En ligne' : 'Bientôt' }));
  if (!p.url) {
    return el('article', { class: 'card bientot', 'data-id': p.id },
      el('div', { class: 'frame soon', 'aria-hidden': 'true' }, el('span', { class: 'chipset', text: p.materiel || '' })),
      el('div', { class: 'body' }, tags, el('h3', { text: p.nom }), el('p', { text: p.description }), el('span', { class: 'pas-encore', text: 'Pas encore en ligne' })));
  }
  const paysage = p.format === 'paysage';
  const img = el('img', { src: p.capture, alt: `Capture d’écran de ${p.nom}`, loading: 'lazy', decoding: 'async', width: paysage ? 720 : 360, height: paysage ? 324 : 800 });
  const verbe = p.type === 'jeu' ? 'Jouer' : 'Ouvrir';
  const btn = el('a', { class: 'btn', href: p.url, 'aria-label': `${verbe} : ${p.nom}` }, document.createTextNode(verbe), svgIcon('M8 5v14l11-7z'));
  const extras = (p.liens || []).map((l) => el('a', { class: 'btn alt', href: l.url }, document.createTextNode(l.label)));
  return el('article', { class: `card${paysage ? ' paysage' : ''}`, 'data-id': p.id },
    el('div', { class: 'frame' }, img),
    el('div', { class: 'body' }, tags, el('h3', { text: p.nom }), el('p', { text: p.description }), btn, ...extras));
}

function initProjets(projets) {
  const grille = $('#grille'), chips = $('#chips'), q = $('#q'), count = $('#count'), vide = $('#vide');
  const params = new URLSearchParams(location.search);
  let filtre = FILTRES.some((f) => f.id === params.get('filtre')) ? params.get('filtre') : 'tout';
  q.value = params.get('q') || '';
  const cartes = new Map(projets.map((p) => [p.id, carte(p)]));
  grille.replaceChildren(...cartes.values());
  $('#nb-projets').textContent = projets.length;

  const boutons = FILTRES.map((f) => {
    const n = projets.filter((p) => correspond(p, f.id, '')).length;
    const b = el('button', { type: 'button', class: 'chip', 'data-filtre': f.id, 'aria-pressed': String(f.id === filtre) }, document.createTextNode(f.label), el('span', { class: 'n', text: String(n) }));
    b.addEventListener('click', () => { filtre = f.id; maj(); });
    return b;
  });
  chips.replaceChildren(...boutons);

  function maj() {
    let n = 0;
    for (const p of projets) { const ok = correspond(p, filtre, q.value.trim()); cartes.get(p.id).hidden = !ok; if (ok) n++; }
    for (const b of boutons) b.setAttribute('aria-pressed', String(b.dataset.filtre === filtre));
    $('#actif').textContent = FILTRES.find((f) => f.id === filtre).label;
    const protos = projets.filter((p) => p.prototype && !cartes.get(p.id).hidden).length;
    count.textContent = n ? `${n} ${n > 1 ? 'résultats' : 'résultat'}${protos ? ` · dont ${protos} prototype${protos > 1 ? 's' : ''}` : ''}` : '';
    vide.hidden = n > 0;
    const u = new URL(location.href);
    filtre === 'tout' ? u.searchParams.delete('filtre') : u.searchParams.set('filtre', filtre);
    q.value.trim() ? u.searchParams.set('q', q.value.trim()) : u.searchParams.delete('q');
    history.replaceState(null, '', u);
  }
  q.addEventListener('input', maj);
  // Barre compacte quand on défile dans la grille ; « actif » remonte aux filtres
  const outils = $('#outils');
  const sentinelle = $('#sentinelle');
  let attente = false, ecart = 0, retour = false;
  // On compense le défilement de la hauteur gagnée, pour que les cartes ne sautent pas
  const compacter = () => {
    attente = false;
    if (retour) return;
    const haut = sentinelle.getBoundingClientRect().top, colle = getComputedStyle(outils).position === 'sticky';
    const estCompact = outils.classList.contains('compact');
    if (!estCompact && colle && haut < 72) {
      const h = outils.offsetHeight; outils.classList.add('compact'); ecart = h - outils.offsetHeight;
    } else if (estCompact && (!colle || haut > 72 + ecart)) {
      // Chrome compense déjà en rétrécissant (ancrage du défilement), pas en regrandissant
      const y = scrollY; outils.classList.remove('compact');
      if (colle && scrollY === y) scrollBy({ top: ecart, behavior: 'instant' });
      ecart = 0;
    }
  };
  addEventListener('scroll', () => { if (!attente) { attente = true; requestAnimationFrame(compacter); } }, { passive: true });
  addEventListener('resize', compacter);
  $('#actif').addEventListener('click', (ev) => {
    ev.preventDefault();
    outils.classList.remove('compact'); ecart = 0; retour = true;
    const fini = () => { retour = false; compacter(); };
    addEventListener('scrollend', fini, { once: true }); setTimeout(() => retour && fini(), 1200);
    $('#jeux').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setTimeout(() => $('#chips .chip[aria-pressed="true"]')?.focus({ preventScroll: true }), 400);
  });
  $('#reset').addEventListener('click', () => { filtre = 'tout'; q.value = ''; maj(); q.focus(); });
  maj();
}

// Doublon = app Grok qui pointe vers une page GitHub déjà en carte plus haut
export const estDoublon = (a) => /\.github\.io$/.test(a.hote);

function initGrok(grok) {
  const q = $('#qg'), count = $('#count-grok'), details = $('#doublons');
  const d = new Date(grok.date + 'T12:00:00');
  $('#grok-sub').textContent = `La liste publique de mon ancien site, copiée le ${d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}.`;
  const ligne = (a, i) => {
    const li = el('li', {}, el('a', { href: a.url, rel: 'noopener' },
      el('span', { class: 'i', text: String(i + 1).padStart(2, '0') }),
      el('span', {}, el('span', { class: 'gn', text: a.nom }), el('span', { class: 'gh', text: a.hote }), a.description ? el('span', { class: 'gd', text: a.description }) : null),
      svgIcon('M7 17 17 7M9 7h8v8')));
    li.dataset.hay = norm(`${a.nom} ${a.hote} ${a.description}`);
    return li;
  };
  const seuls = grok.apps.filter((a) => !estDoublon(a)).map(ligne);
  const doubles = grok.apps.filter(estDoublon).map(ligne);
  $('#liste-grok').replaceChildren(...seuls);
  $('#liste-grok-dups').replaceChildren(...doubles);
  $('#nb-dups').textContent = `(${doubles.length})`;
  const maj = () => {
    const m = norm(q.value.trim()).split(/\s+/).filter(Boolean);
    const filtrer = (items) => items.reduce((n, li) => { const ok = m.every((x) => li.dataset.hay.includes(x)); li.hidden = !ok; return n + ok; }, 0);
    const n1 = filtrer(seuls), n2 = filtrer(doubles);
    $('#nb-dups').textContent = m.length ? `(${n2} sur ${doubles.length})` : `(${doubles.length})`;
    details.hidden = m.length > 0 && n2 === 0;
    if (m.length && n2 && !n1) details.open = true;
    count.textContent = m.length
      ? `${n1 + n2} sur ${grok.apps.length} apps`
      : `${seuls.length} apps seulement sur Grok · ${doubles.length} aussi plus haut`;
  };
  q.addEventListener('input', maj);
  maj();
}

function initSuno(suno) {
  const comptes = suno.comptes;
  const seg = $('#comptes');
  const date = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });
  $('#nb-chansons').textContent = comptes.reduce((n, c) => n + c.chansons, 0);
  const montrer = (i) => {
    const s = comptes[i];
    for (const [j, b] of [...seg.children].entries()) b.setAttribute('aria-pressed', String(j === i));
    const eq = el('span', { class: 'eq', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'), el('i'));
    const meta = [s.ecoutes && `${s.ecoutes} écoutes`, s.chansons && `${s.chansons} chansons`].filter(Boolean).join(' · ');
    $('#artiste').replaceChildren(
      el('img', { src: s.avatar, alt: '', width: 72, height: 72, loading: 'lazy' }),
      el('div', {}, el('div', { class: 'who' }, document.createTextNode(s.pseudo), eq),
        el('div', { class: 'nom', text: s.nom }),
        el('div', { class: 'meta', text: meta }),
        el('span', { class: 'date', text: `au ${date(s.date)}` })));
    $('#top').replaceChildren(...s.top.map((t) => el('li', {}, el('a', { href: t.url, rel: 'noopener', 'aria-label': `${t.titre}, ${t.ecoutes} écoutes, écouter sur Suno` },
      el('span', { class: 'r', text: String(t.rang) }),
      el('img', { src: t.pochette, alt: '', width: 56, height: 56, loading: 'lazy' }),
      el('span', { class: 't' }, document.createTextNode(t.titre), el('span', { class: 'p', text: `${t.ecoutes} écoutes` }))))));
    const lien = $('#profil-suno'); lien.href = s.profil; lien.textContent = `Écouter ${s.pseudo} sur Suno`;
  };
  seg.replaceChildren(...comptes.map((c, i) => {
    const b = el('button', { type: 'button', class: 'chip', 'data-compte': c.pseudo, 'aria-pressed': 'false' }, document.createTextNode(c.pseudo));
    b.addEventListener('click', () => montrer(i));
    return b;
  }));
  montrer(0);
}

function initEsp32(projets, esp) {
  const liste = projets.filter((p) => p.categorie === 'esp32');
  liste.sort((a, b) => (a.statut === 'live' ? 0 : 1) - (b.statut === 'live' ? 0 : 1));
  $('#grille-esp32').replaceChildren(...liste.map(carte));
  const bloc = (titre, items) => el('div', {}, el('h3', { text: titre }), el('ul', {}, ...items.map((t) => el('li', { text: t }))));
  $('#materiel').replaceChildren(el('h3', { class: 'gear-t', text: 'Mon matériel' }),
    el('div', { class: 'gear-cols' }, bloc('Sur la carte', esp.materiel.carte), bloc('Dans le kit', esp.materiel.kit)));
}

// Dessine une section seulement quand on s'en approche (moins de travail au chargement)
function quandProche(sel, f) {
  const cible = $(sel);
  let fait = false;
  const go = () => { if (!fait) { fait = true; f(); } };
  if (location.hash === sel || !('IntersectionObserver' in window)) return go();
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '800px 0px' });
  io.observe(cible);
  for (const a of document.querySelectorAll(`a[href="${sel}"]`)) a.addEventListener('click', go);
}

function initInstallation() {
  const b = $('#installer');
  let invite = null;
  const installee = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); if (installee()) return; invite = e; b.hidden = false; });
  addEventListener('appinstalled', () => { invite = null; b.hidden = true; });
  b.addEventListener('click', async () => {
    if (!invite) return;
    b.hidden = true;
    invite.prompt();
    await invite.userChoice.catch(() => null);
    invite = null;
  });
}

async function demarrer() {
  $('#version').textContent = `Version ${VERSION}.`;
  initInstallation();
  try {
    const r = await fetch('/apps.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    initProjets(data.projets.filter((p) => p.categorie !== 'esp32'));
    initEsp32(data.projets, data.esp32);
    $('#nb-projets').textContent = data.projets.filter((p) => p.url).length;
    $('#nb-grok').textContent = data.grok.apps.length;
    $('#nb-chansons').textContent = data.suno.comptes.reduce((n, c) => n + c.chansons, 0);
    quandProche('#grok', () => initGrok(data.grok));
    quandProche('#musique', () => initSuno(data.suno));
  } catch (e) {
    $('#grille').replaceChildren(el('p', { class: 'loading', text: 'Impossible de charger la liste. Vérifie ta connexion puis recharge la page.' }));
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
}
if (typeof document !== 'undefined') demarrer();

// Portail PassCool — rendu des cartes depuis apps.json (aucune étape de build)
export const VERSION = '1.3.15';

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

// projets = cartes « jeux-apps » (grille principale) + « prototypes » (section Prototypes).
// La recherche et les filtres s’appliquent aux deux grilles.
function initProjets(projets) {
  const grille = $('#grille'), chips = $('#chips'), q = $('#q'), count = $('#count'), vide = $('#vide');
  const params = new URLSearchParams(location.search);
  let filtre = FILTRES.some((f) => f.id === params.get('filtre')) ? params.get('filtre') : 'tout';
  q.value = params.get('q') || '';
  const cartes = new Map(projets.map((p) => [p.id, carte(p)]));
  const estProto = (p) => p.categorie === 'prototypes';
  const principaux = projets.filter((p) => !estProto(p)), protos = projets.filter(estProto);
  grille.replaceChildren(...principaux.map((p) => cartes.get(p.id)));
  $('#grille-protos').replaceChildren(...protos.map((p) => cartes.get(p.id)));

  const boutons = FILTRES.map((f) => {
    const n = projets.filter((p) => correspond(p, f.id, '')).length;
    const b = el('button', { type: 'button', class: 'chip', 'data-filtre': f.id, 'aria-pressed': String(f.id === filtre) }, document.createTextNode(f.label), el('span', { class: 'n', text: String(n) }));
    b.addEventListener('click', () => { filtre = f.id; maj(); });
    return b;
  });
  chips.replaceChildren(...boutons);

  function maj() {
    const vus = (liste) => liste.reduce((n, p) => { const ok = correspond(p, filtre, q.value.trim()); cartes.get(p.id).hidden = !ok; return n + ok; }, 0);
    const n = vus(principaux), np = vus(protos);
    for (const b of boutons) b.setAttribute('aria-pressed', String(b.dataset.filtre === filtre));
    $('#actif').textContent = FILTRES.find((f) => f.id === filtre).label;
    const marques = principaux.filter((p) => p.prototype && !cartes.get(p.id).hidden).length;
    const filtreActif = filtre !== 'tout' || q.value.trim();
    count.replaceChildren();
    if (n) count.append(`${n} ${n > 1 ? 'résultats' : 'résultat'}${marques ? ` · dont ${marques} prototype${marques > 1 ? 's' : ''}` : ''}`);
    if (np && filtreActif) count.append(n ? ' · ' : '', el('a', { href: '#prototypes', text: `${np} dans Prototypes` }));
    vide.hidden = n + np > 0;
    $('#count-protos').textContent = filtreActif ? `${np} sur ${protos.length} prototypes` : `${protos.length} prototypes`;
    $('#vide-protos').hidden = np > 0;
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
  // Pour la navigation par ancre : geler la barre pendant le trajet, et la mettre d’avance
  // dans l’état qu’elle aura à l’arrivée (sinon la page change de hauteur en route).
  pilote = {
    geler(v) { retour = v; if (!v) compacter(); },
    fixer(c) {
      const est = outils.classList.contains('compact');
      if (c && !est) { const h = outils.offsetHeight; outils.classList.add('compact'); ecart = h - outils.offsetHeight; }
      else if (!c && est) { outils.classList.remove('compact'); ecart = 0; }
    },
    colle: () => getComputedStyle(outils).position === 'sticky',
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

// Lecteur du top 5 Suno. Aucun octet audio avant le premier toucher : l’élément <audio>
// est créé au premier « Lire », sans préchargement. Pas de lecture automatique.
export const minutes = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function initLecteur(lecteur) {
  const pistes = lecteur.pistes, n = pistes.length;
  const boite = $('#lecteur'), play = $('#pl-play'), seek = $('#pl-seek'), err = $('#pl-err');
  // enLecture suit les événements de l’élément audio (play/playing/pause/error), jamais le toucher
  let i = 0, audio = null, attente = 0, glisse = false, enLecture = false;
  const p = () => pistes[i];
  const duree = () => (audio && Number.isFinite(audio.duration) && audio.duration) || p().duree;
  const temps = () => (audio && audio.src === p().audio ? audio.currentTime : attente);
  const majTemps = () => {
    const t = temps(), d = duree();
    if (!glisse) seek.value = String(Math.floor(t));
    seek.max = String(Math.ceil(d));
    seek.style.setProperty('--p', `${d ? (Math.min(t, d) / d) * 100 : 0}%`);
    $('#pl-t').textContent = minutes(t); $('#pl-d').textContent = minutes(d);
    seek.setAttribute('aria-valuetext', `${minutes(t)} sur ${minutes(d)}`);
  };
  const joue = () => enLecture;
  const majBouton = () => {
    boite.classList.toggle('joue', joue());
    play.setAttribute('aria-label', p().audio ? `${joue() ? 'Pause' : 'Lire'} « ${p().titre} »` : `« ${p().titre} » : pas d’audio public ici`);
    play.setAttribute('aria-disabled', String(!p().audio));
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = joue() ? 'playing' : 'paused';
  };
  const majSession = () => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: p().titre, artist: 'PassCool', album: 'Top 5 Suno',
      artwork: [{ src: new URL('/' + p().pochette, location.href).href, sizes: '160x160', type: 'image/webp' }] });
  };
  const afficher = (annoncer) => {
    $('#pl-titre').textContent = p().titre;
    $('#pl-n').textContent = `${i + 1} sur ${n}`;
    $('#pl-cover').src = '/' + p().pochette;
    err.hidden = !!p().audio;
    seek.disabled = !p().audio;
    if (!p().audio) err.replaceChildren(document.createTextNode('Suno ne rend pas cette chanson publique en dehors de son site. '), el('a', { href: p().url, rel: 'noopener', text: 'L’écouter sur Suno' }));
    if (annoncer) $('#pl-live').textContent = `Chanson ${i + 1} sur ${n} : ${p().titre}`;
    majTemps(); majBouton();
  };
  const charger = () => {
    if (!audio) {
      audio = new Audio();
      audio.preload = 'none';
      audio.addEventListener('timeupdate', majTemps);
      audio.addEventListener('loadedmetadata', majTemps);
      const etat = (v) => () => { enLecture = v; if (!v) boite.classList.remove('charge'); majBouton(); };
      audio.addEventListener('play', () => { enLecture = true; boite.classList.add('charge'); majBouton(); });
      audio.addEventListener('playing', () => { enLecture = true; boite.classList.remove('charge'); err.hidden = !!p().audio; majBouton(); });
      for (const ev of ['pause', 'ended', 'emptied']) audio.addEventListener(ev, etat(false));
      audio.addEventListener('waiting', () => boite.classList.add('charge'));
      audio.addEventListener('ended', () => { if (i < n - 1 && pistes[i + 1].audio) aller(i + 1, true); else aller(i < n - 1 ? i + 1 : 0, false); });
      audio.addEventListener('error', () => { if (audio.getAttribute('src')) echec(); });
      if ('mediaSession' in navigator) {
        const ms = navigator.mediaSession;
        ms.setActionHandler('play', () => lire());
        ms.setActionHandler('pause', () => audio.pause());
        ms.setActionHandler('previoustrack', () => precedente());
        ms.setActionHandler('nexttrack', () => aller((i + 1) % n, joue()));
        try { ms.setActionHandler('seekto', (e) => { audio.currentTime = e.seekTime; majTemps(); }); } catch {}
      }
    }
    if (audio.src !== p().audio) {
      audio.src = p().audio;
      if (attente) { const t = attente; audio.addEventListener('loadedmetadata', () => { audio.currentTime = t; }, { once: true }); }
      attente = 0;
      majSession();
    }
  };
  // Échec (hors ligne, fichier retiré par Suno…) : on revient à « Lire », on vide la source
  // pour que le prochain toucher recharge proprement, et on garde la position.
  const echec = () => {
    if (!audio) return;
    if (audio.getAttribute('src')) {
      const t = audio.currentTime || 0;
      audio.pause(); audio.removeAttribute('src'); audio.load();
      attente = t;
    }
    enLecture = false; boite.classList.remove('charge');
    majTemps(); majBouton();
    err.replaceChildren(document.createTextNode(navigator.onLine === false ? 'Pas de connexion : la chanson ne peut pas se lancer. Réessaie une fois en ligne, ou ' : 'Cette chanson ne se lance pas ici. Réessaie, ou '),
      el('a', { href: p().url, rel: 'noopener', text: 'écoute-la sur Suno' }), document.createTextNode('.'));
    err.hidden = false;
  };
  const lire = () => {
    if (!p().audio) { err.hidden = false; return; }
    err.hidden = true; charger();
    audio.play().catch((e) => { if (e && e.name === 'AbortError') { enLecture = !audio.paused; majBouton(); } else echec(); });
  };
  const aller = (j, continuer) => {
    i = (j + n) % n; attente = 0;
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    boite.classList.remove('charge');
    afficher(true);
    if (continuer) lire();
  };
  const precedente = () => { if (temps() > 3) { if (audio && audio.src) { audio.currentTime = 0; } else attente = 0; majTemps(); } else aller(i - 1, joue()); };
  play.addEventListener('click', () => (joue() ? audio.pause() : lire()));
  $('#pl-prev').addEventListener('click', precedente);
  $('#pl-next').addEventListener('click', () => aller(i + 1, joue()));
  seek.addEventListener('input', () => { glisse = true; const t = Number(seek.value); $('#pl-t').textContent = minutes(t); seek.style.setProperty('--p', `${(t / duree()) * 100}%`); });
  seek.addEventListener('change', () => {
    glisse = false; const t = Number(seek.value);
    if (audio && audio.src === p().audio) audio.currentTime = t; else attente = t;
    majTemps();
  });
  afficher(false);
}

let pilote = null;
const paresseuses = [];

// Hauteur réelle du bandeau collant, pour scroll-padding-top (CSS --haut) et pour viser les titres
const entete = () => $('.top').getBoundingClientRect().height;
function suivreEntete() {
  const maj = () => document.documentElement.style.setProperty('--haut', `${Math.ceil(entete())}px`);
  maj();
  if ('ResizeObserver' in window) new ResizeObserver(maj).observe($('.top'));
}

// Attend la fin du défilement : scrollend, ou position stable 150 ms, au plus 3 s
const finDefilement = () => new Promise((ok) => {
  let y = scrollY, stable = performance.now(), fini = false;
  const fin = () => { if (!fini) { fini = true; removeEventListener('scrollend', fin); ok(); } };
  addEventListener('scrollend', fin, { once: true });
  const debut = performance.now();
  const tic = () => {
    if (fini) return;
    const t = performance.now();
    if (scrollY !== y) { y = scrollY; stable = t; }
    if (t - stable > 150 || t - debut > 3000) return fin();
    requestAnimationFrame(tic);
  };
  requestAnimationFrame(tic);
});

// Navigation vers une section : on dessine d’abord ce qui changerait la hauteur au-dessus,
// on fixe la barre de recherche dans son état d’arrivée, on défile, puis on corrige une fois arrivé.
let navEnCours = 0;
async function allerA(id, doux) {
  const cible = document.getElementById(id);
  if (!cible) return;
  const jeton = ++navEnCours;
  document.documentElement.classList.add('ancre'); // toutes les cartes en page : vraies hauteurs
  for (const z of paresseuses) if (z.el === cible || (z.el.compareDocumentPosition(cible) & Node.DOCUMENT_POSITION_FOLLOWING)) z.go();
  const jeux = $('#jeux');
  if (pilote) {
    pilote.geler(true);
    const apres = cible !== jeux && !!(jeux.compareDocumentPosition(cible) & Node.DOCUMENT_POSITION_FOLLOWING) && !jeux.contains(cible);
    pilote.fixer(pilote.colle() && apres);
  }
  const viser = () => cible.getBoundingClientRect().top + scrollY - entete();
  scrollTo({ top: viser(), behavior: doux ? 'smooth' : 'instant' });
  await finDefilement();
  for (let k = 0; k < 3 && jeton === navEnCours; k++) {
    const d = cible.getBoundingClientRect().top - entete();
    if (Math.abs(d) <= 2) break;
    scrollTo({ top: scrollY + d, behavior: 'instant' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
  if (jeton !== navEnCours) return;
  if (pilote) pilote.geler(false);
  const titre = cible.matches('h1, h2') ? cible : cible.querySelector('h1, h2');
  if (titre) { if (!titre.hasAttribute('tabindex')) titre.setAttribute('tabindex', '-1'); titre.focus({ preventScroll: true }); }
}

function initNavigation() {
  suivreEntete();
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    allerA(id, !matchMedia('(prefers-reduced-motion: reduce)').matches);
  });
}

// Dessine une section seulement quand on s'en approche (moins de travail au chargement)
function quandProche(sel, f) {
  const cible = $(sel);
  let fait = false;
  const go = () => { if (!fait) { fait = true; f(); } };
  paresseuses.push({ el: cible, go });
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
  initNavigation();
  try {
    const r = await fetch('/apps.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    initProjets(data.projets.filter((p) => p.categorie !== 'esp32'));
    if (data.suno.lecteur) initLecteur(data.suno.lecteur);
    initEsp32(data.projets, data.esp32);
    $('#nb-projets').textContent = data.projets.filter((p) => p.url).length;
    $('#nb-grok').textContent = data.grok.apps.length;
    $('#nb-chansons').textContent = data.suno.comptes.reduce((n, c) => n + c.chansons, 0);
    quandProche('#grok', () => initGrok(data.grok));
    quandProche('#musique', () => initSuno(data.suno));
    // Adresse avec ancre (/#prototypes) : on vise le titre une fois les cartes en place
    if (location.hash.length > 1) requestAnimationFrame(() => allerA(decodeURIComponent(location.hash.slice(1)), false));
    addEventListener('hashchange', () => allerA(decodeURIComponent(location.hash.slice(1)), false));
  } catch (e) {
    $('#grille').replaceChildren(el('p', { class: 'loading', text: 'Impossible de charger la liste. Vérifie ta connexion puis recharge la page.' }));
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
}
if (typeof document !== 'undefined') demarrer();

/* TacTic — service worker
 *
 * Il sert deux choses, et la seconde n'était pas prévue.
 *
 * 1. L'INSTALLATION. Chrome Android refuse de poser une vraie icône d'application
 *    tant qu'un service worker muni d'un gestionnaire « fetch » n'est pas enregistré.
 *    Sans lui, au mieux un marque-page avec une icône générique. C'est le critère
 *    qui manquait — les six autres (nom, icônes 192 et 512, start_url, display,
 *    HTTPS) étaient déjà remplis.
 *
 * 2. LE HORS-LIGNE, pour de vrai. Jusqu'ici le carnet ne fonctionnait sans réseau
 *    que si le navigateur avait gardé la page dans son cache ordinaire — ce qu'il
 *    fait quand ça l'arrange, et pas autrement. Ici, c'est explicite.
 *
 * La stratégie mérite un mot. Pour la page elle-même : LE RÉSEAU D'ABORD.
 * Un cache-first sur index.html figerait tout le monde sur la version du jour de
 * l'installation, et aucune correction ne parviendrait jamais à personne. On tente
 * donc le réseau, et l'on ne se rabat sur le cache que s'il ne répond pas.
 * Pour les icônes et les polices, l'inverse : le cache d'abord, elles ne changent pas.
 */

/* Le nom porte la date : le changer suffit à purger l'ancien cache à l'activation.
   Sans ça, une version corrigée pourrait rester invisible derrière une version gardée. */
const CACHE = 'tactic-2026-07-17m';

/* Le strict nécessaire pour démarrer sans réseau. */
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll échoue en bloc si un seul fichier manque : on les prend un par un.
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  /* La page : le réseau d'abord, pour que les mises à jour arrivent. */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  /* Le reste — icônes, polices : le cache d'abord, elles ne bougent pas. */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      /* On garde aussi les polices, bien qu'elles viennent d'un autre domaine :
         leur réponse est opaque, mais elle se met en cache et se rejoue très bien. */
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => hit))
  );
});

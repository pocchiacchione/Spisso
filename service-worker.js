// service-worker.js
//
// Strategia "network-first": ogni volta che l'app è aperta e c'è
// connessione, va a prendere la pagina/i file AGGIORNATI dal sito.
// Se non c'è connessione, usa l'ultima copia salvata (cache), così
// l'app funziona comunque.
//
// Il numero qui sotto è la "versione" della cache: non serve quasi
// mai toccarlo a mano, ma se un giorno l'app sembra bloccata su una
// versione vecchia, basta cambiare questo numero (es. da v1 a v2) e
// rifare il push: forza tutti i dispositivi a scaricare tutto di nuovo.
const CACHE_VERSION = 'spisso-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './songs.js',
  './manifest.json',
];

// Installazione: salva una prima copia dei file principali.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  // Attiva subito il nuovo service worker, senza aspettare che tutte
  // le schede vecchie si chiudano.
  self.skipWaiting();
});

// Attivazione: elimina le cache di versioni precedenti.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Ad ogni richiesta: prova prima la rete (per avere sempre l'ultima
// versione pubblicata su GitHub); se non c'è rete, usa la cache.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(event.request, copy);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

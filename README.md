# Spisso

Un sito per ascoltare i brani, con interfaccia in stile Spotify: sidebar,
copertine, player fisso in basso con play/pausa, brano successivo/precedente
e passaggio automatico al brano successivo a fine riproduzione.

## Struttura del progetto

```
index.html      pagina unica del sito (home + player)
style.css       stile Spotify (sidebar nera, verde, player in basso)
app.js          logica del player e della libreria
config.js       impostazioni dello sblocco dei brani nascosti
songs.js        ⚠️ generato automaticamente — non modificare a mano

audio/public/   file audio visibili a tutti
audio/locked/   file audio nascosti, sbloccabili indovinando il titolo
covers/public/  copertine dei brani pubblici
covers/locked/  copertine dei brani nascosti
covers/default-cover.svg   copertina di riserva se manca quella specifica

scripts/generate-manifest.js   legge le cartelle audio/ e covers/ e genera songs.js
.github/workflows/build-manifest.yml   rilancia lo script automaticamente ad ogni push
```

## Aggiungere un brano

Vedi [`audio/README.md`](audio/README.md). In breve: chiama il file audio
col **titolo del brano** (`Porti e Formaggi.mp3`) e mettilo in
`audio/public/`, oppure in `audio/locked/` se è un brano nascosto.
La copertina è un'immagine con **lo stesso titolo** dentro `covers/`
(`covers/public/Porti e Formaggi.png`). Poi fai push: il sito si aggiorna
da solo.

Se vuoi mostrare anche una data sotto il titolo, mettila davanti al nome
del file audio: `14-09-2026 - Porti e Formaggi.mp3`. La copertina resta
comunque `Porti e Formaggi.png`, senza data.

## Perché non è collegato direttamente a Google Drive

Un collegamento diretto e "live" a una cartella Google Drive richiederebbe
delle credenziali (una chiave API di Google) incorporate nel sito. Dato che
questo è un sito statico che gira nel browser di chi lo visita, quella
chiave sarebbe visibile a chiunque apra la pagina — esattamente il tipo di
problema di sicurezza da evitare (lo stesso principio per cui un token
GitHub non va mai scritto in chiaro da nessuna parte).

La cartella `audio/` dentro il repository ottiene lo stesso risultato
pratico (aggiungi un file, il sito si aggiorna) in modo sicuro, perché non
richiede nessuna credenziale esposta pubblicamente.

## Come si sbloccano i brani nascosti

Non c'è più un codice unico uguale per tutti: **ogni brano nascosto si
sblocca scrivendo il suo titolo** nella casella in fondo alla sidebar.
Basta anche **una sola parola del titolo**.

Esempio, per il brano `Ludo e Fede` funzionano tutti questi:

```
Ludo e Fede      (titolo intero)
Ludo             (una parola del titolo)
fede             (maiuscole e accenti non contano)
e Fede           (un pezzo del titolo)
```

Non funzionano invece le parole troppo corte o troppo comuni da sole
(`e`, `il`, `di`...), per evitare sblocchi per caso, e le parole scritte
a metà (`Lud`).

Se una parola compare nel titolo di più brani nascosti, li sblocca tutti
insieme.

I brani sbloccati vengono **salvati sul dispositivo** (nel `localStorage`
del browser), quindi restano sbloccati anche chiudendo o ricaricando il
sito. Ogni dispositivo/browser ha il suo elenco.

### Impostazioni in `config.js`

- `MIN_UNLOCK_WORD_LENGTH` — lunghezza minima di una parola perché valga
  come indizio (di default 3).
- `UNLOCK_STOP_WORDS` — parole troppo comuni che da sole non sbloccano.
- `MASTER_UNLOCK_CODE` — codice speciale che sblocca **tutti** i brani in
  una volta (di default `piocheddar`). Metti `null` se non lo vuoi.

`config.js` non viene mai sovrascritto dallo script di generazione.

## Provare il sito in locale

Serve un piccolo server locale (il browser blocca il caricamento di file
audio/JS direttamente da `file://`):

```
npx serve .
```

oppure con Python:

```
python3 -m http.server
```

e poi apri l'indirizzo mostrato nel terminale.

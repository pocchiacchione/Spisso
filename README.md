# Spisso

Un sito per ascoltare i brani, con interfaccia in stile Spotify: sidebar,
copertine, player fisso in basso con play/pausa, brano successivo/precedente
e passaggio automatico al brano successivo a fine riproduzione.

## Struttura del progetto

```
index.html      pagina unica del sito (home + player)
style.css       stile Spotify (sidebar nera, verde, player in basso)
app.js          logica del player e della libreria
config.js       codice segreto per sbloccare i brani nascosti
songs.js        ⚠️ generato automaticamente — non modificare a mano

audio/public/   file audio visibili a tutti
audio/locked/   file audio nascosti, sbloccabili col codice segreto
covers/public/  copertine dei brani pubblici
covers/locked/  copertine dei brani nascosti
covers/default-cover.svg   copertina di riserva se manca quella specifica

scripts/generate-manifest.js   legge le cartelle audio/ e covers/ e genera songs.js
.github/workflows/build-manifest.yml   rilancia lo script automaticamente ad ogni push
```

## Aggiungere un brano

Vedi [`audio/README.md`](audio/README.md): in breve, il file audio va
nominato `gg-mm-aaaa - Titolo del brano.mp3` dentro `audio/public/`
(o `audio/locked/` per un brano nascosto), con un'eventuale copertina
omonima dentro `covers/public/` (o `covers/locked/`). Poi fai push:
il sito si aggiorna da solo.

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

## Codice segreto

Il codice per sbloccare i brani nascosti si trova in `config.js`
(`UNLOCK_CODE`). Cambialo quando vuoi: non viene mai sovrascritto dallo
script di generazione.

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

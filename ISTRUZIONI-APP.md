# Come trasformare Spisso in un'app Android (.apk)

## Cosa ho preparato

Ho reso il sito **installabile come app** (si chiama tecnicamente "PWA")
e ho messo la tua icona (quella verde con le "fiammelle") come icona
dell'app e del sito:

- `manifest.json` — nome, colori e icona dell'app
- `service-worker.js` — fa in modo che l'app **si aggiorni da sola** ogni
  volta che aggiorni il sito (carica sempre la versione più recente da
  internet quando c'è connessione)
- `icons/` — la tua icona in tutte le dimensioni necessarie
- `index.html` — aggiornato per collegare tutto quanto sopra

**Non serve toccare altro**: continua ad aggiungere brani come hai
sempre fatto (vedi `audio/README.md`), il sito e l'app si aggiornano da soli.

## Perché non ti mando già il file .apk pronto

Per creare un vero file `.apk` installabile e firmato serve il kit di
sviluppo Android (Android SDK/Gradle) e l'accesso ai server di Google che
lo scaricano: cose che questo ambiente in cui lavoro non ha e non può
scaricare. Quindi il file `.apk` vero e proprio va generato con uno
strumento esterno — per fortuna è un passaggio gratuito e senza scrivere
codice, spiegato sotto.

## Passaggi da fare

### 1. Applica queste modifiche al tuo repository

Copia questi file/cartelle dentro la cartella del progetto (sovrascrivendo
`index.html`), poi fai il solito commit e push:

```
manifest.json
service-worker.js
icons/
index.html   (sostituisce quello attuale)
```

### 2. Assicurati che il sito sia online (es. GitHub Pages)

Ti serve l'indirizzo pubblico del sito (tipo
`https://pocchiacchione.github.io/Spisso/`). Se non l'hai ancora attivato:
Impostazioni del repository su GitHub → **Pages** → scegli il branch
`main` come sorgente.

### 3. Genera il file .apk con PWABuilder (gratis, senza programmare)

1. Vai su **https://www.pwabuilder.com**
2. Incolla l'indirizzo pubblico del tuo sito e premi Start/Analizza
3. PWABuilder legge automaticamente `manifest.json` e `service-worker.js`
   che ho preparato e ti darà un punteggio "Android" quasi perfetto
4. Clicca **Package for stores → Android**
5. Scarica il pacchetto: dentro trovi un file `.apk` (installabile subito
   sul telefono) e un `.aab` (quello serve solo se poi vuoi pubblicarla
   sul Google Play Store)

### 4. Installa l'apk sul telefono

Trasferisci il file `.apk` sul telefono Android e aprilo: Android chiederà
di autorizzare "Installa da fonte sconosciuta" la prima volta (è normale,
succede per ogni app non scaricata dal Play Store).

## L'aggiornamento automatico, in pratica

L'app che ottieni da PWABuilder è un guscio leggero che mostra il tuo sito
a schermo intero (senza barra del browser). Ogni volta che apri l'app con
connessione internet, carica la versione più recente del sito — quindi
quando aggiungi un brano e fai push su GitHub, **non devi rifare l'apk**:
basta riaprire l'app e la vedrà da sola. Il file `.apk` va rigenerato solo
se in futuro cambi cose come il nome dell'app o l'icona.

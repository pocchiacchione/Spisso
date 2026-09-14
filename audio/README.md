# Come aggiungere un brano

Metti il file audio in **`audio/public/`** (visibile a tutti) oppure in
**`audio/locked/`** (visibile solo a chi inserisce il codice segreto).

## Nome del file

```
gg-mm-aaaa - Titolo del brano.mp3
```

Esempio:

```
audio/public/14-09-2026 - Sotto il sole del Salento.mp3
```

- `gg-mm-aaaa` è la data che verrà mostrata sotto il titolo quando il brano è in riproduzione.
- Dopo lo spazio-trattino-spazio (` - `) scrivi il titolo esattamente come vuoi che appaia sul sito.
- Formati supportati: `.mp3`, `.wav`, `.m4a`, `.ogg` (consigliato `.mp3`).

Non usare la barra `/` per separare giorno/mese/anno: nei nomi dei file
non è un carattere ammesso, quindi si usa il trattino `-`.

## Copertina

Metti un'immagine con **esattamente lo stesso nome** (cambiando solo
l'estensione) nella cartella `covers/public/` o `covers/locked/`:

```
covers/public/14-09-2026 - Sotto il sole del Salento.jpg
```

Formati supportati: `.jpg`, `.jpeg`, `.png`, `.webp`.
Se non metti nessuna copertina, il sito userà l'immagine generica
`covers/default-cover.svg`.

## Dopo aver aggiunto i file

Fai commit e push. La GitHub Action (`.github/workflows/build-manifest.yml`)
rigenera automaticamente `songs.js` con i nuovi brani — non serve fare
nulla a mano. Se vuoi generarlo anche in locale per controllare, lancia:

```
node scripts/generate-manifest.js
```

# Come aggiungere un brano

Metti il file audio in **`audio/public/`** (visibile a tutti) oppure in
**`audio/locked/`** (visibile solo a chi indovina il titolo del brano).

## Nome del file

Basta il titolo del brano:

```
audio/public/Porti e Formaggi.mp3
```

Il titolo verrà mostrato sul sito esattamente così com'è scritto.
Formati supportati: `.mp3`, `.wav`, `.m4a`, `.ogg` (consigliato `.mp3`).

Se vuoi che sotto il titolo compaia anche una **data**, mettila davanti
nel formato `gg-mm-aaaa - `:

```
audio/public/14-09-2026 - Sotto il sole del Salento.mp3
```

La data è facoltativa: i brani senza data funzionano lo stesso e vengono
messi in fondo alla lista, in ordine alfabetico.

Non usare la barra `/` per separare giorno/mese/anno: nei nomi dei file
non è un carattere ammesso, quindi si usa il trattino `-`.

Piccola comodità: i due punti `:` non si possono usare nei nomi dei file,
quindi puoi scrivere un underscore al loro posto. Il file
`Leonardo e Tommaso_ La Sfida Epica.mp3` diventa sul sito
`Leonardo e Tommaso: La Sfida Epica`.

## Copertina

Metti un'immagine dentro `covers/` chiamata **col titolo del brano**:

```
covers/public/Porti e Formaggi.png
```

- **Non serve ripetere la data**, anche se il file audio ce l'ha.
- **Non importa la sottocartella**: `covers/public/` e `covers/locked/`
  vengono cercate entrambe, qualunque sia la cartella del file audio.
- Maiuscole, accenti e punteggiatura non contano: `porti e formaggi.png`
  va bene uguale.
- Funziona anche il vecchio stile col nome identico al file audio
  (`14-09-2026 - Titolo.jpg`).
- Se il nome è solo leggermente diverso dal titolo, lo script prova
  comunque ad abbinarlo e te lo segnala nel log.

Formati supportati: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`.
Se non metti nessuna copertina, il sito usa `covers/default-cover.svg`.

Consiglio: immagine quadrata (es. 800×800), altrimenti viene ritagliata.

## Dopo aver aggiunto i file

Fai commit e push. La GitHub Action (`.github/workflows/build-manifest.yml`)
rigenera automaticamente `songs.js` con i nuovi brani — non serve fare
nulla a mano. Se vuoi generarlo anche in locale per controllare, lancia:

```
node scripts/generate-manifest.js
```

Il log ti dice quanti brani ha trovato, quali copertine ha abbinato per
somiglianza e quali brani sono rimasti senza copertina.

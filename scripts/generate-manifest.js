#!/usr/bin/env node
/**
 * generate-manifest.js
 * ---------------------
 * Legge le cartelle audio/ e covers/ dentro il repo e genera songs.js
 * automaticamente, ricavando titolo e (se c'è) data dal nome del file.
 *
 * NOME DEL FILE AUDIO
 *   Basta il titolo:
 *     Porti e Formaggi.mp3
 *   Se vuoi anche la data, mettila davanti:
 *     13-08-2026 - Colazione da Ender.mp3
 *   Se vuoi indicare anche l'autore del brano, mettilo alla fine:
 *     13-08-2026 - Colazione da Ender - Mario Rossi.mp3
 *   La struttura completa è quindi: DATA - NOME - AUTORE (data e autore
 *   sono entrambi facoltativi e indipendenti l'uno dall'altro: puoi avere
 *   solo il titolo, titolo+data, titolo+autore, o tutti e tre).
 *   Se l'autore viene omesso, sul sito non compare nessun nome sotto la
 *   copertina del brano nella pagina principale.
 *   (Usiamo i trattini "-" al posto delle barre "/" perché "/" non è un
 *   carattere ammesso nei nomi dei file.)
 *
 * COPERTINE
 *   Metti l'immagine in covers/ con lo stesso TITOLO del brano:
 *     covers/public/Porti e Formaggi.png
 *   Non serve ripetere la data e non importa in quale sottocartella di
 *   covers/ la metti (public o locked): lo script le cerca tutte.
 *   Maiuscole, accenti e punteggiatura non contano.
 *   Se non trova niente, usa covers/default-cover.svg.
 *
 * COME SI USA
 *   node scripts/generate-manifest.js
 *
 * Viene eseguito automaticamente anche dalla GitHub Action
 * (.github/workflows/build-manifest.yml) ad ogni push.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".ogg"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
const DEFAULT_COVER = "covers/default-cover.svg";
const COVERS_DIR = path.join(ROOT, "covers");

// Data opzionale all'inizio del nome: "gg-mm-aaaa - Titolo"
const DATE_PREFIX_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\s*-\s*(.+)$/;

// Soglia di somiglianza per abbinare una copertina il cui nome non è
// identico al titolo (es. "Ban nel Void di Alessio" vs "...per Alessio").
const FUZZY_THRESHOLD = 0.7;

/* ---------------- Utility sui nomi ---------------- */

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Confronto "morbido": via maiuscole, accenti e punteggiatura.
// "Leonardo e Tommaso_ La Sfida Epica" -> "leonardo e tommaso la sfida epica"
function normalizeName(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Toglie la data iniziale, se c'è, e restituisce { date, rest }
// (rest è tutto quello che segue: titolo, più eventuale autore)
function splitDateAndRest(baseName) {
  const match = baseName.match(DATE_PREFIX_PATTERN);
  if (!match) return { date: null, rest: baseName };

  const [, dd, mm, yyyy, rest] = match;
  const isoDate = `${yyyy}-${mm}-${dd}`;
  const d = new Date(`${isoDate}T00:00:00`);
  if (isNaN(d.getTime())) return { date: null, rest: baseName };

  return { date: isoDate, rest };
}

// Toglie l'eventuale autore in fondo ("Titolo - Autore") e restituisce
// { title, author }. L'autore è facoltativo: se non c'è (nessun " - "
// residuo dopo aver tolto la data), author è null.
function splitTitleAndAuthor(rest) {
  const idx = rest.lastIndexOf(" - ");
  if (idx === -1) return { title: cleanTitle(rest), author: null };

  const titlePart = rest.slice(0, idx);
  const authorPart = rest.slice(idx + 3).trim();

  // Se manca il titolo o l'autore è vuoto, non era davvero un autore:
  // si tiene tutto come titolo.
  if (!titlePart.trim() || !authorPart) {
    return { title: cleanTitle(rest), author: null };
  }

  return { title: cleanTitle(titlePart), author: cleanTitle(authorPart) };
}

// Nome del file (senza estensione e senza data) -> { date, title, author }
function splitDateAndTitle(baseName) {
  const { date, rest } = splitDateAndRest(baseName);
  const { title, author } = splitTitleAndAuthor(rest);
  return { date, title, author };
}

// Piccole pulizie sul titolo:
//  - "Titolo_ Sottotitolo" -> "Titolo: Sottotitolo"
//    (i due punti non si possono usare nei nomi dei file su Windows,
//     quindi l'underscore prima di uno spazio viene letto come ":")
//  - toglie suffissi tecnici tipo "-audio"
//  - toglie gli spazi doppi
function cleanTitle(str) {
  return str
    .replace(/_\s+/g, ": ")
    .replace(/[\s_-]*(audio|traccia|track)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------------- Indice delle copertine ---------------- */

// Scorre TUTTE le sottocartelle di covers/ e crea un indice
// nome-normalizzato -> percorso, così basta il titolo per trovarle.
function buildCoverIndex() {
  const index = new Map();

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.includes(ext)) continue;

      const baseName = path.basename(entry.name, ext);
      if (baseName === "default-cover") continue;

      const relPath = path.relative(ROOT, full).split(path.sep).join("/");

      // La stessa copertina è cercabile sia col nome completo
      // ("13-08-2026 - Titolo") sia col solo titolo ("Titolo").
      const keys = new Set([
        normalizeName(baseName),
        normalizeName(splitDateAndTitle(baseName).title)
      ]);

      for (const key of keys) {
        if (key && !index.has(key)) index.set(key, relPath);
      }
    }
  }

  walk(COVERS_DIR);
  return index;
}

// Somiglianza fra due nomi (coefficiente di Dice sulle parole): 1 = identici
function similarity(a, b) {
  const wa = a.split(" ").filter(Boolean);
  const wb = b.split(" ").filter(Boolean);
  if (!wa.length || !wb.length) return 0;

  const rest = [...wb];
  let common = 0;
  for (const w of wa) {
    const i = rest.indexOf(w);
    if (i !== -1) {
      common++;
      rest.splice(i, 1);
    }
  }
  return (2 * common) / (wa.length + wb.length);
}

function findCover(coverIndex, song, baseName, approxNotes) {
  const candidates = [normalizeName(song.title), normalizeName(baseName)];

  // 1) Corrispondenza esatta (a meno di maiuscole/accenti/punteggiatura)
  for (const key of candidates) {
    if (key && coverIndex.has(key)) return coverIndex.get(key);
  }

  // 2) Corrispondenza approssimativa, per piccole differenze di nome
  const target = candidates[0];
  let best = null;
  let bestScore = 0;
  for (const [key, value] of coverIndex) {
    const score = similarity(target, key);
    if (score > bestScore) {
      bestScore = score;
      best = { key, value };
    }
  }

  if (best && bestScore >= FUZZY_THRESHOLD) {
    approxNotes.push(`"${song.title}" -> ${best.value}`);
    return best.value;
  }

  return DEFAULT_COVER;
}

/* ---------------- Lettura di una cartella audio ---------------- */

function readFolder(audioDirName, coverIndex, approxNotes, missingCovers) {
  const audioDir = path.join(ROOT, "audio", audioDirName);
  if (!fs.existsSync(audioDir)) return [];

  const files = fs.readdirSync(audioDir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return AUDIO_EXTENSIONS.includes(ext) && !f.startsWith(".");
  });

  const songs = [];

  for (const file of files) {
    const ext = path.extname(file);
    const baseName = path.basename(file, ext);
    const { date, title, author } = splitDateAndTitle(baseName);

    if (!title) continue;

    const song = {
      id: date
        ? `${audioDirName}-${slugify(title)}-${date.slice(8, 10)}${date.slice(5, 7)}${date.slice(0, 4)}`
        : `${audioDirName}-${slugify(title)}`,
      title,
      date, // può essere null: il brano funziona lo stesso
      author: author || null, // può essere null: sul sito non compare nulla
      audio: `audio/${audioDirName}/${file}`,
      cover: DEFAULT_COVER
    };

    song.cover = findCover(coverIndex, song, baseName, approxNotes);
    if (song.cover === DEFAULT_COVER) missingCovers.push(title);

    songs.push(song);
  }

  // Prima i brani con data (dal più vecchio al più recente),
  // poi quelli senza data in ordine alfabetico.
  songs.sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title, "it");
  });

  return songs;
}

/* ---------------- Main ---------------- */

function main() {
  const coverIndex = buildCoverIndex();
  const approxNotes = [];
  const missingCovers = [];

  const publicSongs = readFolder("public", coverIndex, approxNotes, missingCovers);
  const lockedSongs = readFolder("locked", coverIndex, approxNotes, missingCovers);

  const output = `// songs.js
// ⚠️ FILE GENERATO AUTOMATICAMENTE da scripts/generate-manifest.js
// Non modificarlo a mano: le modifiche verranno sovrascritte.
// Per aggiungere/rimuovere canzoni, metti i file audio in
// audio/public (o audio/locked) chiamandoli col titolo del brano
// ("Titolo.mp3", oppure "gg-mm-aaaa - Titolo.mp3" se vuoi la data,
// oppure "gg-mm-aaaa - Titolo - Autore.mp3" se vuoi anche l'autore)
// e rilancia lo script (o fai push: la GitHub Action lo rilancia da sola).

const SONGS = ${JSON.stringify(publicSongs, null, 2)};

const LOCKED_SONGS = ${JSON.stringify(lockedSongs, null, 2)};
`;

  fs.writeFileSync(path.join(ROOT, "songs.js"), output, "utf-8");

  console.log(
    `\n✅ songs.js generato: ${publicSongs.length} brani pubblici, ${lockedSongs.length} brani bloccati.`
  );

  if (approxNotes.length) {
    console.log("\nℹ️  Copertine abbinate per somiglianza (il nome non era identico al titolo):");
    approxNotes.forEach((n) => console.log("   - " + n));
  }

  if (missingCovers.length) {
    console.log("\n⚠️  Senza copertina (viene usata quella di default):");
    missingCovers.forEach((t) => console.log("   - " + t));
  }
}

main();

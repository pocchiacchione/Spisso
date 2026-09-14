#!/usr/bin/env node
/**
 * generate-manifest.js
 * ---------------------
 * Questo script "guarda" le cartelle audio/public, audio/locked,
 * covers/public e covers/locked dentro il repo e genera songs.js
 * automaticamente, leggendo la data e il titolo dal nome del file.
 *
 * FORMATO NOME FILE RICHIESTO (dentro audio/public o audio/locked):
 *   gg-mm-aaaa - Titolo della canzone.mp3
 *   esempio: 14-09-2026 - Sotto il sole del Salento.mp3
 *
 * (Usiamo i trattini "-" al posto delle barre "/" perché "/" non è un
 * carattere ammesso nei nomi dei file su nessun sistema operativo.)
 *
 * COPERTINE:
 *   Metti in covers/public (o covers/locked) un'immagine con LO STESSO
 *   NOME del file audio (estensione .jpg, .jpeg, .png o .webp).
 *   esempio: covers/public/14-09-2026 - Sotto il sole del Salento.jpg
 *   Se non trovi nessuna copertina corrispondente, viene usata
 *   covers/default-cover.svg.
 *
 * COME SI USA:
 *   node scripts/generate-manifest.js
 *
 * Viene eseguito automaticamente anche da una GitHub Action
 * (.github/workflows/build-manifest.yml) ogni volta che fai push
 * di nuovi file dentro audio/ o covers/, quindi normalmente non
 * serve lanciarlo a mano.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".ogg"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const DEFAULT_COVER = "covers/default-cover.svg";

// Nome file: "gg-mm-aaaa - Titolo.ext"
const FILENAME_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\s*-\s*(.+)$/;

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // rimuove accenti
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function findCover(coversDir, baseName) {
  for (const ext of IMAGE_EXTENSIONS) {
    const candidate = path.join(coversDir, baseName + ext);
    if (fs.existsSync(candidate)) {
      return path.relative(ROOT, candidate).split(path.sep).join("/");
    }
  }
  return DEFAULT_COVER;
}

function readFolder(audioDirName) {
  const audioDir = path.join(ROOT, "audio", audioDirName);
  const coversDir = path.join(ROOT, "covers", audioDirName);

  if (!fs.existsSync(audioDir)) return [];

  const files = fs.readdirSync(audioDir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return AUDIO_EXTENSIONS.includes(ext) && !f.startsWith(".");
  });

  const songs = [];
  const skipped = [];

  for (const file of files) {
    const ext = path.extname(file);
    const baseName = path.basename(file, ext);
    const match = baseName.match(FILENAME_PATTERN);

    if (!match) {
      skipped.push(file);
      continue;
    }

    const [, dd, mm, yyyy, title] = match;
    const cleanTitle = title.trim();
    const isoDate = `${yyyy}-${mm}-${dd}`;

    // Validazione base della data
    const d = new Date(`${isoDate}T00:00:00`);
    if (isNaN(d.getTime())) {
      skipped.push(file + " (data non valida)");
      continue;
    }

    songs.push({
      id: `${audioDirName}-${slugify(cleanTitle)}-${dd}${mm}${yyyy}`,
      title: cleanTitle,
      date: isoDate,
      audio: `audio/${audioDirName}/${file}`,
      cover: findCover(coversDir, baseName)
    });
  }

  if (skipped.length) {
    console.warn(
      `\n⚠️  File ignorati in audio/${audioDirName} (nome non nel formato "gg-mm-aaaa - Titolo.ext"):`
    );
    skipped.forEach((f) => console.warn("   - " + f));
  }

  // Ordina per data crescente
  songs.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return songs;
}

function main() {
  const publicSongs = readFolder("public");
  const lockedSongs = readFolder("locked");

  const output = `// songs.js
// ⚠️ FILE GENERATO AUTOMATICAMENTE da scripts/generate-manifest.js
// Non modificarlo a mano: le modifiche verranno sovrascritte.
// Per aggiungere/rimuovere canzoni, metti i file audio in
// audio/public (o audio/locked) seguendo il formato
// "gg-mm-aaaa - Titolo.mp3" e rilancia lo script (o fai push:
// la GitHub Action lo rilancia da sola).

const SONGS = ${JSON.stringify(publicSongs, null, 2)};

const LOCKED_SONGS = ${JSON.stringify(lockedSongs, null, 2)};
`;

  fs.writeFileSync(path.join(ROOT, "songs.js"), output, "utf-8");

  console.log(`\n✅ songs.js generato: ${publicSongs.length} canzoni pubbliche, ${lockedSongs.length} canzoni bloccate.`);
}

main();

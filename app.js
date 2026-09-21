// app.js — logica di Sportify (Spotify-style single page player)

/* ---------------- Chiavi di salvataggio sul dispositivo (localStorage) ---------------- */

// Salva la LISTA degli id dei brani sbloccati, così i brani
// restano sbloccati sul dispositivo anche chiudendo o ricaricando il sito.
const STORAGE_KEY = "spisso_unlocked_ids";
// Vecchia chiave (contava solo QUANTI brani erano sbloccati): la leggiamo
// una volta sola per non far perdere i progressi a chi usava già il sito.
const LEGACY_STORAGE_KEY = "spisso_unlocked_count";
// Playlist dei preferiti: lista di id NELL'ORDINE della playlist
// (il primo brano a cui hai messo il cuore è il primo; poi puoi spostarli).
const FAVORITES_KEY = "spisso_favorite_ids";
// Ordine scelto nella schermata principale: "chrono" | "chrono-desc" | "alpha".
const SORT_KEY = "spisso_sort_order";
// Pubblicità: se le hai disattivate da Impostazioni, e quante canzoni sono
// passate dall'ultima pubblicità (per sapere quando farne comparire una nuova).
const ADS_DISABLED_KEY = "spisso_ads_disabled";
const AD_SONG_COUNT_KEY = "spisso_ad_song_count";

// Ogni persona ha la sua playlist perché tutto è salvato nel browser di chi
// visita il sito (non c'è un account): ogni dispositivo ha i suoi preferiti.

/* ---------------- Elenco di tutti i brani ---------------- */

const ALL_SONGS = [...SONGS, ...LOCKED_SONGS];
const ALL_SONGS_BY_ID = new Map(ALL_SONGS.map((s) => [s.id, s]));
const PUBLIC_IDS = new Set(SONGS.map((s) => s.id));

/* ---------------- Stato brani sbloccati (salvato sul dispositivo) ---------------- */

function readUnlockedIds() {
  let ids = [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) ids = parsed.filter((x) => typeof x === "string");
    } else {
      // Migrazione dal vecchio sistema a conteggio
      const legacy = parseInt(localStorage.getItem(LEGACY_STORAGE_KEY) || "0", 10);
      if (legacy > 0) {
        ids = LOCKED_SONGS.slice(0, legacy).map((s) => s.id);
        writeUnlockedIds(ids);
      }
    }
  } catch (err) {
    // localStorage non disponibile (es. navigazione privata) o dati corrotti:
    // il sito continua a funzionare, semplicemente senza salvataggio.
    ids = [];
  }

  // Tiene solo gli id che esistono ancora in LOCKED_SONGS
  const valid = new Set(LOCKED_SONGS.map((s) => s.id));
  return ids.filter((id) => valid.has(id));
}

function writeUnlockedIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (err) {
    // Salvataggio non possibile: si continua comunque per questa sessione.
  }
}

// Set degli id sbloccati, tenuto in memoria e sempre sincronizzato col disco
let unlockedIds = new Set(readUnlockedIds());

function isUnlocked(song) {
  return unlockedIds.has(song.id);
}

function unlockSong(song) {
  if (unlockedIds.has(song.id)) return false;
  unlockedIds.add(song.id);
  // Salva rispettando l'ordine originale dei brani bloccati
  writeUnlockedIds(LOCKED_SONGS.filter(isUnlocked).map((s) => s.id));
  return true;
}

function getUnlockedCount() {
  return LOCKED_SONGS.filter(isUnlocked).length;
}

function getUnlockedLockedSongs() {
  return LOCKED_SONGS.filter(isUnlocked);
}

// Un brano è "disponibile" se è pubblico oppure l'hai già sbloccato
function isAvailable(song) {
  return PUBLIC_IDS.has(song.id) || unlockedIds.has(song.id);
}

// Tutti i brani che puoi ascoltare, in ordine "di archivio" (non ordinati per l'utente)
function getAvailableSongs() {
  return [...SONGS, ...getUnlockedLockedSongs()];
}

/* ---------------- Preferiti (salvati sul dispositivo) ---------------- */

function readFavoriteIds() {
  let ids = [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) ids = parsed.filter((x) => typeof x === "string");
    }
  } catch (err) {
    ids = [];
  }

  // Tiene solo gli id che esistono ancora, senza doppioni, nell'ordine salvato
  const seen = new Set();
  return ids.filter((id) => {
    if (!ALL_SONGS_BY_ID.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function writeFavoriteIds() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
  } catch (err) {
    // Salvataggio non possibile: i preferiti restano validi per questa sessione.
  }
}

// Ordine della playlist: chi ha ricevuto il cuore prima sta prima
let favoriteIds = readFavoriteIds();

function isFavorite(song) {
  return favoriteIds.includes(song.id);
}

// I brani della playlist, nell'ordine scelto (solo quelli ascoltabili)
function getFavoriteSongs() {
  return favoriteIds
    .map((id) => ALL_SONGS_BY_ID.get(id))
    .filter((song) => song && isAvailable(song));
}

// Salva un nuovo ordine per i brani visibili nella playlist
function setFavoriteOrder(visibleIdsInOrder) {
  const rest = favoriteIds.filter((id) => !visibleIdsInOrder.includes(id));
  favoriteIds = [...visibleIdsInOrder, ...rest];
  writeFavoriteIds();
}

// Mette/toglie il cuore. Un nuovo cuore va in fondo alla playlist.
function toggleFavorite(song) {
  const i = favoriteIds.indexOf(song.id);
  if (i === -1) {
    favoriteIds.push(song.id);
  } else {
    favoriteIds.splice(i, 1);
  }
  writeFavoriteIds();
  onFavoritesChanged();
}

/* ---------------- Ordine dei brani nella schermata principale ---------------- */

const SORT_LABELS = {
  "chrono": "Cronologico",
  "chrono-desc": "Cronologico inverso",
  "alpha": "Alfabetico",
};
const DEFAULT_SORT = "chrono"; // per chi non ha mai aperto il sito

function readSortOrder() {
  try {
    const value = localStorage.getItem(SORT_KEY);
    if (value && Object.prototype.hasOwnProperty.call(SORT_LABELS, value)) return value;
  } catch (err) {
    // niente salvataggio: si usa l'ordine predefinito
  }
  return DEFAULT_SORT;
}

function writeSortOrder(order) {
  try {
    localStorage.setItem(SORT_KEY, order);
  } catch (err) {
    // Salvataggio non possibile: l'ordine vale per questa sessione.
  }
}

let sortOrder = readSortOrder();

/* ---------------- Pubblicità: stato salvato sul dispositivo ---------------- */

function readAdsDisabled() {
  try {
    return localStorage.getItem(ADS_DISABLED_KEY) === "1";
  } catch (err) {
    return false;
  }
}

function writeAdsDisabled(value) {
  try {
    localStorage.setItem(ADS_DISABLED_KEY, value ? "1" : "0");
  } catch (err) {
    // Salvataggio non possibile: la scelta vale solo per questa sessione.
  }
}

function readAdSongCount() {
  try {
    const n = parseInt(localStorage.getItem(AD_SONG_COUNT_KEY) || "0", 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch (err) {
    return 0;
  }
}

function writeAdSongCount(n) {
  try {
    localStorage.setItem(AD_SONG_COUNT_KEY, String(n));
  } catch (err) {
    // Salvataggio non possibile: il conteggio vale solo per questa sessione.
  }
}

// Ogni quante canzoni comparire una pubblicità (vedi config.js); 10 se non impostato.
function adInterval() {
  return typeof AD_EVERY_N_SONGS === "number" && AD_EVERY_N_SONGS > 0 ? AD_EVERY_N_SONGS : 10;
}

let adsDisabled = readAdsDisabled();
let adSongCount = readAdSongCount();

// Titoli in ordine alfabetico italiano, senza differenza tra maiuscole/minuscole
// e con i numeri "giusti" (Ludo e Fede 3 prima di Ludo e Fede 10).
const titleCollator = new Intl.Collator("it", { sensitivity: "base", numeric: true });

function compareByTitle(a, b) {
  return titleCollator.compare(a.title, b.title);
}

function undatedOnlyInAlphabetical() {
  return typeof UNDATED_ONLY_IN_ALPHABETICAL !== "undefined" && UNDATED_ONLY_IN_ALPHABETICAL === true;
}

// true se questo brano NON deve comparire nell'ordine indicato
// (brani senza data negli ordini cronologici, se così è impostato in config.js)
function isHiddenInOrder(song, order) {
  return order !== "alpha" && !song.date && undatedOnlyInAlphabetical();
}

function sortSongs(list, order) {
  if (order === "alpha") {
    return [...list].sort(compareByTitle);
  }

  // Ordini cronologici: crescente (dal più vecchio) o inverso (dal più recente).
  // Le date sono "AAAA-MM-GG", quindi si confrontano bene come testo.
  const sign = order === "chrono-desc" ? -1 : 1;
  const dated = list.filter((s) => s.date);
  const undated = list.filter((s) => !s.date);

  dated.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -sign : sign;
    return sign * compareByTitle(a, b); // stessa data: per titolo (e inverso è l'esatto contrario)
  });

  if (undatedOnlyInAlphabetical()) return dated;
  return [...dated, ...undated.sort(compareByTitle)];
}

// I brani come li vede chi è nella schermata principale
function getHomeSongs() {
  return sortSongs(getAvailableSongs(), sortOrder);
}

/* ---------------- Coda di riproduzione ---------------- */

// Il "successivo/precedente" segue la lista da cui hai fatto partire il brano:
// la schermata principale (nell'ordine scelto) oppure la playlist dei preferiti.
let playContext = "home"; // "home" | "favorites"

function getQueue() {
  return playContext === "favorites" ? getFavoriteSongs() : getHomeSongs();
}

// Posizione del brano in riproduzione dentro la coda (si ricalcola ogni volta,
// così resta giusta anche se cambi ordine, sblocchi brani o sposti i preferiti)
function getCurrentIndex() {
  if (!currentSong) return -1;
  return getQueue().findIndex((s) => s.id === currentSong.id);
}

/* ---------------- Riconoscimento del titolo scritto ---------------- */

// Toglie maiuscole, accenti e punteggiatura: "Ludo e Fede!" -> "ludo e fede"
function normalizeText(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toWords(str) {
  const n = normalizeText(str);
  return n ? n.split(" ") : [];
}

// true se "guess" è il titolo intero, una parola del titolo
// o un pezzo consecutivo del titolo (es. "e Fede" di "Ludo e Fede").
function songMatchesGuess(song, guess) {
  const titleWords = toWords(song.title);
  const guessWords = toWords(guess);

  if (!guessWords.length || !titleWords.length) return false;

  // Titolo scritto per intero: va sempre bene
  if (guessWords.join(" ") === titleWords.join(" ")) return true;

  // Altrimenti serve almeno una parola "vera" (non troppo corta o comune),
  // così scrivere solo "e" o "il" non sblocca niente.
  const hasRealWord = guessWords.some(
    (w) => w.length >= MIN_UNLOCK_WORD_LENGTH && !UNLOCK_STOP_WORDS.includes(w)
  );
  if (!hasRealWord) return false;

  // Cerca le parole scritte, nello stesso ordine, dentro il titolo
  for (let i = 0; i + guessWords.length <= titleWords.length; i++) {
    let ok = true;
    for (let j = 0; j < guessWords.length; j++) {
      if (titleWords[i + j] !== guessWords[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }

  return false;
}

function findSongsByGuess(guess) {
  return LOCKED_SONGS.filter((song) => songMatchesGuess(song, guess));
}

/* ---------------- Utility data/testo ---------------- */

// La data è facoltativa: se il file audio non ce l'ha nel nome,
// semplicemente non viene mostrata niente.
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Sceglie sempre lo stesso brano per tutto il giorno, cambia il giorno dopo
function getSongOfTheDay(list) {
  const today = new Date();
  const seed = today.getFullYear() * 372 + today.getMonth() * 31 + today.getDate();
  return list[seed % list.length];
}

// Il brano del giorno non cambia se cambi l'ordine: si sceglie sempre tra i
// brani che si vedono in ogni ordine (quindi non tra quelli "solo alfabetico").
function getHeroPool() {
  const all = getAvailableSongs();
  if (!undatedOnlyInAlphabetical()) return all;
  const dated = all.filter((s) => s.date);
  return dated.length ? dated : all;
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Icone (SVG): cuore e maniglia per trascinare
const HEART_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
const GRIP_SVG =
  '<svg viewBox="0 0 14 20" aria-hidden="true" focusable="false"><circle cx="4" cy="4" r="1.7"/><circle cx="10" cy="4" r="1.7"/><circle cx="4" cy="10" r="1.7"/><circle cx="10" cy="10" r="1.7"/><circle cx="4" cy="16" r="1.7"/><circle cx="10" cy="16" r="1.7"/></svg>';

/* ---------------- Elementi DOM ---------------- */

const audioEl = document.getElementById("audio-el");
const playBtn = document.getElementById("play-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const seekBar = document.getElementById("seek-bar");
const curTimeEl = document.getElementById("cur-time");
const durTimeEl = document.getElementById("dur-time");
const volumeBar = document.getElementById("volume-bar");
const npTitle = document.getElementById("np-title");
const npDate = document.getElementById("np-date");
const npCover = document.getElementById("np-cover");
const npHeartBtn = document.getElementById("np-heart");
const gridEl = document.getElementById("song-grid");
const heroTitle = document.getElementById("hero-title");
const heroPlayBtn = document.getElementById("hero-play");
const libraryCountEl = document.getElementById("library-count");
const mainEl = document.querySelector(".main");

// Viste (Home / Preferiti / Impostazioni)
const viewHome = document.getElementById("view-home");
const viewFavorites = document.getElementById("view-favorites");
const viewSettings = document.getElementById("view-settings");
const navFavCount = document.getElementById("nav-fav-count");
const tabFavCount = document.getElementById("tab-fav-count");

// Impostazioni: interruttore pubblicità
const settingsAdsToggle = document.getElementById("settings-ads-toggle");
const settingsAdsDesc = document.getElementById("settings-ads-desc");

// Pubblicità: overlay video
const adOverlay = document.getElementById("ad-overlay");
const adVideo = document.getElementById("ad-video");
const adSkipBtn = document.getElementById("ad-skip-btn");
const adDisableBtn = document.getElementById("ad-disable-btn");

// Bottone "Ordina"
const sortMenu = document.getElementById("sort-menu");
const sortBtn = document.getElementById("sort-btn");
const sortBtnValue = document.getElementById("sort-btn-value");
const sortList = document.getElementById("sort-list");

// Playlist dei preferiti
const favListEl = document.getElementById("fav-list");
const favEmptyEl = document.getElementById("fav-empty");
const favHintEl = document.getElementById("fav-hint");
const favCountEl = document.getElementById("fav-count");
const favPlayBtn = document.getElementById("fav-play");

// Menu a tendina (pannello "in riproduzione")
const npPanel = document.getElementById("np-panel");
const npBackdrop = document.getElementById("np-backdrop");
const npExpandBtn = document.getElementById("np-expand");
const npOpenTrigger = document.getElementById("np-open-trigger");
const npPanelCloseBtn = document.getElementById("np-panel-close");
const npPanelDisc = document.getElementById("np-panel-disc");
const npPanelCover = document.getElementById("np-panel-cover");
const npPanelTitle = document.getElementById("np-panel-title");
const npPanelDate = document.getElementById("np-panel-date");
const npPanelHeartBtn = document.getElementById("np-panel-heart");
const npPanelPlayBtn = document.getElementById("np-panel-play");
const npPanelPrevBtn = document.getElementById("np-panel-prev");
const npPanelNextBtn = document.getElementById("np-panel-next");
const npPanelSeek = document.getElementById("np-panel-seek");
const npPanelCur = document.getElementById("np-panel-cur");
const npPanelDur = document.getElementById("np-panel-dur");

let currentSong = null; // brano effettivamente in riproduzione
let currentView = "home";
let seekBeingDragged = false;
let panelSeekBeingDragged = false;
let panelOpen = false;

// Pubblicità: se sta girando un video, e il brano che deve partire dopo
let adPlaying = false;
let adPendingSong = null;
let adPendingContext = null;
let pendingOpenPanel = false; // riapre il menu a tendina dopo la pubblicità, se richiesto

/* ---------------- Cuori (mi piace) ---------------- */

function applyHeartState(btn, song) {
  const liked = !!song && isFavorite(song);
  btn.classList.toggle("liked", liked);
  btn.setAttribute("aria-pressed", liked ? "true" : "false");
  if (song) {
    btn.setAttribute(
      "aria-label",
      liked
        ? `Rimuovi "${song.title}" dai preferiti`
        : `Aggiungi "${song.title}" ai preferiti`
    );
    btn.title = liked ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti";
  }
}

function createHeartButton(song, extraClass) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "heart-btn " + (extraClass || "");
  btn.dataset.likeId = song.id;
  btn.innerHTML = HEART_SVG;
  btn.addEventListener("click", (e) => {
    e.stopPropagation(); // il cuore non deve far partire il brano
    toggleFavorite(song);
  });
  return btn;
}

// Allinea TUTTI i cuori della pagina allo stato reale dei preferiti
function syncLikeButtons() {
  document.querySelectorAll(".heart-btn[data-like-id]").forEach((btn) => {
    applyHeartState(btn, ALL_SONGS_BY_ID.get(btn.dataset.likeId));
  });

  [npHeartBtn, npPanelHeartBtn].forEach((btn) => {
    btn.disabled = !currentSong;
    if (currentSong) {
      applyHeartState(btn, currentSong);
    } else {
      btn.classList.remove("liked");
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label", "Nessun brano in riproduzione");
    }
  });
}

function onFavoritesChanged() {
  renderFavorites(); // aggiorna anche i cuori e i contatori
}

npHeartBtn.innerHTML = HEART_SVG;
npPanelHeartBtn.innerHTML = HEART_SVG;
[npHeartBtn, npPanelHeartBtn].forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentSong) toggleFavorite(currentSong);
  });
});

/* ---------------- Rendering ---------------- */

function renderHero() {
  const pool = getHeroPool();
  if (!pool.length) {
    heroTitle.textContent = "—";
    heroPlayBtn.onclick = null;
    return;
  }
  const song = getSongOfTheDay(pool);
  heroTitle.textContent = song.title;
  heroPlayBtn.onclick = () => openNowPlaying(song, "home");
}

function renderGrid() {
  const songs = getHomeSongs();
  const remainingLocked = LOCKED_SONGS.filter((s) => !isUnlocked(s)).length;

  gridEl.innerHTML = "";

  songs.forEach((song) => {
    const card = document.createElement("div");
    card.className = "song-card";
    card.dataset.songId = song.id;
    card.innerHTML = `
      <div class="cover-wrap">
        <img src="${escapeHtml(song.cover)}" alt="Copertina di ${escapeHtml(song.title)}" loading="lazy">
        <button class="card-play" aria-label="Riproduci ${escapeHtml(song.title)}">&#9658;</button>
      </div>
      <p class="card-title">${escapeHtml(song.title)}</p>
      <p class="card-sub">${escapeHtml(song.author ? song.author : "")}</p>
    `;
    card.querySelector(".cover-wrap").appendChild(createHeartButton(song, "card-heart"));
    card.addEventListener("click", () => openNowPlaying(song, "home"));
    gridEl.appendChild(card);
  });

  for (let i = 0; i < remainingLocked; i++) {
    const card = document.createElement("div");
    card.className = "song-card locked";
    card.innerHTML = `
      <div class="cover-wrap">
        <img src="covers/default-cover.svg" alt="Brano bloccato">
      </div>
      <p class="card-title">Brano bloccato</p>
      <p class="card-sub">???</p>
    `;
    gridEl.appendChild(card);
  }

  // La libreria conta tutti i brani che puoi ascoltare (anche quelli "solo alfabetico")
  const total = getAvailableSongs().length;
  libraryCountEl.textContent = `${total} bran${total === 1 ? "o" : "i"}`;

  syncLikeButtons();
  highlightPlayingCard();
}

function highlightPlayingCard() {
  const playingId = currentSong ? currentSong.id : null;
  document.querySelectorAll("[data-song-id]").forEach((el) => {
    el.classList.toggle("playing", el.dataset.songId === playingId);
  });
}

/* ---------------- Ordina (bottone con 3 opzioni) ---------------- */

function updateSortUI() {
  sortBtnValue.textContent = SORT_LABELS[sortOrder];
  sortList.querySelectorAll(".sort-option").forEach((opt) => {
    opt.setAttribute("aria-checked", opt.dataset.sort === sortOrder ? "true" : "false");
  });
}

function setSortOrder(order) {
  if (!Object.prototype.hasOwnProperty.call(SORT_LABELS, order)) return;
  sortOrder = order;
  writeSortOrder(order);
  updateSortUI();
  renderGrid();
}

function openSortMenu() {
  sortList.hidden = false;
  sortBtn.setAttribute("aria-expanded", "true");
  const checked = sortList.querySelector('.sort-option[aria-checked="true"]');
  if (checked) checked.focus();
}

function closeSortMenu(returnFocus) {
  if (sortList.hidden) return;
  sortList.hidden = true;
  sortBtn.setAttribute("aria-expanded", "false");
  if (returnFocus) sortBtn.focus();
}

sortBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (sortList.hidden) {
    openSortMenu();
  } else {
    closeSortMenu(false);
  }
});

sortList.addEventListener("click", (e) => {
  const opt = e.target.closest(".sort-option");
  if (!opt) return;
  setSortOrder(opt.dataset.sort);
  closeSortMenu(true);
});

sortList.addEventListener("keydown", (e) => {
  const opts = Array.from(sortList.querySelectorAll(".sort-option"));
  const i = opts.indexOf(document.activeElement);
  if (e.key === "ArrowDown") {
    e.preventDefault();
    opts[(i + 1) % opts.length].focus();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    opts[(i - 1 + opts.length) % opts.length].focus();
  } else if (e.key === "Home") {
    e.preventDefault();
    opts[0].focus();
  } else if (e.key === "End") {
    e.preventDefault();
    opts[opts.length - 1].focus();
  }
});

// Cliccando fuori dal menu, o premendo Esc, si chiude
document.addEventListener("click", (e) => {
  if (!sortMenu.contains(e.target)) closeSortMenu(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !sortList.hidden) closeSortMenu(true);
});

/* ---------------- Viste: Home / Preferiti ---------------- */

function setView(name) {
  if (name !== "home" && name !== "favorites" && name !== "settings") return;
  currentView = name;

  viewHome.hidden = name !== "home";
  viewFavorites.hidden = name !== "favorites";
  viewSettings.hidden = name !== "settings";

  document.querySelectorAll("[data-view]").forEach((el) => {
    const active = el.dataset.view === name;
    el.classList.toggle("active", active);
    if (el.getAttribute("role") === "tab") {
      el.setAttribute("aria-selected", active ? "true" : "false");
    }
  });

  closeSortMenu(false);
  mainEl.scrollTop = 0;
}

document.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    setView(el.dataset.view);
  });
});

/* ---------------- Playlist dei preferiti ---------------- */

function updateFavoriteCounts() {
  const n = getFavoriteSongs().length;
  navFavCount.textContent = n ? String(n) : "";
  tabFavCount.textContent = n ? String(n) : "";
  favCountEl.textContent = `${n} bran${n === 1 ? "o" : "i"}`;
}

function renderFavorites() {
  const songs = getFavoriteSongs();

  favListEl.innerHTML = "";

  songs.forEach((song, i) => {
    const sub = [formatDate(song.date), song.author].filter(Boolean).join(" · ");

    const li = document.createElement("li");
    li.className = "fav-row";
    li.dataset.songId = song.id;
    li.innerHTML = `
      <button type="button" class="fav-handle" aria-label="Trascina per spostare ${escapeHtml(song.title)}" title="Trascina per spostare">${GRIP_SVG}</button>
      <span class="fav-pos">${i + 1}</span>
      <button type="button" class="fav-main">
        <img class="fav-cover" src="${escapeHtml(song.cover)}" alt="" loading="lazy">
        <span class="fav-info">
          <span class="fav-row-title">${escapeHtml(song.title)}</span>
          <span class="fav-row-sub">${escapeHtml(sub)}</span>
        </span>
      </button>
      <div class="fav-actions">
        <button type="button" class="fav-move" data-dir="-1" aria-label="Sposta ${escapeHtml(song.title)} più su"${i === 0 ? " disabled" : ""}>&#9650;</button>
        <button type="button" class="fav-move" data-dir="1" aria-label="Sposta ${escapeHtml(song.title)} più giù"${i === songs.length - 1 ? " disabled" : ""}>&#9660;</button>
      </div>
    `;
    li.querySelector(".fav-actions").appendChild(createHeartButton(song, "fav-heart"));
    favListEl.appendChild(li);
  });

  const empty = songs.length === 0;
  favEmptyEl.hidden = !empty;
  favHintEl.hidden = songs.length < 2; // il suggerimento serve solo se c'è qualcosa da spostare
  favPlayBtn.hidden = empty;

  updateFavoriteCounts();
  syncLikeButtons();
  highlightPlayingCard();
}

// Sposta un brano di una posizione su (-1) o giù (+1) nella playlist
function moveFavorite(songId, dir) {
  const ids = getFavoriteSongs().map((s) => s.id);
  const i = ids.indexOf(songId);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= ids.length) return;

  [ids[i], ids[j]] = [ids[j], ids[i]];
  setFavoriteOrder(ids);
  renderFavorites();

  // Rimette il focus sul tasto appena usato (o sull'altra freccia se siamo arrivati in cima/in fondo)
  const row = Array.from(favListEl.children).find((li) => li.dataset.songId === songId);
  if (row) {
    const same = row.querySelector(`.fav-move[data-dir="${dir}"]`);
    const target = same && !same.disabled ? same : row.querySelector(".fav-move:not(:disabled)");
    if (target) target.focus();
  }
}

favListEl.addEventListener("click", (e) => {
  const row = e.target.closest(".fav-row");
  if (!row) return;

  if (e.target.closest(".fav-handle")) return;

  const moveBtn = e.target.closest(".fav-move");
  if (moveBtn) {
    if (!moveBtn.disabled) moveFavorite(row.dataset.songId, Number(moveBtn.dataset.dir));
    return;
  }

  if (e.target.closest(".heart-btn") || e.target.closest(".fav-actions")) return;

  const song = ALL_SONGS_BY_ID.get(row.dataset.songId);
  if (song) openNowPlaying(song, "favorites");
});

favPlayBtn.addEventListener("click", () => {
  const songs = getFavoriteSongs();
  if (songs.length) openNowPlaying(songs[0], "favorites");
});

/* ----- Trascinamento (mouse e dito) con la maniglia ⋮⋮ ----- */

let favDrag = null;

function onFavPointerDown(e) {
  const handle = e.target.closest ? e.target.closest(".fav-handle") : null;
  if (!handle || favDrag) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;

  const rows = Array.from(favListEl.children);
  const row = handle.closest(".fav-row");
  const from = rows.indexOf(row);
  if (from === -1 || rows.length < 2) return;

  // Distanza tra una riga e la successiva (altezza + spazio)
  const step = rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top;
  if (!(step > 0)) return;

  e.preventDefault();
  if (handle.setPointerCapture) {
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* non è un problema */ }
  }

  favDrag = {
    row, rows, from, to: from, step,
    pointerId: e.pointerId,
    startY: e.clientY,
    lastY: e.clientY,
    startScroll: mainEl.scrollTop,
    raf: 0,
  };
  row.classList.add("dragging");
  favListEl.classList.add("is-sorting");

  window.addEventListener("pointermove", onFavPointerMove);
  window.addEventListener("pointerup", onFavPointerUp);
  window.addEventListener("pointercancel", onFavPointerCancel);
  favDrag.raf = requestAnimationFrame(favDragTick);
}

function onFavPointerMove(e) {
  if (!favDrag || e.pointerId !== favDrag.pointerId) return;
  favDrag.lastY = e.clientY;
}

function onFavPointerUp(e) { endFavDrag(e, false); }
function onFavPointerCancel(e) { endFavDrag(e, true); }

// Ad ogni fotogramma: la riga trascinata segue il dito e le altre si fanno da parte
function favDragTick() {
  if (!favDrag) return;
  const d = favDrag;

  // Se il dito arriva vicino al bordo alto/basso, la pagina scorre da sola
  const box = mainEl.getBoundingClientRect();
  const edge = 70;
  if (d.lastY < box.top + edge) {
    mainEl.scrollTop -= 10;
  } else if (d.lastY > box.bottom - edge) {
    mainEl.scrollTop += 10;
  }

  const n = d.rows.length;
  let dy = d.lastY - d.startY + (mainEl.scrollTop - d.startScroll);
  dy = Math.max(-d.from * d.step, Math.min((n - 1 - d.from) * d.step, dy));
  d.row.style.transform = `translateY(${dy}px)`;

  const to = Math.max(0, Math.min(n - 1, Math.round(d.from + dy / d.step)));
  d.to = to;

  d.rows.forEach((r, i) => {
    if (r === d.row) return;
    let shift = 0;
    if (d.from < to && i > d.from && i <= to) shift = -d.step;
    else if (d.from > to && i >= to && i < d.from) shift = d.step;
    r.style.transform = shift ? `translateY(${shift}px)` : "";
  });

  d.raf = requestAnimationFrame(favDragTick);
}

function endFavDrag(e, cancelled) {
  if (!favDrag || (e && e.pointerId !== favDrag.pointerId)) return;
  const d = favDrag;
  favDrag = null;

  cancelAnimationFrame(d.raf);
  window.removeEventListener("pointermove", onFavPointerMove);
  window.removeEventListener("pointerup", onFavPointerUp);
  window.removeEventListener("pointercancel", onFavPointerCancel);

  favListEl.classList.remove("is-sorting");
  d.rows.forEach((r) => {
    r.style.transform = "";
    r.classList.remove("dragging");
  });

  if (!cancelled && d.to !== d.from) {
    const ids = d.rows.map((r) => r.dataset.songId);
    const [moved] = ids.splice(d.from, 1);
    ids.splice(d.to, 0, moved);
    setFavoriteOrder(ids); // salva subito il nuovo ordine sul dispositivo
  }
  renderFavorites();
}

favListEl.addEventListener("pointerdown", onFavPointerDown);

/* ---------------- Player ---------------- */

function safePlay() {
  const p = audioEl.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => {
      // L'autoplay potrebbe essere bloccato dal browser finché l'utente
      // non interagisce con la pagina: non è un errore bloccante.
    });
  }
}

// "context" dice da quale lista parte il brano ("home" o "favorites"):
// serve a far funzionare bene successivo/precedente.
//
// Prima di far partire davvero il brano, controlla se è il momento di
// mostrare una pubblicità (vedi la sezione "Pubblicità" più sotto): se sì,
// il brano parte solo dopo che la pubblicità è stata saltata o disattivata.
function playSong(song, context) {
  if (adPlaying) return; // mentre gira la pubblicità non si cambia brano

  if (!adsDisabled) {
    adSongCount++;
    writeAdSongCount(adSongCount);
  }

  if (!adsDisabled && adSongCount >= adInterval()) {
    adSongCount = 0;
    writeAdSongCount(0);
    openAdOverlay(song, context);
    return;
  }

  startPlayback(song, context);
}

// La riproduzione vera e propria (quello che prima era tutto il corpo di playSong).
function startPlayback(song, context) {
  if (context) playContext = context;
  currentSong = song;

  audioEl.src = song.audio;
  safePlay();

  // Aggiorna sia la mini-barra in basso sia il pannello a tendina (se aperto
  // o no, resta sempre sincronizzato col brano corrente), come richiesto:
  // se si cambia canzone, il menu a tendina deve mostrare la nuova canzone.
  npTitle.textContent = song.title;
  npDate.textContent = formatDate(song.date);
  npCover.src = song.cover;

  npPanelTitle.textContent = song.title;
  npPanelDate.textContent = formatDate(song.date);
  npPanelCover.src = song.cover;

  npExpandBtn.disabled = false;

  syncLikeButtons();
  highlightPlayingCard();
}

function playByQueueIndex(index) {
  const queue = getQueue();
  if (index < 0 || index >= queue.length) return;
  playSong(queue[index]);
}

/* ---------------- Pubblicità: video a comparsa ogni tot canzoni ---------------- */

// Blocca tutti i comandi del player mentre gira la pubblicità (non si può
// mettere in pausa, cambiare brano o spostarsi nel tempo).
function lockPlayerControls() {
  [playBtn, prevBtn, nextBtn, seekBar, npPanelPlayBtn, npPanelPrevBtn, npPanelNextBtn, npPanelSeek]
    .forEach((el) => { if (el) el.disabled = true; });
  document.body.classList.add("ad-locked");
}

// Rimette i permessi di spostarsi/comandare il player, a pubblicità finita.
function unlockPlayerControls() {
  [playBtn, prevBtn, nextBtn, seekBar, npPanelPlayBtn, npPanelPrevBtn, npPanelNextBtn, npPanelSeek]
    .forEach((el) => { if (el) el.disabled = false; });
  document.body.classList.remove("ad-locked");
}

function pickAdVideo() {
  if (typeof AD_VIDEOS === "undefined" || !Array.isArray(AD_VIDEOS) || !AD_VIDEOS.length) return null;
  return AD_VIDEOS[Math.floor(Math.random() * AD_VIDEOS.length)];
}

// Mostra la pubblicità e mette in pausa il brano; "song"/"context" sono ciò
// che deve partire non appena la pubblicità finisce, viene saltata o disattivata.
function openAdOverlay(song, context) {
  const ad = pickAdVideo();
  if (!ad) {
    startPlayback(song, context);
    return;
  }

  adPlaying = true;
  adPendingSong = song;
  adPendingContext = context;
  adMaxTime = 0;

  audioEl.pause();
  lockPlayerControls();

  adVideo.src = ad.src;
  adVideo.currentTime = 0;
  adVideo.controls = false; // niente barra: il video non si può spostare avanti

  adOverlay.classList.add("is-open");
  adOverlay.setAttribute("aria-hidden", "false");

  const p = adVideo.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

function closeAdOverlay() {
  adPlaying = false;
  adOverlay.classList.remove("is-open");
  adOverlay.setAttribute("aria-hidden", "true");
  unlockPlayerControls();

  adVideo.pause();
  adVideo.removeAttribute("src");
  adVideo.load();

  const song = adPendingSong;
  const context = adPendingContext;
  adPendingSong = null;
  adPendingContext = null;

  if (song) startPlayback(song, context);

  if (pendingOpenPanel) {
    pendingOpenPanel = false;
    openPanel();
  }
}

// Il video della pubblicità non si può spostare avanti: se currentTime salta
// oltre il punto già visto (trascinamento, tasti, ecc.) lo si riporta indietro.
let adMaxTime = 0;
adVideo.addEventListener("timeupdate", () => {
  if (adVideo.currentTime > adMaxTime + 0.5) {
    adVideo.currentTime = adMaxTime;
  } else {
    adMaxTime = adVideo.currentTime;
  }
});
adVideo.addEventListener("seeking", () => {
  if (adVideo.currentTime > adMaxTime + 0.5) {
    adVideo.currentTime = adMaxTime;
  }
});

// Quando il video finisce da solo, si comporta come se fosse stato saltato.
adVideo.addEventListener("ended", closeAdOverlay);

// Se il video non riesce a caricarsi (file mancante, errore di rete, ecc.)
// non deve restare tutto bloccato: si salta la pubblicità da sola.
adVideo.addEventListener("error", closeAdOverlay);

// Si può saltare la pubblicità subito, appena compare.
adSkipBtn.addEventListener("click", closeAdOverlay);

// Disattiva le pubblicità (si riattivano da Impostazioni) e salta questa.
adDisableBtn.addEventListener("click", () => {
  setAdsDisabled(true);
  closeAdOverlay();
});

/* ---------------- Impostazioni: interruttore pubblicità ---------------- */

function syncAdsSettingsUI() {
  settingsAdsToggle.classList.toggle("is-on", !adsDisabled);
  settingsAdsToggle.setAttribute("aria-checked", adsDisabled ? "false" : "true");
  settingsAdsDesc.textContent = adsDisabled
    ? "Le pubblicità sono disattivate. Riattivale quando vuoi da qui."
    : `Ogni ${adInterval()} brani circa appare un breve video pubblicitario prima del successivo.`;
}

function setAdsDisabled(value) {
  adsDisabled = value;
  writeAdsDisabled(value);
  if (value) {
    // Riparte da zero: appena riattivate, le pubblicità ricominciano a contare da qui.
    adSongCount = 0;
    writeAdSongCount(0);
  }
  syncAdsSettingsUI();
}

settingsAdsToggle.addEventListener("click", () => {
  setAdsDisabled(!adsDisabled);
});

syncAdsSettingsUI();

/* ---------------- Menu a tendina (pannello "in riproduzione") ---------------- */

function openPanel() {
  if (!currentSong) return;
  panelOpen = true;
  npPanel.classList.add("is-open");
  npPanel.setAttribute("aria-hidden", "false");
  npBackdrop.classList.add("is-visible");
  npExpandBtn.classList.add("is-open");
  npExpandBtn.setAttribute("aria-label", "Chiudi il menu a tendina");
}

function closePanel() {
  panelOpen = false;
  npPanel.classList.remove("is-open");
  npPanel.setAttribute("aria-hidden", "true");
  npBackdrop.classList.remove("is-visible");
  npExpandBtn.classList.remove("is-open");
  npExpandBtn.setAttribute("aria-label", "Apri il menu a tendina");
}

function togglePanel() {
  if (panelOpen) {
    closePanel();
  } else {
    openPanel();
  }
}

// Cliccare un brano (card, riga dei preferiti o hero): riproduce E apre il
// menu a tendina con la sua cover, come richiesto.
// Se prima parte una pubblicità, il pannello si apre solo a pubblicità finita.
function openNowPlaying(song, context) {
  playSong(song, context);
  if (adPlaying) {
    pendingOpenPanel = true;
  } else {
    openPanel();
  }
}

npExpandBtn.addEventListener("click", togglePanel);
npOpenTrigger.addEventListener("click", () => {
  if (currentSong) togglePanel();
});
npPanelCloseBtn.addEventListener("click", closePanel);
npBackdrop.addEventListener("click", closePanel);

function togglePlayPause() {
  if (!currentSong) {
    // Nessun brano ancora scelto: parte dal primo della lista che stai guardando
    if (currentView === "favorites" && getFavoriteSongs().length) {
      playContext = "favorites";
    } else {
      playContext = "home";
    }
    playByQueueIndex(0);
    return;
  }
  if (audioEl.paused) {
    safePlay();
  } else {
    audioEl.pause();
  }
}

function playNext() {
  const queue = getQueue();
  if (!queue.length) return;
  const i = getCurrentIndex();
  // Se il brano non è più nella lista (es. tolto dai preferiti) si riparte dall'inizio
  playByQueueIndex(i === -1 ? 0 : (i + 1) % queue.length);
}

function playPrev() {
  const queue = getQueue();
  if (!queue.length) return;
  const i = getCurrentIndex();
  playByQueueIndex(i === -1 ? queue.length - 1 : (i - 1 + queue.length) % queue.length);
}

audioEl.addEventListener("play", () => {
  playBtn.innerHTML = "&#10074;&#10074;";
  playBtn.setAttribute("aria-label", "Blocca il brano");
  npPanelPlayBtn.innerHTML = "&#10074;&#10074;";
  npPanelPlayBtn.setAttribute("aria-label", "Blocca il brano");
  npPanel.classList.add("is-playing");
});

audioEl.addEventListener("pause", () => {
  playBtn.innerHTML = "&#9658;";
  playBtn.setAttribute("aria-label", "Riproduci il brano");
  npPanelPlayBtn.innerHTML = "&#9658;";
  npPanelPlayBtn.setAttribute("aria-label", "Riproduci il brano");
  npPanel.classList.remove("is-playing");
});

// Selezione automatica del brano successivo quando quello attuale finisce
// (il pannello, se aperto, si aggiorna già da solo tramite playSong)
audioEl.addEventListener("ended", playNext);

audioEl.addEventListener("loadedmetadata", () => {
  seekBar.max = audioEl.duration || 0;
  durTimeEl.textContent = formatTime(audioEl.duration);
  npPanelSeek.max = audioEl.duration || 0;
  npPanelDur.textContent = formatTime(audioEl.duration);
});

audioEl.addEventListener("timeupdate", () => {
  if (!seekBeingDragged) {
    seekBar.value = audioEl.currentTime;
  }
  if (!panelSeekBeingDragged) {
    npPanelSeek.value = audioEl.currentTime;
  }
  curTimeEl.textContent = formatTime(audioEl.currentTime);
  npPanelCur.textContent = formatTime(audioEl.currentTime);
});

playBtn.addEventListener("click", togglePlayPause);
nextBtn.addEventListener("click", playNext);
prevBtn.addEventListener("click", playPrev);

npPanelPlayBtn.addEventListener("click", togglePlayPause);
npPanelNextBtn.addEventListener("click", playNext);
npPanelPrevBtn.addEventListener("click", playPrev);

seekBar.addEventListener("mousedown", () => { seekBeingDragged = true; });
seekBar.addEventListener("touchstart", () => { seekBeingDragged = true; });
seekBar.addEventListener("input", (e) => {
  curTimeEl.textContent = formatTime(Number(e.target.value));
});
seekBar.addEventListener("change", (e) => {
  audioEl.currentTime = Number(e.target.value);
  seekBeingDragged = false;
});

npPanelSeek.addEventListener("mousedown", () => { panelSeekBeingDragged = true; });
npPanelSeek.addEventListener("touchstart", () => { panelSeekBeingDragged = true; });
npPanelSeek.addEventListener("input", (e) => {
  npPanelCur.textContent = formatTime(Number(e.target.value));
});
npPanelSeek.addEventListener("change", (e) => {
  audioEl.currentTime = Number(e.target.value);
  panelSeekBeingDragged = false;
});

volumeBar.addEventListener("input", (e) => {
  audioEl.volume = Number(e.target.value) / 100;
});
audioEl.volume = Number(volumeBar.value) / 100;

/* ---------------- Sblocco brani nascosti ---------------- */

function showUnlockMessage(text, type) {
  const messageEl = document.getElementById("unlock-message");
  messageEl.textContent = text;
  messageEl.className = "unlock-message " + type;
}

// I brani senza data si vedono solo nell'ordine alfabetico (vedi config.js):
// se ne hai appena sbloccato uno e non lo vedi, il messaggio spiega dove trovarlo.
function hiddenSongsNote(songs) {
  const hidden = songs.filter((s) => isHiddenInOrder(s, sortOrder));
  if (!hidden.length) return "";
  return hidden.length === 1
    ? " Non ha una data: lo trovi nell'ordine alfabetico."
    : ` ${hidden.length} di questi non hanno una data: li trovi nell'ordine alfabetico.`;
}

function handleUnlockSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("unlock-input");
  const guess = input.value.trim();

  if (!guess) {
    showUnlockMessage("Scrivi il titolo di un brano.", "err");
    return;
  }

  if (!LOCKED_SONGS.length) {
    showUnlockMessage("Per ora non ci sono brani nascosti.", "err");
    return;
  }

  // Codice speciale che sblocca tutto in una volta
  if (
    typeof MASTER_UNLOCK_CODE === "string" &&
    MASTER_UNLOCK_CODE &&
    normalizeText(guess) === normalizeText(MASTER_UNLOCK_CODE)
  ) {
    const nuovi = LOCKED_SONGS.filter((song) => unlockSong(song));
    input.value = "";
    refreshAfterUnlock();
    showUnlockMessage(
      nuovi.length
        ? `Hai sbloccato tutti i brani nascosti (${nuovi.length} nuovi)!${hiddenSongsNote(nuovi)}`
        : "Hai già sbloccato tutti i brani nascosti!",
      "ok"
    );
    return;
  }

  const matches = findSongsByGuess(guess);

  if (!matches.length) {
    showUnlockMessage("Nessun brano con questo titolo. Riprova!", "err");
    return;
  }

  // Sblocca tutti i brani il cui titolo contiene quella parola
  const nuovi = matches.filter((song) => unlockSong(song));

  if (!nuovi.length) {
    showUnlockMessage(
      matches.length === 1
        ? `"${matches[0].title}" l'avevi già sbloccato!`
        : "Questi brani li avevi già sbloccati!",
      "ok"
    );
    return;
  }

  input.value = "";
  refreshAfterUnlock();

  showUnlockMessage(
    (nuovi.length === 1
      ? `Hai sbloccato "${nuovi[0].title}"!`
      : `Hai sbloccato ${nuovi.length} brani: ${nuovi.map((s) => `"${s.title}"`).join(", ")}!`) +
      hiddenSongsNote(nuovi),
    "ok"
  );
}

// Dopo uno sblocco la lista cambia: si ridisegna tutto.
// (La posizione nella coda si ricalcola da sola: vedi getCurrentIndex.)
function refreshAfterUnlock() {
  renderGrid();
  renderHero();
  renderFavorites();
}

document.getElementById("unlock-form").addEventListener("submit", handleUnlockSubmit);

/* ---------------- Più schede aperte: tutto resta allineato ---------------- */

window.addEventListener("storage", (e) => {
  if (e.key === FAVORITES_KEY) {
    favoriteIds = readFavoriteIds();
    onFavoritesChanged();
  } else if (e.key === SORT_KEY) {
    sortOrder = readSortOrder();
    updateSortUI();
    renderGrid();
  } else if (e.key === STORAGE_KEY) {
    unlockedIds = new Set(readUnlockedIds());
    refreshAfterUnlock();
  }
});

/* ---------------- Avvio ---------------- */

updateSortUI();
renderHero();
renderGrid();
renderFavorites();
setView("home");

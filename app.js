// app.js — logica di Spisso (Spotify-style single page player)

const STORAGE_KEY = "spisso_unlocked_count";

/* ---------------- Stato brani sbloccati ---------------- */

function getUnlockedCount() {
  return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
}

function setUnlockedCount(n) {
  localStorage.setItem(STORAGE_KEY, String(n));
}

function getUnlockedLockedSongs() {
  return LOCKED_SONGS.slice(0, getUnlockedCount());
}

// Elenco di TUTTI i brani attualmente visibili (pubblici + sbloccati),
// nell'ordine in cui appaiono in pagina: è anche la coda di riproduzione.
function getQueue() {
  return [...SONGS, ...getUnlockedLockedSongs()];
}

/* ---------------- Utility data/testo ---------------- */

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
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
const gridEl = document.getElementById("song-grid");
const heroTitle = document.getElementById("hero-title");
const heroPlayBtn = document.getElementById("hero-play");
const libraryCountEl = document.getElementById("library-count");

let currentIndex = -1; // indice nella coda corrente (getQueue())
let seekBeingDragged = false;

/* ---------------- Rendering ---------------- */

function renderHero() {
  const queue = getQueue();
  const song = getSongOfTheDay(queue);
  heroTitle.textContent = song.title;
  heroPlayBtn.onclick = () => playByQueueIndex(queue.indexOf(song));
}

function renderGrid() {
  const queue = getQueue();
  const remainingLocked = LOCKED_SONGS.length - getUnlockedCount();

  gridEl.innerHTML = "";

  queue.forEach((song, i) => {
    const card = document.createElement("div");
    card.className = "song-card";
    card.dataset.index = i;
    card.innerHTML = `
      <div class="cover-wrap">
        <img src="${song.cover}" alt="Copertina di ${song.title}" loading="lazy">
        <button class="card-play" aria-label="Riproduci ${song.title}">&#9658;</button>
      </div>
      <p class="card-title">${song.title}</p>
      <p class="card-sub">Spisso</p>
    `;
    card.addEventListener("click", () => playByQueueIndex(i));
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

  libraryCountEl.textContent = `${queue.length} bran${queue.length === 1 ? "o" : "i"}`;
  highlightPlayingCard();
}

function highlightPlayingCard() {
  document.querySelectorAll(".song-card").forEach((card) => {
    card.classList.toggle("playing", Number(card.dataset.index) === currentIndex);
  });
}

/* ---------------- Player ---------------- */

function playByQueueIndex(index) {
  const queue = getQueue();
  if (index < 0 || index >= queue.length) return;

  currentIndex = index;
  const song = queue[index];

  audioEl.src = song.audio;
  audioEl.play().catch(() => {
    // L'autoplay potrebbe essere bloccato dal browser finché l'utente
    // non interagisce con la pagina: non è un errore bloccante.
  });

  npTitle.textContent = song.title;
  npDate.textContent = formatDate(song.date);
  npCover.src = song.cover;

  highlightPlayingCard();
}

function togglePlayPause() {
  if (currentIndex === -1) {
    // Nessun brano ancora scelto: parte dal primo della coda
    playByQueueIndex(0);
    return;
  }
  if (audioEl.paused) {
    audioEl.play();
  } else {
    audioEl.pause();
  }
}

function playNext() {
  const queue = getQueue();
  if (!queue.length) return;
  const next = (currentIndex + 1) % queue.length;
  playByQueueIndex(next);
}

function playPrev() {
  const queue = getQueue();
  if (!queue.length) return;
  const prev = (currentIndex - 1 + queue.length) % queue.length;
  playByQueueIndex(prev);
}

audioEl.addEventListener("play", () => {
  playBtn.innerHTML = "&#10074;&#10074;";
});

audioEl.addEventListener("pause", () => {
  playBtn.innerHTML = "&#9658;";
});

// Selezione automatica del brano successivo quando quello attuale finisce
audioEl.addEventListener("ended", playNext);

audioEl.addEventListener("loadedmetadata", () => {
  seekBar.max = audioEl.duration || 0;
  durTimeEl.textContent = formatTime(audioEl.duration);
});

audioEl.addEventListener("timeupdate", () => {
  if (!seekBeingDragged) {
    seekBar.value = audioEl.currentTime;
  }
  curTimeEl.textContent = formatTime(audioEl.currentTime);
});

playBtn.addEventListener("click", togglePlayPause);
nextBtn.addEventListener("click", playNext);
prevBtn.addEventListener("click", playPrev);

seekBar.addEventListener("mousedown", () => { seekBeingDragged = true; });
seekBar.addEventListener("touchstart", () => { seekBeingDragged = true; });
seekBar.addEventListener("input", (e) => {
  curTimeEl.textContent = formatTime(Number(e.target.value));
});
seekBar.addEventListener("change", (e) => {
  audioEl.currentTime = Number(e.target.value);
  seekBeingDragged = false;
});

volumeBar.addEventListener("input", (e) => {
  audioEl.volume = Number(e.target.value) / 100;
});
audioEl.volume = Number(volumeBar.value) / 100;

/* ---------------- Sblocco brani nascosti ---------------- */

function handleUnlockSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("unlock-input");
  const messageEl = document.getElementById("unlock-message");
  const code = input.value.trim().toLowerCase();

  if (code !== UNLOCK_CODE.toLowerCase()) {
    messageEl.textContent = "Codice non valido.";
    messageEl.className = "unlock-message err";
    return;
  }

  const current = getUnlockedCount();
  if (current >= LOCKED_SONGS.length) {
    messageEl.textContent = "Hai già sbloccato tutti i brani nascosti!";
    messageEl.className = "unlock-message ok";
    return;
  }

  const newSong = LOCKED_SONGS[current];
  setUnlockedCount(current + 1);
  messageEl.textContent = `Hai sbloccato "${newSong.title}"!`;
  messageEl.className = "unlock-message ok";
  input.value = "";

  renderGrid();
  renderHero();
}

document.getElementById("unlock-form").addEventListener("submit", handleUnlockSubmit);

/* ---------------- Avvio ---------------- */

renderHero();
renderGrid();

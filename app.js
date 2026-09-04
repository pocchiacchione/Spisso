// app.js — logica della homepage

const STORAGE_KEY = "rs_unlocked_count";

function getUnlockedCount() {
  return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
}

function setUnlockedCount(n) {
  localStorage.setItem(STORAGE_KEY, String(n));
}

function getUnlockedLockedSongs() {
  return LOCKED_SONGS.slice(0, getUnlockedCount());
}

function getAllVisibleSongs() {
  return [...SONGS, ...getUnlockedLockedSongs()];
}

// Sceglie sempre la stessa canzone per tutto il giorno, cambia il giorno dopo
function getSongOfTheDay(list) {
  const today = new Date();
  const seed = today.getFullYear() * 372 + today.getMonth() * 31 + today.getDate();
  return list[seed % list.length];
}

function renderSongOfTheDay() {
  const all = getAllVisibleSongs();
  const song = getSongOfTheDay(all);
  document.getElementById("today-title").textContent = song.title;
  document.getElementById("today-play").href = "player.html?id=" + song.id;
}

function renderSongList() {
  const listEl = document.getElementById("song-list");
  listEl.innerHTML = "";

  const visible = getAllVisibleSongs();
  const remainingLocked = LOCKED_SONGS.length - getUnlockedCount();

  visible.forEach((song, i) => {
    const row = document.createElement("a");
    row.className = "song-row";
    row.href = "player.html?id=" + song.id;
    row.innerHTML = `
      <span class="num">${String(i + 1).padStart(2, "0")}</span>
      <span class="title">${song.title}</span>
      <span class="go">ascolta</span>
    `;
    listEl.appendChild(row);
  });

  // Mostra righe "bloccate" per le canzoni non ancora sbloccate, senza rivelarne il nome
  for (let i = 0; i < remainingLocked; i++) {
    const row = document.createElement("div");
    row.className = "song-row locked";
    row.innerHTML = `
      <span class="num">${String(visible.length + i + 1).padStart(2, "0")}</span>
      <span class="title">Canzone bloccata</span>
      <span class="go">?</span>
    `;
    listEl.appendChild(row);
  }
}

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
    messageEl.textContent = "Hai già sbloccato tutte le canzoni nascoste!";
    messageEl.className = "unlock-message ok";
    return;
  }

  const newSong = LOCKED_SONGS[current];
  setUnlockedCount(current + 1);
  messageEl.textContent = `Hai sbloccato "${newSong.title}"!`;
  messageEl.className = "unlock-message ok";
  input.value = "";

  renderSongList();
  renderSongOfTheDay();
}

document.getElementById("unlock-form").addEventListener("submit", handleUnlockSubmit);

renderSongOfTheDay();
renderSongList();

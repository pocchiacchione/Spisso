// player.js — controlli MP3-style che pilotano un player YouTube nascosto

function getSongIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function findSong(id) {
  return [...SONGS, ...LOCKED_SONGS].find((s) => s.id === id);
}

function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

const song = findSong(getSongIdFromUrl());

if (!song) {
  document.getElementById("song-title").textContent = "Canzone non trovata";
} else {
  document.getElementById("song-title").textContent = song.title;
  document.getElementById("song-date").textContent = formatDate(song.date);
  document.getElementById("youtube-link").href = song.url;
}

let ytPlayer = null;
let isPlaying = false;
let seekBeingDragged = false;

function onYouTubeIframeAPIReady() {
  if (!song) return;
  const videoId = extractVideoId(song.url);
  ytPlayer = new YT.Player("yt-player", {
    height: "1",
    width: "1",
    videoId: videoId,
    playerVars: { controls: 0, disablekb: 1, modestbranding: 1 },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerReady() {
  ytPlayer.setVolume(80);
  document.getElementById("duration-time").textContent = "0:00";
}

function onPlayerStateChange(event) {
  isPlaying = event.data === YT.PlayerState.PLAYING;
  document.getElementById("play-pause-btn").innerHTML = isPlaying ? "&#10074;&#10074;" : "&#9658;";
}

document.getElementById("play-pause-btn").addEventListener("click", () => {
  if (!ytPlayer) return;
  if (isPlaying) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.playVideo();
  }
});

document.getElementById("volume-bar").addEventListener("input", (e) => {
  if (ytPlayer) ytPlayer.setVolume(Number(e.target.value));
});

const seekBar = document.getElementById("seek-bar");

seekBar.addEventListener("mousedown", () => { seekBeingDragged = true; });
seekBar.addEventListener("touchstart", () => { seekBeingDragged = true; });

seekBar.addEventListener("change", (e) => {
  if (ytPlayer) ytPlayer.seekTo(Number(e.target.value), true);
  seekBeingDragged = false;
});

// Aggiorna la barra di avanzamento e i tempi ogni mezzo secondo
setInterval(() => {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== "function") return;
  const duration = ytPlayer.getDuration();
  const current = ytPlayer.getCurrentTime();

  if (duration > 0) {
    seekBar.max = duration;
    document.getElementById("duration-time").textContent = formatTime(duration);
  }
  if (!seekBeingDragged) {
    seekBar.value = current;
  }
  document.getElementById("current-time").textContent = formatTime(current);
}, 500);

// Carica lo script ufficiale dell'API YouTube
const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
document.body.appendChild(tag);

// config.js
// Impostazioni del sito che NON vengono toccate dallo script
// generate-manifest.js (quello scrive solo songs.js).

// --- Sblocco dei brani nascosti ---------------------------------------
// Adesso NON c'è più un codice unico uguale per tutti: ogni brano bloccato
// si sblocca scrivendo il SUO titolo, oppure anche solo UNA PAROLA del titolo.
// Esempio: il brano "Ludo e Fede" si sblocca scrivendo
//   "Ludo e Fede"  oppure  "Ludo"  oppure  "Fede"  oppure  "ludo e fede"
// (maiuscole, accenti e punteggiatura non contano).

// Lunghezza minima della parola accettata: serve a evitare che parole
// corte tipo "e" o "il" sblocchino un brano per caso.
const MIN_UNLOCK_WORD_LENGTH = 3;

// Parole troppo comuni: da sole non bastano a sbloccare un brano.
// (Vanno bene lo stesso se fanno parte del titolo completo scritto per intero.)
const UNLOCK_STOP_WORDS = [
  "il", "lo", "la", "i", "gli", "le", "un", "uno", "una",
  "di", "del", "dei", "della", "delle", "dello", "degli",
  "da", "dal", "dalla", "in", "nel", "nella", "con", "su", "sul", "sulla",
  "per", "tra", "fra", "che", "chi", "non", "mi", "ti", "si", "ci", "vi",
  "the", "and", "you", "and"
];

// Codice speciale che sblocca TUTTI i brani in una volta.
// Metti null se non lo vuoi.
const MASTER_UNLOCK_CODE = "piocheddar";

// --- Ordine dei brani nella schermata principale ----------------------
// I brani il cui file audio NON ha la data nel nome (es. "Fa Schifo Tutto.mp3")
// non hanno una posizione nel tempo, quindi non si possono mettere in ordine
// cronologico.
//   true  -> compaiono SOLO con l'ordine alfabetico (scompaiono da
//            "cronologico" e "cronologico inverso")
//   false -> compaiono sempre, in fondo alla lista negli ordini cronologici
const UNDATED_ONLY_IN_ALPHABETICAL = true;

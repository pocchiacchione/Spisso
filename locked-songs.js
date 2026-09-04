// locked-songs.js
// Canzoni nascoste che si sbloccano inserendo il codice sul sito.
// Ogni volta che qualcuno inserisce il codice giusto, si sblocca la
// PROSSIMA canzone di questa lista che non è ancora stata sbloccata,
// quindi l'ordine qui sotto è l'ordine con cui verranno rivelate.

const UNLOCK_CODE = "piocheddar";

const LOCKED_SONGS = [
  {
    id: "l1",
    title: "Segreto di Gallipoli",
    url: "https://www.youtube.com/watch?v=9bZkp7q19f0",
    date: "2024-09-10"
  },
  {
    id: "l2",
    title: "Luna su Otranto",
    url: "https://www.youtube.com/watch?v=kXYiU_JCYtU",
    date: "2024-09-24"
  },
  {
    id: "l3",
    title: "Ultima Taranta",
    url: "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
    date: "2024-10-05"
  }
];

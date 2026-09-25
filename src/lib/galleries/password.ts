const WORDS = [
  "abend", "anstoss", "ball", "bank", "blende", "blitz", "block", "bogen", "brise", "dach",
  "derby", "dunst", "ecke", "einlauf", "feld", "finale", "flanke", "foto", "funke", "glanz",
  "halle", "hafen", "himmel", "jubel", "kamera", "kante", "kurve", "libero", "licht", "linse",
  "meer", "moment", "nebel", "netz", "parade", "pause", "pokal", "rauch", "regen", "ring",
  "sand", "satz", "schatten", "schuss", "sieg", "sonne", "spiel", "sprung", "stern", "sturm",
  "tor", "tribuene", "wand", "welle", "wind", "wolke", "zeit", "ziel", "jubelruf", "anpfiff",
];

const cryptoRandomInt = (max: number) => crypto.getRandomValues(new Uint32Array(1))[0] % max;

/** Merkbares Passwort „wort-wort-NN“ (60 × 59 × 90 ≈ 320 000 Kombinationen, dazu Rate-Limit). */
export function generateGalleryPassword(randomInt: (max: number) => number = cryptoRandomInt): string {
  const first = WORDS[randomInt(WORDS.length)];
  const rest = WORDS.filter((word) => word !== first);
  const second = rest[randomInt(rest.length)];
  return `${first}-${second}-${10 + randomInt(90)}`;
}

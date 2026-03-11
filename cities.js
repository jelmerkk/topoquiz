// Stadsdata voor de Topo Quiz.
// Veld 'sets':    array van set-nummers waarin de stad voorkomt.
// Veld 'aliases': alternatieve spellingen die als correct antwoord worden geaccepteerd
//                 bij de tekstinvoer-modus.
// Bevolkingscijfers: CBS 2023 (afgerond op duizendtallen).
//
// De radius van elke stip wordt berekend op basis van de GLOBALE
// min/max over ALLE steden, zodat groottes consistent blijven
// ongeacht welke set je speelt.

const ALL_CITIES = [
  { name: "Amsterdam",           lat: 52.37, lon: 4.90, pop:  921000, sets: [1] },
  { name: "Haarlem",             lat: 52.38, lon: 4.63, pop:  163000, sets: [1] },
  { name: "Alkmaar",             lat: 52.63, lon: 4.75, pop:  108000, sets: [1] },
  { name: "Purmerend",           lat: 52.50, lon: 4.96, pop:   81000, sets: [1] },
  { name: "Zaanstad",            lat: 52.44, lon: 4.81, pop:  156000, sets: [1] },
  { name: "Hoorn",               lat: 52.64, lon: 5.06, pop:   73000, sets: [1] },
  { name: "Den Haag",            lat: 52.08, lon: 4.30, pop:  548000, sets: [1], aliases: ["'s-Gravenhage", "s-Gravenhage", "Den haag"] },
  { name: "Rotterdam",           lat: 51.93, lon: 4.48, pop:  651000, sets: [1] },
  { name: "Leiden",              lat: 52.16, lon: 4.50, pop:  123000, sets: [1] },
  { name: "Delft",               lat: 52.01, lon: 4.36, pop:  103000, sets: [1] },
  { name: "Gouda",               lat: 52.01, lon: 4.70, pop:   73000, sets: [1] },
  { name: "Dordrecht",           lat: 51.82, lon: 4.69, pop:  119000, sets: [1] },
  { name: "Spijkenisse",         lat: 51.85, lon: 4.33, pop:   73000, sets: [1] },
  { name: "Zoetermeer",          lat: 52.06, lon: 4.49, pop:  124000, sets: [1] },
  { name: "Alphen aan den Rijn", lat: 52.13, lon: 4.66, pop:  110000, sets: [1], aliases: ["Alphen"] },
  { name: "Utrecht",             lat: 52.09, lon: 5.12, pop:  361000, sets: [1] },
  { name: "Amersfoort",          lat: 52.16, lon: 5.39, pop:  158000, sets: [1] },
  { name: "Zeist",               lat: 52.09, lon: 5.23, pop:   65000, sets: [1] },
  { name: "Hilversum",           lat: 52.22, lon: 5.18, pop:   91000, sets: [1] },
  { name: "Groningen",           lat: 53.22, lon: 6.57, pop:  234000, sets: [1] },
  { name: "Leeuwarden",          lat: 53.20, lon: 5.80, pop:  123000, sets: [1] },
  { name: "Assen",               lat: 52.99, lon: 6.55, pop:   68000, sets: [1] },
  { name: "Emmen",               lat: 52.78, lon: 6.90, pop:  107000, sets: [1] },
  { name: "Zwolle",              lat: 52.51, lon: 6.09, pop:  130000, sets: [1] },
  { name: "Almelo",              lat: 52.35, lon: 6.66, pop:   72000, sets: [1] },
  { name: "Hengelo",             lat: 52.27, lon: 6.79, pop:   81000, sets: [1] },
  { name: "Enschede",            lat: 52.22, lon: 6.89, pop:  158000, sets: [1] },
  { name: "Deventer",            lat: 52.25, lon: 6.16, pop:  100000, sets: [1] },
  { name: "Lelystad",            lat: 52.50, lon: 5.47, pop:   77000, sets: [1] },
  { name: "Almere",              lat: 52.37, lon: 5.21, pop:  215000, sets: [1] },
  { name: "Apeldoorn",           lat: 52.21, lon: 5.97, pop:  164000, sets: [1] },
  { name: "Arnhem",              lat: 51.98, lon: 5.91, pop:  163000, sets: [1] },
  { name: "Nijmegen",            lat: 51.84, lon: 5.85, pop:  176000, sets: [1] },
  { name: "Ede",                 lat: 52.04, lon: 5.66, pop:  116000, sets: [1] },
  { name: "Middelburg",          lat: 51.50, lon: 3.61, pop:   48000, sets: [1] },
  { name: "Roosendaal",          lat: 51.53, lon: 4.46, pop:   77000, sets: [1] },
  { name: "Breda",               lat: 51.59, lon: 4.78, pop:  184000, sets: [1] },
  { name: "Tilburg",             lat: 51.56, lon: 5.09, pop:  222000, sets: [1] },
  { name: "'s-Hertogenbosch",    lat: 51.69, lon: 5.31, pop:  154000, sets: [1], aliases: ["Den Bosch", "s-Hertogenbosch", "s Hertogenbosch", "Hertogenbosch"] },
  { name: "Oss",                 lat: 51.76, lon: 5.52, pop:   92000, sets: [1] },
  { name: "Helmond",             lat: 51.48, lon: 5.66, pop:   92000, sets: [1] },
  { name: "Eindhoven",           lat: 51.44, lon: 5.48, pop:  234000, sets: [1] },
  { name: "Sittard",             lat: 50.99, lon: 5.87, pop:   93000, sets: [1] },
  { name: "Heerlen",             lat: 50.88, lon: 5.98, pop:   86000, sets: [1] },
  { name: "Kerkrade",            lat: 50.87, lon: 6.07, pop:   45000, sets: [1] },
  { name: "Maastricht",          lat: 50.85, lon: 5.69, pop:  122000, sets: [1] },
];

// Set-definities: setNumber → weergavenaam
const SETS = {
  1: { name: '5.6 – Grote steden' },
};

// Radius op logaritmische schaal (4–12px), gebaseerd op globale min/max.
// Altijd berekend over ALL_CITIES zodat groottes consistent zijn over sets.
const _POP_LOG_MIN = Math.log(Math.min(...ALL_CITIES.map(c => c.pop)));
const _POP_LOG_MAX = Math.log(Math.max(...ALL_CITIES.map(c => c.pop)));

function cityRadius(city) {
  return Math.round(4 + 8 * (Math.log(city.pop) - _POP_LOG_MIN) / (_POP_LOG_MAX - _POP_LOG_MIN));
}

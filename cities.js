// Plaatsdata voor de Topo Quiz.
// Veld 'sets':    array van set-nummers waarin de plaats voorkomt.
//                 Set-nummers komen overeen met Geobas-hoofdstuknummers (54 = 5.4, enz.)
// Veld 'aliases': alternatieve spellingen die als correct antwoord worden geaccepteerd
//                 bij de tekstinvoer-modus.
// Bevolkingscijfers: CBS 2023 (afgerond op duizendtallen).
//
// De radius van elke stip wordt berekend op basis van de GLOBALE
// min/max over ALLE plaatsen, zodat groottes consistent blijven
// ongeacht welke set je speelt.

const ALL_CITIES = [
  // ── Set 56: Grote steden (landelijk) ─────────────────────────
  { name: "Amsterdam",           lat: 52.37, lon: 4.90, pop:  921000, sets: [56] },
  { name: "Haarlem",             lat: 52.38, lon: 4.63, pop:  163000, sets: [56] },
  { name: "Alkmaar",             lat: 52.63, lon: 4.75, pop:  108000, sets: [56] },
  { name: "Den Helder",          lat: 52.96, lon: 4.76, pop:   55000, sets: [56] },
  { name: "Purmerend",           lat: 52.50, lon: 4.96, pop:   81000, sets: [56] },
  { name: "Zaanstad",            lat: 52.44, lon: 4.81, pop:  156000, sets: [56] },
  { name: "Hoorn",               lat: 52.64, lon: 5.06, pop:   73000, sets: [56] },
  { name: "Den Haag",            lat: 52.08, lon: 4.30, pop:  548000, sets: [56, 66], aliases: ["'s-Gravenhage", "s-Gravenhage", "Den haag"] },
  { name: "Rotterdam",           lat: 51.93, lon: 4.48, pop:  651000, sets: [56, 66] },
  { name: "Leiden",              lat: 52.16, lon: 4.50, pop:  123000, sets: [56, 66] },
  { name: "Delft",               lat: 52.01, lon: 4.36, pop:  103000, sets: [56, 66] },
  { name: "Gouda",               lat: 52.01, lon: 4.70, pop:   73000, sets: [56, 66] },
  { name: "Dordrecht",           lat: 51.82, lon: 4.69, pop:  119000, sets: [56, 66] },
  { name: "Spijkenisse",         lat: 51.85, lon: 4.33, pop:   73000, sets: [56, 66] },
  { name: "Zoetermeer",          lat: 52.06, lon: 4.49, pop:  124000, sets: [56, 66] },
  { name: "Alphen aan den Rijn", lat: 52.13, lon: 4.66, pop:  110000, sets: [56, 66], aliases: ["Alphen"] },
  { name: "Utrecht",             lat: 52.09, lon: 5.12, pop:  361000, sets: [56] },
  { name: "Amersfoort",          lat: 52.16, lon: 5.39, pop:  158000, sets: [56] },
  { name: "Zeist",               lat: 52.09, lon: 5.23, pop:   65000, sets: [56] },
  { name: "Hilversum",           lat: 52.22, lon: 5.18, pop:   91000, sets: [56] },
  { name: "Groningen",           lat: 53.22, lon: 6.57, pop:  234000, sets: [56] },
  { name: "Leeuwarden",          lat: 53.20, lon: 5.80, pop:  123000, sets: [56] },
  { name: "Assen",               lat: 52.99, lon: 6.55, pop:   68000, sets: [56] },
  { name: "Emmen",               lat: 52.78, lon: 6.90, pop:  107000, sets: [56] },
  { name: "Zwolle",              lat: 52.51, lon: 6.09, pop:  130000, sets: [56] },
  { name: "Almelo",              lat: 52.35, lon: 6.66, pop:   72000, sets: [56] },
  { name: "Hengelo",             lat: 52.27, lon: 6.79, pop:   81000, sets: [56] },
  { name: "Enschede",            lat: 52.22, lon: 6.89, pop:  158000, sets: [56] },
  { name: "Deventer",            lat: 52.25, lon: 6.16, pop:  100000, sets: [56] },
  { name: "Lelystad",            lat: 52.50, lon: 5.47, pop:   77000, sets: [56] },
  { name: "Almere",              lat: 52.37, lon: 5.21, pop:  215000, sets: [56] },
  { name: "Apeldoorn",           lat: 52.21, lon: 5.97, pop:  164000, sets: [56] },
  { name: "Arnhem",              lat: 51.98, lon: 5.91, pop:  163000, sets: [56] },
  { name: "Nijmegen",            lat: 51.84, lon: 5.85, pop:  176000, sets: [56] },
  { name: "Ede",                 lat: 52.04, lon: 5.66, pop:  116000, sets: [56] },
  { name: "Middelburg",          lat: 51.50, lon: 3.61, pop:   48000, sets: [56] },
  { name: "Roosendaal",          lat: 51.53, lon: 4.46, pop:   77000, sets: [56] },
  { name: "Breda",               lat: 51.59, lon: 4.78, pop:  184000, sets: [56] },
  { name: "Tilburg",             lat: 51.56, lon: 5.09, pop:  222000, sets: [56] },
  { name: "'s-Hertogenbosch",    lat: 51.69, lon: 5.31, pop:  154000, sets: [56], aliases: ["Den Bosch", "s-Hertogenbosch", "s Hertogenbosch", "Hertogenbosch"] },
  { name: "Oss",                 lat: 51.76, lon: 5.52, pop:   92000, sets: [56] },
  { name: "Helmond",             lat: 51.48, lon: 5.66, pop:   92000, sets: [56] },
  { name: "Eindhoven",           lat: 51.44, lon: 5.48, pop:  234000, sets: [56] },
  { name: "Sittard",             lat: 50.99, lon: 5.87, pop:   93000, sets: [56] },
  { name: "Heerlen",             lat: 50.88, lon: 5.98, pop:   86000, sets: [56] },
  { name: "Kerkrade",            lat: 50.87, lon: 6.07, pop:   45000, sets: [56] },
  { name: "Maastricht",          lat: 50.85, lon: 5.69, pop:  122000, sets: [56] },

  // ── Set 66: Zuid-Holland (extra plaatsen) ─────────────────────
  { name: "Noordwijk",           lat: 52.24, lon: 4.45, pop:   44000, sets: [66] },
  { name: "Wassenaar",           lat: 52.14, lon: 4.40, pop:   26000, sets: [66] },
  { name: "Scheveningen",        lat: 52.11, lon: 4.27, pop:   38000, sets: [66] },
  { name: "Hoek van Holland",    lat: 51.98, lon: 4.13, pop:   10000, sets: [66] },
  { name: "Vlaardingen",         lat: 51.91, lon: 4.34, pop:   71000, sets: [66] },
  { name: "Schiedam",            lat: 51.92, lon: 4.40, pop:   84000, sets: [66] },
  { name: "Gorinchem",           lat: 51.84, lon: 4.97, pop:   36000, sets: [66] },
];

// De 12 provincies van Nederland, met centroïden voor pan-to en aliassen voor tekstinvoer.
// Namen komen exact overeen met de 'statnaam'-eigenschap in provincie_2023.geojson.
const ALL_PROVINCES = [
  { name: 'Groningen',     lat: 53.22, lon: 6.57, aliases: [] },
  { name: 'Fryslân',       lat: 53.08, lon: 5.84, aliases: ['Friesland', 'Fryslan', 'Fryslân'] },
  { name: 'Drenthe',       lat: 52.87, lon: 6.47, aliases: [] },
  { name: 'Overijssel',    lat: 52.44, lon: 6.52, aliases: [] },
  { name: 'Flevoland',     lat: 52.53, lon: 5.40, aliases: [] },
  { name: 'Gelderland',    lat: 52.05, lon: 5.91, aliases: [] },
  { name: 'Utrecht',       lat: 52.09, lon: 5.17, aliases: [] },
  { name: 'Noord-Holland', lat: 52.60, lon: 4.83, aliases: ['Noord Holland'] },
  { name: 'Zuid-Holland',  lat: 52.02, lon: 4.49, aliases: ['Zuid Holland'] },
  { name: 'Zeeland',       lat: 51.50, lon: 3.83, aliases: [] },
  { name: 'Noord-Brabant', lat: 51.50, lon: 5.10, aliases: ['Brabant', 'Noord Brabant'] },
  { name: 'Limburg',       lat: 51.21, lon: 5.87, aliases: [] },
];

// Set-definities. Nummers = Geobas-hoofdstuknummer (54 = hoofdstuk 5.4, enz.).
// quizType: 'place'    → kaart met stippen, plaatsnamen raden
//           'province' → provincies inkleuren, provincienamen raden
// fitOnStart: true  → zoom in op de plaatsen/provincies van dit level bij de start
//             false → toon heel Nederland
const SETS = {
   54: { name: '5.4 – Provincies',   quizType: 'province', fitOnStart: false },
   56: { name: '5.6 – Grote steden', quizType: 'place',    fitOnStart: false },
   66: { name: '6.6 – Zuid-Holland', quizType: 'place',    fitOnStart: true  },
};

// Radius op logaritmische schaal (4–12px), gebaseerd op globale min/max.
// Altijd berekend over ALL_CITIES zodat groottes consistent zijn over sets.
const _POP_LOG_MIN = Math.log(Math.min(...ALL_CITIES.map(c => c.pop)));
const _POP_LOG_MAX = Math.log(Math.max(...ALL_CITIES.map(c => c.pop)));

function cityRadius(city) {
  return Math.round(4 + 8 * (Math.log(city.pop) - _POP_LOG_MIN) / (_POP_LOG_MAX - _POP_LOG_MIN));
}

// Plaatsdata voor de Topo Quiz.
// Veld 'sets':    array van set-nummers waarin de plaats voorkomt.
//                 Set-nummers komen overeen met Geobas-hoofdstuknummers (54 = 5.4, enz.)
// Veld 'capital': true voor provinciehoofdsteden (vierkante marker).
// Veld 'aliases': alternatieve spellingen die als correct antwoord worden geaccepteerd
//                 bij de tekstinvoer-modus.
// Bevolkingscijfers: CBS 2023 (afgerond op duizendtallen).
//
// De radius van elke stip wordt berekend op basis van de GLOBALE
// min/max over ALLE plaatsen, zodat groottes consistent blijven
// ongeacht welke set je speelt.

const ALL_CITIES = [
  // ── Sets 55 + 56: Grote steden / Provinciehoofdsteden (landelijk) ────────────
  { name: "Amsterdam",           lat: 52.37, lon: 4.90, pop:  921000, sets: [56, 67, 71], capital: true },
  { name: "Haarlem",             lat: 52.38, lon: 4.63, pop:  163000, sets: [55, 56, 67], capital: true },
  { name: "Alkmaar",             lat: 52.63, lon: 4.75, pop:  108000, sets: [56, 67] },
  { name: "Den Helder",          lat: 52.96, lon: 4.76, pop:   55000, sets: [56, 67] },
  { name: "Purmerend",           lat: 52.50, lon: 4.96, pop:   81000, sets: [56, 67] },
  { name: "Zaanstad",            lat: 52.44, lon: 4.81, pop:  156000, sets: [56, 67], aliases: ["Zaandam"] },
  { name: "Hoorn",               lat: 52.64, lon: 5.06, pop:   73000, sets: [56, 67] },
  { name: "Den Haag",            lat: 52.08, lon: 4.30, pop:  548000, sets: [55, 56, 66], capital: true, aliases: ["'s-Gravenhage", "s-Gravenhage", "Den haag"] },
  { name: "Rotterdam",           lat: 51.93, lon: 4.48, pop:  651000, sets: [56, 66] },
  { name: "Leiden",              lat: 52.16, lon: 4.50, pop:  123000, sets: [56, 66] },
  { name: "Delft",               lat: 52.01, lon: 4.36, pop:  103000, sets: [56, 66] },
  { name: "Gouda",               lat: 52.01, lon: 4.70, pop:   73000, sets: [56, 66] },
  { name: "Dordrecht",           lat: 51.82, lon: 4.69, pop:  119000, sets: [56, 66] },
  { name: "Spijkenisse",         lat: 51.85, lon: 4.33, pop:   73000, sets: [56, 66] },
  { name: "Zoetermeer",          lat: 52.06, lon: 4.49, pop:  124000, sets: [56, 66] },
  { name: "Alphen aan den Rijn", lat: 52.13, lon: 4.66, pop:  110000, sets: [56, 66], aliases: ["Alphen"] },
  { name: "Utrecht",             lat: 52.09, lon: 5.12, pop:  361000, sets: [55, 56, 64], capital: true },
  { name: "Amersfoort",          lat: 52.16, lon: 5.39, pop:  158000, sets: [56, 64] },
  { name: "Zeist",               lat: 52.09, lon: 5.23, pop:   65000, sets: [56, 64] },
  { name: "Hilversum",           lat: 52.22, lon: 5.18, pop:   91000, sets: [56, 67] },
  { name: "Groningen",           lat: 53.22, lon: 6.57, pop:  234000, sets: [55, 56, 63], capital: true },
  { name: "Leeuwarden",          lat: 53.20, lon: 5.80, pop:  123000, sets: [55, 56], capital: true },
  { name: "Assen",               lat: 52.99, lon: 6.55, pop:   68000, sets: [55, 56, 63], capital: true },
  { name: "Emmen",               lat: 52.78, lon: 6.90, pop:  107000, sets: [56, 63] },
  { name: "Zwolle",              lat: 52.51, lon: 6.09, pop:  130000, sets: [55, 56, 61], capital: true },
  { name: "Almelo",              lat: 52.35, lon: 6.66, pop:   72000, sets: [56, 61] },
  { name: "Hengelo",             lat: 52.27, lon: 6.79, pop:   81000, sets: [56, 61] },
  { name: "Enschede",            lat: 52.22, lon: 6.89, pop:  158000, sets: [56, 61] },
  { name: "Deventer",            lat: 52.25, lon: 6.16, pop:  100000, sets: [56, 61] },
  { name: "Lelystad",            lat: 52.50, lon: 5.47, pop:   77000, sets: [55, 56, 64], capital: true },
  { name: "Almere",              lat: 52.37, lon: 5.21, pop:  215000, sets: [56, 64] },
  { name: "Apeldoorn",           lat: 52.21, lon: 5.97, pop:  164000, sets: [56] },
  { name: "Arnhem",              lat: 51.98, lon: 5.91, pop:  163000, sets: [55, 56], capital: true },
  { name: "Nijmegen",            lat: 51.84, lon: 5.85, pop:  176000, sets: [56] },
  { name: "Ede",                 lat: 52.04, lon: 5.66, pop:  116000, sets: [56] },
  { name: "Middelburg",          lat: 51.50, lon: 3.61, pop:   48000, sets: [55, 56, 62], capital: true },
  { name: "Roosendaal",          lat: 51.53, lon: 4.46, pop:   77000, sets: [56, 65] },
  { name: "Breda",               lat: 51.59, lon: 4.78, pop:  184000, sets: [56, 65] },
  { name: "Tilburg",             lat: 51.56, lon: 5.09, pop:  222000, sets: [56, 65] },
  { name: "'s-Hertogenbosch",    lat: 51.69, lon: 5.31, pop:  154000, sets: [55, 56, 65], capital: true, aliases: ["Den Bosch", "s-Hertogenbosch", "s Hertogenbosch", "Hertogenbosch"] },
  { name: "Oss",                 lat: 51.76, lon: 5.52, pop:   92000, sets: [56, 65] },
  { name: "Helmond",             lat: 51.48, lon: 5.66, pop:   92000, sets: [56, 65] },
  { name: "Eindhoven",           lat: 51.44, lon: 5.48, pop:  234000, sets: [56, 65] },
  { name: "Sittard",             lat: 50.99, lon: 5.87, pop:   93000, sets: [56, 65] },
  { name: "Heerlen",             lat: 50.88, lon: 5.98, pop:   86000, sets: [56, 65] },
  { name: "Kerkrade",            lat: 50.87, lon: 6.07, pop:   45000, sets: [56, 65] },
  { name: "Maastricht",          lat: 50.85, lon: 5.69, pop:  122000, sets: [55, 56, 65], capital: true },

  // ── Set 61: Overijssel ───────────────────────────────────────
  { name: "Steenwijk",           lat: 52.79, lon: 6.12, pop:   23000, sets: [61] },
  { name: "Giethoorn",           lat: 52.74, lon: 6.09, pop:    3000, sets: [61] },
  { name: "Kampen",              lat: 52.55, lon: 5.91, pop:   54000, sets: [61] },
  { name: "Hardenberg",          lat: 52.57, lon: 6.62, pop:   20000, sets: [61] },
  { name: "Ommen",               lat: 52.52, lon: 6.42, pop:   17000, sets: [61] },
  { name: "Nijverdal",           lat: 52.36, lon: 6.47, pop:   23000, sets: [61] },
  { name: "Rijssen",             lat: 52.31, lon: 6.52, pop:   29000, sets: [61] },
  { name: "Oldenzaal",           lat: 52.31, lon: 6.93, pop:   33000, sets: [61] },
  { name: "Haaksbergen",         lat: 52.16, lon: 6.74, pop:   25000, sets: [61] },

  // ── Set 62: Zeeland ──────────────────────────────────────────
  { name: "Zierikzee",           lat: 51.65, lon: 3.92, pop:   11000, sets: [62] },
  { name: "Domburg",             lat: 51.56, lon: 3.50, pop:    2000, sets: [62] },
  { name: "Veere",               lat: 51.54, lon: 3.68, pop:   22000, sets: [62] },
  { name: "Vlissingen",          lat: 51.44, lon: 3.57, pop:   44000, sets: [62] },
  { name: "Goes",                lat: 51.50, lon: 3.90, pop:   38000, sets: [62] },
  { name: "Yerseke",             lat: 51.49, lon: 4.05, pop:    7000, sets: [62] },
  { name: "Breskens",            lat: 51.40, lon: 3.56, pop:    5000, sets: [62] },
  { name: "Terneuzen",           lat: 51.34, lon: 3.83, pop:   55000, sets: [62] },
  { name: "Hulst",               lat: 51.28, lon: 4.05, pop:   27000, sets: [62] },

  // ── Set 63: Groningen en Drenthe ─────────────────────────────
  { name: "Roodeschool",         lat: 53.33, lon: 6.85, pop:    2000, sets: [63] },
  { name: "Appingedam",          lat: 53.32, lon: 6.86, pop:   12000, sets: [63] },
  { name: "Delfzijl",            lat: 53.33, lon: 6.92, pop:   25000, sets: [63] },
  { name: "Haren",               lat: 53.17, lon: 6.61, pop:   19000, sets: [63] },
  { name: "Hoogezand-Sappemeer", lat: 53.16, lon: 6.76, pop:   40000, sets: [63] },
  { name: "Winschoten",          lat: 53.14, lon: 7.04, pop:   18000, sets: [63] },
  { name: "Roden",               lat: 53.14, lon: 6.43, pop:   18000, sets: [63] },
  { name: "Veendam",             lat: 53.11, lon: 6.88, pop:   28000, sets: [63] },
  { name: "Zuidlaren",           lat: 53.09, lon: 6.68, pop:    7000, sets: [63] },
  { name: "Stadskanaal",         lat: 52.99, lon: 6.95, pop:   32000, sets: [63] },
  { name: "Borger",              lat: 52.92, lon: 6.79, pop:    5000, sets: [63] },
  { name: "Ter Apel",            lat: 52.88, lon: 7.06, pop:    9000, sets: [63] },
  { name: "Beilen",              lat: 52.86, lon: 6.51, pop:   10000, sets: [63] },
  { name: "Westerbork",          lat: 52.85, lon: 6.61, pop:    8000, sets: [63] },
  { name: "Klazienaveen",        lat: 52.73, lon: 7.01, pop:   11000, sets: [63] },
  { name: "Hoogeveen",           lat: 52.73, lon: 6.48, pop:   55000, sets: [63] },
  { name: "Coevorden",           lat: 52.66, lon: 6.74, pop:   14000, sets: [63] },
  { name: "Schoonebeek",         lat: 52.65, lon: 6.90, pop:    8000, sets: [63] },
  { name: "Meppel",              lat: 52.70, lon: 6.19, pop:   33000, sets: [63] },

  // ── Set 64: Flevoland en Utrecht ─────────────────────────────
  { name: "Emmeloord",           lat: 52.71, lon: 5.75, pop:   27000, sets: [64] },
  { name: "Urk",                 lat: 52.66, lon: 5.60, pop:   21000, sets: [64] },
  { name: "Dronten",             lat: 52.52, lon: 5.72, pop:   28000, sets: [64] },
  { name: "Zeewolde",            lat: 52.33, lon: 5.54, pop:   22000, sets: [64] },
  { name: "De Bilt",             lat: 52.11, lon: 5.18, pop:   43000, sets: [64] },
  { name: "Soest",               lat: 52.18, lon: 5.29, pop:   46000, sets: [64] },
  { name: "Woerden",             lat: 52.09, lon: 4.89, pop:   51000, sets: [64] },
  { name: "Nieuwegein",          lat: 52.03, lon: 5.08, pop:   64000, sets: [64] },
  { name: "Veenendaal",          lat: 52.03, lon: 5.56, pop:   67000, sets: [64] },

  // ── Set 65: Noord-Brabant en Limburg ─────────────────────────
  { name: "Bergen op Zoom",      lat: 51.50, lon: 4.29, pop:   67000, sets: [65] },
  { name: "Waalwijk",            lat: 51.68, lon: 5.07, pop:   50000, sets: [65] },
  { name: "Uden",                lat: 51.66, lon: 5.62, pop:   42000, sets: [65] },
  { name: "Boxmeer",             lat: 51.64, lon: 5.95, pop:   12000, sets: [65] },
  { name: "Oosterhout",          lat: 51.64, lon: 4.86, pop:   55000, sets: [65] },
  { name: "Kaatsheuvel",         lat: 51.66, lon: 5.05, pop:   23000, sets: [65] },
  { name: "Boxtel",              lat: 51.59, lon: 5.33, pop:   31000, sets: [65] },
  { name: "Venray",              lat: 51.52, lon: 5.97, pop:   44000, sets: [65] },
  { name: "Venlo",               lat: 51.37, lon: 6.17, pop:  101000, sets: [65] },
  { name: "Weert",               lat: 51.25, lon: 5.70, pop:   50000, sets: [65] },
  { name: "Roermond",            lat: 51.19, lon: 5.99, pop:   57000, sets: [65] },
  { name: "Geleen",              lat: 50.97, lon: 5.83, pop:   32000, sets: [65] },
  { name: "Hoensbroek",          lat: 50.93, lon: 5.93, pop:   19000, sets: [65] },
  { name: "Valkenburg",          lat: 50.87, lon: 5.83, pop:   17000, sets: [65] },
  { name: "Vaals",               lat: 50.77, lon: 6.02, pop:   10000, sets: [65] },

  // ── Set 67: Noord-Holland (extra plaatsen) ────────────────────
  { name: "Enkhuizen",           lat: 52.71, lon: 5.29, pop:   18000, sets: [67] },
  { name: "Volendam",            lat: 52.50, lon: 5.07, pop:   22000, sets: [67] },
  { name: "IJmuiden",            lat: 52.46, lon: 4.62, pop:   35000, sets: [67] },
  { name: "Zandvoort",           lat: 52.37, lon: 4.53, pop:   17000, sets: [67] },
  { name: "Amstelveen",          lat: 52.30, lon: 4.86, pop:   93000, sets: [67] },
  { name: "Aalsmeer",            lat: 52.26, lon: 4.76, pop:   32000, sets: [67] },
  { name: "Bussum",              lat: 52.28, lon: 5.17, pop:   33000, sets: [67] },

  // ── Set 66: Zuid-Holland (extra plaatsen) ─────────────────────
  { name: "Noordwijk",           lat: 52.24, lon: 4.45, pop:   44000, sets: [66] },
  { name: "Wassenaar",           lat: 52.14, lon: 4.40, pop:   26000, sets: [66] },
  { name: "Scheveningen",        lat: 52.11, lon: 4.27, pop:   38000, sets: [66] },
  { name: "Hoek van Holland",    lat: 51.98, lon: 4.13, pop:   10000, sets: [66] },
  { name: "Vlaardingen",         lat: 51.91, lon: 4.34, pop:   71000, sets: [66] },
  { name: "Schiedam",            lat: 51.92, lon: 4.40, pop:   84000, sets: [66] },
  { name: "Gorinchem",           lat: 51.84, lon: 4.97, pop:   36000, sets: [66] },
  // ── Set 71: Europese hoofdsteden (7.1 Landen van Europa) ─────────────────────
  { name: "Helsinki", lat: 60.17, lon: 24.94, pop:  655000, sets: [71], capital: true },
  { name: "Lissabon",   lat: 38.72, lon: -9.14,  pop: 2956000, sets: [71, 73], capital: true },
  { name: "Madrid",     lat: 40.42, lon: -3.70,  pop: 3348000, sets: [71, 73], capital: true },
  { name: "Parijs",     lat: 48.86, lon: 2.35,   pop: 2161000, sets: [58, 71, 73], capital: true },
  { name: "Brussel",    lat: 50.85, lon: 4.35,   pop:  185000, sets: [58, 71, 72], capital: true },
  { name: "Luxemburg",  lat: 49.61, lon: 6.13,   pop:  125000, sets: [71, 72], capital: true },
  { name: "Londen",     lat: 51.51, lon: -0.13,  pop: 9541000, sets: [58, 71, 75], capital: true, aliases: ['London'] },
  { name: "Dublin",     lat: 53.33, lon: -6.25,  pop:  592000, sets: [71, 75], capital: true },
  { name: "Reykjavík",  lat: 64.13, lon: -21.82, pop:  136000, sets: [71], capital: true },
  { name: "Berlijn",    lat: 52.52, lon: 13.40,  pop: 3677000, sets: [58, 71, 74], capital: true },
  { name: "Kopenhagen", lat: 55.68, lon: 12.57,  pop:  764000, sets: [58, 71], capital: true },
  { name: "Oslo",       lat: 59.91, lon: 10.75,  pop:  693000, sets: [71], capital: true },
  { name: "Stockholm",  lat: 59.33, lon: 18.07,  pop:  975000, sets: [71], capital: true },
  { name: "Wenen",      lat: 48.21, lon: 16.37,  pop: 1931000, sets: [71, 76], capital: true },
  { name: "Bern",       lat: 46.95, lon: 7.44,   pop:  134000, sets: [71, 76], capital: true },
  { name: "Rome",       lat: 41.90, lon: 12.50,  pop: 2873000, sets: [71, 76], capital: true },
  { name: "Warschau",   lat: 52.23, lon: 21.01,  pop: 1794000, sets: [71], capital: true },
  { name: "Praag",      lat: 50.08, lon: 14.44,  pop: 1357000, sets: [71, 76], capital: true },
  { name: "Boedapest",  lat: 47.50, lon: 19.05,  pop: 1752000, sets: [71, 76], capital: true },
  // ── Set 72: Belgische steden (7.2 België en Luxemburg) ───────────────────────
  { name: "Antwerpen", lat: 51.22, lon: 4.40,   pop:  530000, sets: [72] },
  { name: "Gent",      lat: 51.05, lon: 3.72,   pop:  263000, sets: [72] },
  { name: "Brugge",    lat: 51.21, lon: 3.22,   pop:  119000, sets: [72] },
  { name: "Luik",      lat: 50.63, lon: 5.57,   pop:  197000, sets: [72] },
  { name: "Namen",     lat: 50.47, lon: 4.87,   pop:  110000, sets: [72] },
  { name: "Charleroi", lat: 50.41, lon: 4.44,   pop:  202000, sets: [72] },
  { name: "Bergen",    lat: 50.45, lon: 3.96,   pop:   96000, sets: [72] },
  { name: "Mechelen",  lat: 51.03, lon: 4.48,   pop:   86000, sets: [72] },
  { name: "Leuven",    lat: 50.88, lon: 4.70,   pop:   99000, sets: [72] },
  { name: "Hasselt",   lat: 50.93, lon: 5.33,   pop:   77000, sets: [72] },
  { name: "Bastogne",  lat: 50.00, lon: 5.72,   pop:   16000, sets: [72] },
  { name: "Oostende",  lat: 51.23, lon: 2.92,   pop:   71000, sets: [72] },
  // ── Set 73: Steden van Frankrijk, Spanje en Portugal (7.3) ──────────────────
  // (Parijs, Madrid, Lissabon staan al in set 71 hierboven, sets uitgebreid met 73)
  { name: "Lyon",         lat: 45.75, lon:  4.84,  pop: 1702000, sets: [73] },
  { name: "Marseille",    lat: 43.30, lon:  5.37,  pop: 1575000, sets: [73] },
  { name: "Toulouse",     lat: 43.60, lon:  1.44,  pop:  937000, sets: [73] },
  { name: "Bordeaux",     lat: 44.84, lon: -0.58,  pop:  794000, sets: [73] },
  { name: "Straatsburg",  lat: 48.57, lon:  7.75,  pop:  486000, sets: [73] },
  { name: "Lille",        lat: 50.63, lon:  3.07,  pop:  228000, sets: [73] },
  { name: "Reims",        lat: 49.25, lon:  4.03,  pop:  182000, sets: [73] },
  { name: "Dijon",        lat: 47.32, lon:  5.04,  pop:  157000, sets: [73] },
  { name: "Nice",         lat: 43.70, lon:  7.27,  pop:  348000, sets: [73] },
  { name: "Le Havre",     lat: 49.49, lon:  0.11,  pop:  173000, sets: [73] },
  { name: "Barcelona",    lat: 41.39, lon:  2.15,  pop: 5586000, sets: [73] },
  { name: "Sevilla",      lat: 37.39, lon: -5.99,  pop: 1302000, sets: [73] },
  { name: "Valencia",     lat: 39.47, lon: -0.38,  pop:  814000, sets: [73] },
  { name: "Bilbao",       lat: 43.26, lon: -2.93,  pop:  352000, sets: [73] },
  { name: "Porto",        lat: 41.16, lon: -8.63,  pop:  300000, sets: [73] },
  { name: "Gibraltar",    lat: 36.14, lon: -5.35,  pop:   33000, sets: [73] },
  { name: "Málaga",       lat: 36.72, lon: -4.42,  pop:  579000, sets: [73], aliases: ['Malaga'] },
  { name: "Monaco",       lat: 43.73, lon:  7.42,  pop:   39000, sets: [73] },
  // ── Set 74: Duitsland (7.4) — Berlijn staat hierboven in set 71, aangevuld met [74] ─
  { name: "Hamburg",     lat: 53.55, lon:  9.99,  pop: 1906000, sets: [74] },
  { name: "Bremen",      lat: 53.08, lon:  8.80,  pop:  567000, sets: [74] },
  { name: "Hannover",    lat: 52.37, lon:  9.73,  pop:  536000, sets: [74] },
  { name: "Magdeburg",   lat: 52.12, lon: 11.63,  pop:  237000, sets: [74] },
  { name: "Dortmund",    lat: 51.51, lon:  7.47,  pop:  587000, sets: [74] },
  { name: "Essen",       lat: 51.46, lon:  7.01,  pop:  582000, sets: [74] },
  { name: "Düsseldorf",  lat: 51.23, lon:  6.78,  pop:  619000, sets: [74], aliases: ['Dusseldorf', 'Duesseldorf'] },
  { name: "Keulen",      lat: 50.94, lon:  6.96,  pop: 1085000, sets: [74], aliases: ['Köln', 'Koeln', 'Koln', 'Cologne'] },
  { name: "Bonn",        lat: 50.74, lon:  7.10,  pop:  331000, sets: [74] },
  { name: "Aken",        lat: 50.78, lon:  6.08,  pop:  249000, sets: [74], aliases: ['Aachen'] },
  { name: "Duisburg",    lat: 51.43, lon:  6.76,  pop:  498000, sets: [74] },
  { name: "Frankfurt",   lat: 50.11, lon:  8.68,  pop:  759000, sets: [74], aliases: ['Frankfurt am Main'] },
  { name: "Stuttgart",   lat: 48.78, lon:  9.18,  pop:  626000, sets: [74] },
  { name: "München",     lat: 48.14, lon: 11.58,  pop: 1488000, sets: [74], aliases: ['Munchen', 'Muenchen', 'Munich'] },
  { name: "Neurenberg",  lat: 49.45, lon: 11.08,  pop:  515000, sets: [74], aliases: ['Nürnberg', 'Nurnberg', 'Nuernberg', 'Nuremberg'] },
  { name: "Leipzig",     lat: 51.34, lon: 12.37,  pop:  605000, sets: [74] },
  { name: "Dresden",     lat: 51.05, lon: 13.74,  pop:  556000, sets: [74] },
  // ── Set 75: VK en Ierland (7.5) — Londen + Dublin staan hierboven in set 71 ─
  { name: "Birmingham",  lat: 52.48, lon: -1.90,  pop: 1149000, sets: [75] },
  { name: "Manchester",  lat: 53.48, lon: -2.24,  pop:  553000, sets: [75] },
  { name: "Liverpool",   lat: 53.41, lon: -2.99,  pop:  496000, sets: [75] },
  { name: "Leeds",       lat: 53.80, lon: -1.55,  pop:  793000, sets: [75] },
  { name: "Sheffield",   lat: 53.38, lon: -1.47,  pop:  557000, sets: [75] },
  { name: "Newcastle",   lat: 54.98, lon: -1.61,  pop:  300000, sets: [75], aliases: ['Newcastle upon Tyne'] },
  { name: "Cardiff",     lat: 51.48, lon: -3.18,  pop:  372000, sets: [75] },
  { name: "Edinburgh",   lat: 55.95, lon: -3.19,  pop:  526000, sets: [75], aliases: ['Edinburg'] },
  { name: "Glasgow",     lat: 55.86, lon: -4.25,  pop:  635000, sets: [75] },
  { name: "Aberdeen",    lat: 57.15, lon: -2.10,  pop:  228000, sets: [75] },
  { name: "Belfast",     lat: 54.60, lon: -5.93,  pop:  345000, sets: [75] },
  // ── Set 76: Midden-Europa en Italië (7.6) — Bern/Wenen/Rome/Praag/Boedapest staan hierboven ─
  // Zwitserland
  { name: "Zürich",      lat: 47.37, lon:  8.54,  pop:  421000, sets: [76], aliases: ['Zurich'] },
  { name: "Genève",      lat: 46.20, lon:  6.14,  pop:  203000, sets: [76], aliases: ['Geneve', 'Geneva'] },
  { name: "Basel",       lat: 47.56, lon:  7.59,  pop:  178000, sets: [76], aliases: ['Bazel'] },
  // Microstaat
  { name: "Liechtenstein", lat: 47.14, lon: 9.52, pop:   39000, sets: [76] },
  // Oostenrijk
  { name: "Salzburg",    lat: 47.80, lon: 13.04,  pop:  155000, sets: [76] },
  { name: "Innsbruck",   lat: 47.26, lon: 11.39,  pop:  132000, sets: [76] },
  { name: "Graz",        lat: 47.07, lon: 15.44,  pop:  292000, sets: [76] },
  { name: "Klagenfurt",  lat: 46.62, lon: 14.31,  pop:  101000, sets: [76] },
  // Tsjechië
  { name: "Brno",        lat: 49.19, lon: 16.61,  pop:  381000, sets: [76] },
  // Italië
  { name: "Milaan",      lat: 45.46, lon:  9.19,  pop: 1397000, sets: [76], aliases: ['Milano', 'Milan'] },
  { name: "Napels",      lat: 40.85, lon: 14.27,  pop:  955000, sets: [76], aliases: ['Napoli', 'Naples'] },
  { name: "Venetië",     lat: 45.44, lon: 12.32,  pop:  261000, sets: [76], aliases: ['Venezia', 'Venice'] },
  { name: "Genua",       lat: 44.41, lon:  8.93,  pop:  566000, sets: [76], aliases: ['Genova', 'Genoa'] },
  { name: "Turijn",      lat: 45.07, lon:  7.69,  pop:  847000, sets: [76], aliases: ['Torino', 'Turin'] },
  { name: "Florence",    lat: 43.77, lon: 11.25,  pop:  367000, sets: [76], aliases: ['Firenze'] },
  // Microstaten
  { name: "San Marino",  lat: 43.94, lon: 12.45,  pop:   34000, sets: [76] },
  { name: "Malta",       lat: 35.90, lon: 14.51,  pop:  213000, sets: [76], aliases: ['Valletta'] },
];

// Landen voor sets met quizType 'country'.
// lat/lon = centroïd (voor pan-to en als fallback klik-punt).
const ALL_COUNTRIES = [
  // ── Set 71: Landen van Europa (7.1) ───────────────────────────
  { name: 'Finland',  lat: 64.00, lon: 26.00, sets: [71] },
  { name: 'Portugal',            lat: 39.6,  lon: -8.3,  sets: [71] },
  { name: 'Spanje',              lat: 40.4,  lon: -3.7,  sets: [58, 71] },
  { name: 'Frankrijk',           lat: 46.7,  lon:  2.6,  sets: [58, 71] },
  { name: 'België',              lat: 50.8,  lon:  4.8,  sets: [58, 71] },
  { name: 'Nederland',           lat: 52.4,  lon:  5.6,  sets: [71] },
  { name: 'Luxemburg',           lat: 49.7,  lon:  6.1,  sets: [58, 71, 72] },
  { name: 'Verenigd Koninkrijk', lat: 54.4,  lon: -2.1,  sets: [58, 71] },
  { name: 'Ierland',             lat: 53.1,  lon: -7.8,  sets: [58, 71] },
  { name: 'IJsland',             lat: 64.8,  lon: -18.7, sets: [71] },
  { name: 'Duitsland',           lat: 51.0,  lon:  9.7,  sets: [58, 71] },
  { name: 'Denemarken',          lat: 56.0,  lon:  9.0,  sets: [58, 71] },
  { name: 'Noorwegen',           lat: 61.4,  lon:  9.7,  sets: [58, 71] },
  { name: 'Zweden',              lat: 65.9,  lon: 19.0,  sets: [58, 71] },
  { name: 'Oostenrijk',          lat: 47.5,  lon: 14.1,  sets: [58, 71] },
  { name: 'Zwitserland',         lat: 46.7,  lon:  7.5,  sets: [58, 71] },
  { name: 'Italië',              lat: 44.7,  lon: 11.1,  sets: [58, 71] },
  { name: 'Polen',               lat: 52.0,  lon: 19.5,  sets: [58, 71] },
  { name: 'Tsjechië',            lat: 49.9,  lon: 15.4,  sets: [58, 71] },
  { name: 'Hongarije',           lat: 47.1,  lon: 19.4,  sets: [71] },
  // ── Set 58: Onze buren — extra land (niet in set 71) ────────
  { name: 'Slovenië',            lat: 46.1,  lon: 14.8,  sets: [58] },
];

// De 16 wateren van set 5.7, met centroïden voor pan-to en aliassen voor tekstinvoer.
const ALL_WATERS = [
  { name: 'Noordzee',             lat: 52.50, lon: 3.60,  sets: [57] },
  { name: 'Waddenzee',            lat: 53.20, lon: 5.50,  sets: [57] },
  { name: 'Oosterschelde',        lat: 51.62, lon: 3.90,  sets: [57] },
  { name: 'Westerschelde',        lat: 51.40, lon: 3.80,  sets: [57] },
  { name: 'Rijn',                 lat: 51.67, lon: 6.42,  sets: [57, 74], aliases: ['Rhein'] },
  { name: 'IJssel',               lat: 52.30, lon: 6.10,  sets: [57] },
  { name: 'Neder-Rijn',           lat: 51.95, lon: 5.55,  sets: [57], aliases: ['Neder Rijn'] },
  { name: 'Lek',                  lat: 51.90, lon: 4.80,  sets: [57] },
  { name: 'Waal',                 lat: 51.85, lon: 5.20,  sets: [57] },
  { name: 'Maas',                 lat: 51.50, lon: 5.85,  sets: [57] },
  { name: 'Oude Maas',            lat: 51.85, lon: 4.55,  sets: [57], aliases: ['Oude maas'] },
  { name: 'Bergse Maas',          lat: 51.70, lon: 5.00,  sets: [57], aliases: ['Bergse maas'] },
  { name: 'Eems',                 lat: 53.35, lon: 6.90,  sets: [57] },
  { name: 'Noordzeekanaal',       lat: 52.46, lon: 4.70,  sets: [57] },
  { name: 'Amsterdam-Rijnkanaal', lat: 52.20, lon: 5.00,  sets: [57], aliases: ['Amsterdam Rijnkanaal'] },
  { name: 'Nieuwe Waterweg',      lat: 51.90, lon: 4.10,  sets: [57], aliases: ['Nieuwe waterweg'] },
  // ── Set 72: Belgische rivieren (7.2 België en Luxemburg) ─────────────────────
  { name: 'Schelde', lat: 51.22, lon: 4.05, sets: [72] },
  { name: 'Maas',    lat: 50.63, lon: 5.57, sets: [72] },
  // ── Set 73: Rivieren van Frankrijk, Spanje en Portugal (7.3) ─────────────────
  { name: 'Seine',  lat: 49.0, lon:  1.5, sets: [73] },
  { name: 'Loire',  lat: 47.5, lon:  1.0, sets: [73] },
  { name: 'Rhône',  lat: 44.5, lon:  4.8, sets: [73] },
  { name: 'Taag',   lat: 39.5, lon: -7.5, sets: [73], aliases: ['Tajo', 'Tejo'] },
  { name: 'Het Kanaal',       lat: 50.3, lon: -1.5, sets: [73, 75], aliases: ['Kanaal', 'Engels Kanaal'] },
  { name: 'Middellandse Zee', lat: 40.0, lon:  5.0, sets: [73] },
  // ── Set 74: Duitse rivieren (7.4) — Rijn staat hierboven in set 57, nu ook [74] ─
  { name: 'Elbe',   lat: 52.5, lon: 11.5, sets: [74] },
  { name: 'Moezel', lat: 49.7, lon:  7.0, sets: [74], aliases: ['Mosel', 'Moselle'] },
  // ── Set 75: VK en Ierland (7.5) ─────────────────────────────────────────────
  { name: 'Theems',    lat: 51.50, lon: -0.50, sets: [75], aliases: ['Thames'] },
  { name: 'Ierse Zee', lat: 53.70, lon: -5.00, sets: [75], aliases: ['Irish Sea'] },
  // ── Set 76: Wateren van Midden-Europa en Italië (7.6) ──────────────────────
  { name: 'Donau',            lat: 47.50, lon: 16.50, sets: [76], aliases: ['Donau', 'Danube', 'Dunaj'] },
  { name: 'Po',               lat: 45.00, lon: 10.50, sets: [76] },
  { name: 'Meer van Genève',  lat: 46.45, lon:  6.50, sets: [76], aliases: ['Lac Léman', 'Genfersee', 'Lac de Genève'] },
  { name: 'Balaton',          lat: 46.85, lon: 17.75, sets: [76], aliases: ['Balatonmeer'] },
  { name: 'Adriatische Zee',  lat: 42.50, lon: 15.00, sets: [76], aliases: ['Adriatic Sea', 'Mare Adriatico'] },
];

// De 12 provincies van Nederland, met centroïden voor pan-to en aliassen voor tekstinvoer.
// Namen komen exact overeen met de 'statnaam'-eigenschap in provincie_2023.geojson.
const ALL_PROVINCES = [
  // ── Set 72: Belgische gewesten + Luxemburg (7.2 België en Luxemburg) ───────
  // Namen moeten overeenkomen met de 'statnaam'-property in gewesten.geojson
  { name: 'Vlaanderen',                     lat: 51.05, lon: 3.87, kind: 'gewest', sets: [72] },
  { name: 'Wallonië',                       lat: 50.18, lon: 5.10, kind: 'gewest', sets: [72] },
  { name: 'Brussels Hoofdstedelijk Gewest', lat: 50.85, lon: 4.35, kind: 'gewest', sets: [72] },
  { name: 'Luxemburg',                      lat: 49.70, lon: 6.10, kind: 'gewest', sets: [72] },
  // ── Set 73: Gebieden van Frankrijk, Spanje en Portugal (7.3) ────────────────
  // Namen moeten overeenkomen met de 'name'-property in gewesten.geojson
  // shape: 'fuzzy' + rx/ry (in graden) → gerenderd als stippel-ellips, niet als hardbegrensd polygoon.
  // Bedoeld voor gebergtes, kuststroken en historische gebieden zonder scherpe bestuurlijke grens.
  { name: 'Bretagne',         lat: 48.20, lon: -2.93, kind: 'gewest', sets: [73] },
  { name: 'Normandië',        lat: 49.00, lon:  0.40, kind: 'gewest', sets: [73] },
  { name: 'Corsica',          lat: 42.15, lon:  9.10, kind: 'gewest', sets: [73] },
  { name: 'Mallorca',         lat: 39.70, lon:  3.00, kind: 'gewest', sets: [73] },
  { name: 'Andorra',          lat: 42.55, lon:  1.60, kind: 'gewest', sets: [73] },
  { name: 'Elzas',            lat: 48.30, lon:  7.45, kind: 'gewest', shape: 'fuzzy', rx: 0.55, ry: 0.85, sets: [73] },
  { name: 'Centraal Massief', lat: 45.20, lon:  3.45, kind: 'gewest', shape: 'fuzzy', rx: 1.50, ry: 1.25, sets: [73] },
  { name: 'Pyreneeën',        lat: 42.80, lon:  0.50, kind: 'gewest', shape: 'fuzzy', rx: 2.60, ry: 0.55, sets: [73] },
  { name: 'Costa Blanca',     lat: 38.40, lon: -0.40, kind: 'gewest', shape: 'fuzzy', rx: 0.55, ry: 0.55, sets: [73] },
  { name: 'Alpen',            lat: 45.00, lon:  6.90, kind: 'gewest', shape: 'fuzzy', rx: 0.90, ry: 1.40, sets: [73] },
  // ── Set 74: Duitsland (7.4) ───────────────────────────────────────────────
  // Alle Duitse regio's zijn fuzzy ellipsen — kinderen leren ze als globale streken,
  // niet als bestuurlijke grenzen. Beieren is bewust fuzzy; zie backlog-issue #81.
  { name: 'Ruhrgebied',   lat: 51.47, lon:  7.30, kind: 'gewest', shape: 'fuzzy', rx: 0.55, ry: 0.22, sets: [74] },
  { name: 'Beieren',      lat: 48.90, lon: 11.50, kind: 'gewest', shape: 'fuzzy', rx: 1.95, ry: 1.45, sets: [74], aliases: ['Bavaria'] },
  { name: 'Sauerland',    lat: 51.25, lon:  8.20, kind: 'gewest', shape: 'fuzzy', rx: 0.55, ry: 0.40, sets: [74] },
  { name: 'Eifel',        lat: 50.30, lon:  6.70, kind: 'gewest', shape: 'fuzzy', rx: 0.55, ry: 0.55, sets: [74] },
  { name: 'Zwarte Woud',  lat: 48.30, lon:  8.20, kind: 'gewest', shape: 'fuzzy', rx: 0.35, ry: 0.80, sets: [74], aliases: ['Schwarzwald', 'Black Forest'] },
  { name: 'Harz',         lat: 51.80, lon: 10.60, kind: 'gewest', shape: 'fuzzy', rx: 0.45, ry: 0.22, sets: [74] },
  // ── Set 75: VK en Ierland (7.5) — harde polygonen uit OSM admin-grenzen ─────
  // Namen moeten overeenkomen met de 'name'-property in gewesten.geojson
  { name: 'Engeland',      lat: 52.50, lon: -1.50, kind: 'regio', sets: [75], aliases: ['England'] },
  { name: 'Schotland',     lat: 56.80, lon: -4.20, kind: 'regio', sets: [75], aliases: ['Scotland', 'Alba'] },
  { name: 'Wales',         lat: 52.40, lon: -3.80, kind: 'regio', sets: [75], aliases: ['Cymru'] },
  { name: 'Noord-Ierland', lat: 54.70, lon: -6.50, kind: 'regio', sets: [75], aliases: ['Northern Ireland'] },
  { name: 'Ierland',       lat: 53.30, lon: -8.00, kind: 'regio', sets: [75], aliases: ['Ireland', 'Éire'] },
  // ── Set 76: Midden-Europa en Italië (7.6) ────────────────────────────────────
  // Alpen: bredere ellips dan set 73 (daar alleen westelijke Alpen bij Frankrijk).
  // Centrum over Zwitserland/Oostenrijk, boog van Mont Blanc tot Slovenië.
  { name: 'Alpen',       lat: 47.00, lon: 11.00, kind: 'gewest', shape: 'fuzzy', rx: 5.00, ry: 1.20, sets: [76], aliases: ['Alps'] },
  { name: 'Apennijnen',  lat: 42.50, lon: 12.50, kind: 'gewest', shape: 'fuzzy', rx: 0.80, ry: 2.80, sets: [76], aliases: ['Apennines', 'Appennini'] },
  // Sicilië en Sardinië: harde polygonen uit Natural Earth (gewesten.geojson)
  { name: 'Sicilië',     lat: 37.60, lon: 14.00, kind: 'gewest', sets: [76], aliases: ['Sicilia', 'Sicily'] },
  { name: 'Sardinië',    lat: 40.00, lon:  9.10, kind: 'gewest', sets: [76], aliases: ['Sardegna', 'Sardinia'] },
  // ── NL-provincies ────────────────────────────────────────────────────────────
  { name: 'Groningen',     lat: 53.22, lon: 6.57, sets: [54], aliases: [] },
  { name: 'Fryslân',       lat: 53.08, lon: 5.84, sets: [54], aliases: ['Friesland', 'Fryslan', 'Fryslân'] },
  { name: 'Drenthe',       lat: 52.87, lon: 6.47, sets: [54], aliases: [] },
  { name: 'Overijssel',    lat: 52.44, lon: 6.52, sets: [54], aliases: [] },
  { name: 'Flevoland',     lat: 52.53, lon: 5.40, sets: [54], aliases: [] },
  { name: 'Gelderland',    lat: 52.05, lon: 5.91, sets: [54], aliases: [] },
  { name: 'Utrecht',       lat: 52.09, lon: 5.17, sets: [54], aliases: [] },
  { name: 'Noord-Holland', lat: 52.60, lon: 4.83, sets: [54], aliases: ['Noord Holland'] },
  { name: 'Zuid-Holland',  lat: 52.02, lon: 4.49, sets: [54], aliases: ['Zuid Holland'] },
  { name: 'Zeeland',       lat: 51.50, lon: 3.83, sets: [54], aliases: [] },
  { name: 'Noord-Brabant', lat: 51.50, lon: 5.10, sets: [54], aliases: ['Brabant', 'Noord Brabant'] },
  { name: 'Limburg',       lat: 51.21, lon: 5.87, sets: [54], aliases: [] },
];

// Set-definities. Nummers = Geobas-hoofdstuknummer (54 = hoofdstuk 5.4, enz.).
// Viewport-bounds per schaal
const NL_BOUNDS    = [[50.699, 3.325], [53.566, 7.261]];
const EU_BOUNDS    = [[34, -25], [72, 45]];
const WORLD_BOUNDS = [[-60, -180], [75, 180]];

// quizType: 'place'    → kaart met stippen, plaatsnamen raden
//           'province' → provincies inkleuren, provincienamen raden
//           'water'    → wateren inkleuren
// fitOnStart: true  → zoom in op de plaatsen/provincies van dit level bij de start
//             false → toon heel Nederland
// bounds: optioneel [[lat,lon],[lat,lon]] — overschrijft NL_BOUNDS bij laden en terugkeer
// clickCorrectKm / clickCloseKm: optioneel — overschrijft globale drempelwaarden
const SETS = {
   54: { name: '5.4 – Provincies',            quizType: 'province', fitOnStart: false, group: 5 },
   57: { name: '5.7 – Wateren',              quizType: 'water',    fitOnStart: false, group: 5 },
   55: { name: '5.5 – Provinciehoofdsteden',  quizType: 'place',    fitOnStart: false, group: 5 },
   56: { name: '5.6 – Grote steden',          quizType: 'place',    fitOnStart: false, group: 5 },
   // Set 5.8: Onze buren — 2 fases: landen (country) + hoofdsteden (place)
   58: { name: '5.8 – Onze buren', group: 5, mastery: 1,
         bounds: [[36, -12], [65, 20]],
         clickCorrectKm: 100, clickCloseKm: 300,
         phases: [
           { id: 'countries', label: 'Landen',      quizType: 'country' },
           { id: 'capitals',  label: 'Hoofdsteden', quizType: 'place'   },
         ] },
   61: { name: '6.1 – Overijssel',            quizType: 'place',    fitOnStart: true,  group: 6 },
   62: { name: '6.2 – Zeeland',               quizType: 'place',    fitOnStart: true,  group: 6 },
   63: { name: '6.3 – Groningen en Drenthe',  quizType: 'place',    fitOnStart: true,  group: 6 },
   64: { name: '6.4 – Flevoland en Utrecht',  quizType: 'place',    fitOnStart: true,  group: 6 },
   65: { name: '6.5 – Noord-Brabant en Limburg', quizType: 'place', fitOnStart: true,  group: 6 },
   66: { name: '6.6 – Zuid-Holland',          quizType: 'place',    fitOnStart: true,  group: 6 },
   67: { name: '6.7 – Noord-Holland',         quizType: 'place',    fitOnStart: true,  group: 6 },
   // Set 7.1: Landen van Europa — 2 fases: landen (country) + hoofdsteden (place)
   71: { name: '7.1 – Landen en hoofdsteden', group: 7, mastery: 1,
         bounds: [[ 34, -25], [72, 32]],
         clickCorrectKm: 100, clickCloseKm: 300,
         phases: [
           { id: 'countries', label: 'Landen',      quizType: 'country' },
           { id: 'capitals',  label: 'Hoofdsteden', quizType: 'place'   },
         ] },
   // Set 7.2: België en Luxemburg — 3 fases: gewesten + Luxemburg, steden, wateren
   72: { name: '7.2 – België en Luxemburg', group: 7, mastery: 1,
         bounds: [[49.4, 2.3], [51.8, 6.6]],
         clickCorrectKm: 40, clickCloseKm: 120,
         phases: [
           { id: 'regions', label: 'Gewesten', quizType: 'province' },
           { id: 'cities',  label: 'Steden',   quizType: 'place'    },
           { id: 'waters',  label: 'Wateren',  quizType: 'water'    },
         ] },
   // Set 7.3: Frankrijk, Spanje en Portugal — 3 fases: steden, gebieden, rivieren
   73: { name: '7.3 – Frankrijk, Spanje en Portugal', group: 7, mastery: 1,
         bounds: [[35, -12], [52, 10]],
         clickCorrectKm: 80, clickCloseKm: 240,
         phases: [
           { id: 'cities',   label: 'Steden',   quizType: 'place'    },
           { id: 'regions',  label: 'Gebieden', quizType: 'province' },
           { id: 'rivers',   label: 'Rivieren', quizType: 'water'    },
         ] },
   // Set 7.4: Duitsland — 3 fases: steden, regio's, rivieren
   74: { name: '7.4 – Duitsland', group: 7, mastery: 1,
         bounds: [[46.5, 5.0], [55.5, 15.5]],
         clickCorrectKm: 60, clickCloseKm: 180,
         phases: [
           { id: 'cities',  label: 'Steden',   quizType: 'place'    },
           { id: 'regions', label: "Regio's",  quizType: 'province' },
           { id: 'rivers',  label: 'Rivieren', quizType: 'water'    },
         ] },
   // Set 7.5: VK en Ierland — 3 fases: regio's, steden, wateren
   75: { name: '7.5 – Verenigd Koninkrijk en Ierland', group: 7, mastery: 1,
         bounds: [[49.5, -11.0], [61.0, 2.0]],
         clickCorrectKm: 60, clickCloseKm: 180,
         phases: [
           { id: 'regions', label: "Regio's", quizType: 'province' },
           { id: 'cities',  label: 'Steden',  quizType: 'place'    },
           { id: 'waters',  label: 'Wateren', quizType: 'water'    },
         ] },
   // Set 7.6: Midden-Europa en Italië — 3 fases: steden, gebieden, wateren
   76: { name: '7.6 – Midden-Europa en Italië', group: 7, mastery: 1,
         bounds: [[36, 5], [52, 22]],
         clickCorrectKm: 60, clickCloseKm: 180,
         phases: [
           { id: 'cities',   label: 'Steden',   quizType: 'place'    },
           { id: 'regions',  label: 'Gebieden',  quizType: 'province' },
           { id: 'waters',   label: 'Wateren',  quizType: 'water'    },
         ] },
   // Dagelijkse uitdaging: 10 datum-geseedde steden, 1× goed = gememoreerd
   98: { name: '📅 Uitdaging van vandaag', quizType: 'place', fitOnStart: false, mastery: 1, daily: true },
   // Bonus: 20 willekeurige steden uit alle sets gecombineerd, 1× goed = gememoreerd
   99: { name: 'Bonus: Alle steden door elkaar', quizType: 'place', fitOnStart: false, mastery: 1, bonus: true },
};

// Radius op logaritmische schaal (4–12px), gebaseerd op globale min/max.
// Altijd berekend over ALL_CITIES zodat groottes consistent zijn over sets.
const _POP_LOG_MIN = Math.log(Math.min(...ALL_CITIES.map(c => c.pop)));
const _POP_LOG_MAX = Math.log(Math.max(...ALL_CITIES.map(c => c.pop)));

function cityRadius(city) {
  return Math.round(4 + 8 * (Math.log(city.pop) - _POP_LOG_MIN) / (_POP_LOG_MAX - _POP_LOG_MIN));
}

// Node.js-compatibiliteit voor tests (wordt genegeerd door de browser)
if (typeof module !== 'undefined') module.exports = { ALL_CITIES, ALL_PROVINCES, ALL_WATERS, ALL_COUNTRIES, SETS, cityRadius, NL_BOUNDS, EU_BOUNDS, WORLD_BOUNDS };

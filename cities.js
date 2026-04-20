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
  { name: "Helsinki", lat: 60.17, lon: 24.94, pop:  655000, sets: [71, 78], capital: true },
  { name: "Lissabon",   lat: 38.72, lon: -9.14,  pop: 2956000, sets: [71, 73], capital: true },
  { name: "Madrid",     lat: 40.42, lon: -3.70,  pop: 3348000, sets: [71, 73], capital: true },
  { name: "Parijs",     lat: 48.86, lon: 2.35,   pop: 2161000, sets: [58, 71, 73], capital: true },
  { name: "Brussel",    lat: 50.85, lon: 4.35,   pop:  185000, sets: [58, 71, 72], capital: true },
  { name: "Luxemburg",  lat: 49.61, lon: 6.13,   pop:  125000, sets: [71, 72], capital: true },
  { name: "Londen",     lat: 51.51, lon: -0.13,  pop: 9541000, sets: [58, 71, 75], capital: true, aliases: ['London'] },
  { name: "Dublin",     lat: 53.33, lon: -6.25,  pop:  592000, sets: [71, 75], capital: true },
  { name: "Reykjavík",  lat: 64.13, lon: -21.82, pop:  136000, sets: [71], capital: true },
  { name: "Berlijn",    lat: 52.52, lon: 13.40,  pop: 3677000, sets: [58, 71, 74], capital: true },
  { name: "Kopenhagen", lat: 55.68, lon: 12.57,  pop:  764000, sets: [58, 71, 78], capital: true },
  { name: "Oslo",       lat: 59.91, lon: 10.75,  pop:  693000, sets: [71, 78], capital: true },
  { name: "Stockholm",  lat: 59.33, lon: 18.07,  pop:  975000, sets: [71, 78], capital: true },
  { name: "Wenen",      lat: 48.21, lon: 16.37,  pop: 1931000, sets: [71, 76], capital: true },
  { name: "Bern",       lat: 46.95, lon: 7.44,   pop:  134000, sets: [71, 76], capital: true },
  { name: "Rome",       lat: 41.90, lon: 12.50,  pop: 2873000, sets: [71, 76], capital: true },
  { name: "Warschau",   lat: 52.23, lon: 21.01,  pop: 1794000, sets: [71, 77], capital: true },
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
  // ── Set 77: Oost-Europa (7.7) — Warschau staat hierboven in set 71, aangevuld met [77] ─
  // Polen
  { name: "Krakau",          lat: 50.06, lon: 19.94, pop:  779000, sets: [77], aliases: ['Kraków', 'Krakow', 'Cracow'] },
  // Oekraïne
  { name: "Kiev",            lat: 50.45, lon: 30.52, pop: 2884000, sets: [77], capital: true, aliases: ['Kyiv', 'Kyïv'] },
  { name: "Odessa",          lat: 46.48, lon: 30.72, pop: 1017000, sets: [77], aliases: ['Odesa'] },
  // Wit-Rusland
  { name: "Minsk",           lat: 53.90, lon: 27.57, pop: 2010000, sets: [77], capital: true },
  // Roemenië
  { name: "Boekarest",       lat: 44.43, lon: 26.10, pop: 1716000, sets: [77, 79], capital: true, aliases: ['București', 'Bucuresti', 'Bucharest'] },
  // Bulgarije
  { name: "Sofia",           lat: 42.70, lon: 23.32, pop: 1242000, sets: [77, 79], capital: true, aliases: ['София'] },
  // Rusland
  { name: "Moskou",          lat: 55.76, lon: 37.62, pop:12506000, sets: [77], capital: true, aliases: ['Moscow', 'Moskwa'] },
  { name: "Sint-Petersburg", lat: 59.94, lon: 30.31, pop: 5377000, sets: [77], aliases: ['St Petersburg', 'Petersburg', 'Sankt-Peterburg', 'Sint Petersburg'] },
  // ── Set 78: Noord-Europa (7.8) — Oslo, Stockholm, Helsinki, Kopenhagen hergebruikt uit set 71 ─
  // Noorwegen
  { name: "Bergen",     lat: 60.39, lon:  5.33, pop:  287000, sets: [78], aliases: ['Bergen (Noorwegen)'] },
  { name: "Trondheim",  lat: 63.43, lon: 10.40, pop:  211000, sets: [78] },
  { name: "Narvik",     lat: 68.44, lon: 17.43, pop:   14000, sets: [78] },
  { name: "Hammerfest", lat: 70.66, lon: 23.68, pop:   10000, sets: [78] },
  // Zweden
  { name: "Göteborg",   lat: 57.71, lon: 11.97, pop:  587000, sets: [78], aliases: ['Goteborg', 'Gothenburg'] },
  { name: "Malmö",      lat: 55.60, lon: 13.00, pop:  351000, sets: [78], aliases: ['Malmo'] },
  { name: "Kiruna",     lat: 67.86, lon: 20.23, pop:   17000, sets: [78] },
  // ── Set 79: Zuidoost-Europa (7.9) — Boekarest en Sofia hergebruikt uit set 77 ─
  // Slovenië
  { name: "Ljubljana",   lat: 46.06, lon: 14.51, pop:  295000, sets: [79], capital: true },
  // Kroatië
  { name: "Zagreb",      lat: 45.81, lon: 15.98, pop:  790000, sets: [79], capital: true },
  { name: "Split",       lat: 43.51, lon: 16.44, pop:  161000, sets: [79] },
  // Bosnië-Hercegovina
  { name: "Sarajevo",    lat: 43.85, lon: 18.36, pop:  275000, sets: [79], capital: true },
  // Servië
  { name: "Belgrado",    lat: 44.79, lon: 20.45, pop: 1378000, sets: [79], capital: true, aliases: ['Belgrade', 'Beograd'] },
  // Montenegro
  { name: "Podgorica",   lat: 42.44, lon: 19.26, pop:  150000, sets: [79], capital: true },
  // Albanië
  { name: "Tirana",      lat: 41.33, lon: 19.82, pop:  557000, sets: [79], capital: true, aliases: ['Tiranë'] },
  // Noord-Macedonië
  { name: "Skopje",      lat: 41.99, lon: 21.43, pop:  544000, sets: [79], capital: true, aliases: ['Скопје'] },
  // Griekenland
  { name: "Athene",      lat: 37.98, lon: 23.73, pop:  664000, sets: [79], capital: true, aliases: ['Athens', 'Athína', 'Athina'] },
  { name: "Thessaloniki",lat: 40.64, lon: 22.94, pop:  325000, sets: [79], aliases: ['Saloniki', 'Thessalonica'] },
  // Slowakije
  { name: "Bratislava",  lat: 48.15, lon: 17.11, pop:  437000, sets: [79], capital: true },
  // Turkije
  { name: "Istanbul",    lat: 41.01, lon: 28.98, pop:15519000, sets: [79], aliases: ['İstanbul', 'Constantinopel'] },
  { name: "Ankara",      lat: 39.93, lon: 32.85, pop: 5747000, sets: [79], capital: true },
  // ── Set 81: Zuid-Amerika (8.1) — 19 steden, 11 hoofdsteden ──────────────
  { name: 'Bogotá',         lat:   4.71, lon: -74.07, pop: 8000000, sets: [81], capital: true, aliases: ['Bogota'] },
  { name: 'Medellín',       lat:   6.25, lon: -75.57, pop: 2600000, sets: [81], aliases: ['Medellin'] },
  { name: 'Caracas',        lat:  10.48, lon: -66.88, pop: 2900000, sets: [81], capital: true },
  { name: 'Paramaribo',     lat:   5.87, lon: -55.17, pop:  240000, sets: [81], capital: true },
  { name: 'Quito',          lat:  -0.23, lon: -78.52, pop: 2000000, sets: [81], capital: true },
  { name: 'Guayaquil',      lat:  -2.19, lon: -79.88, pop: 2700000, sets: [81] },
  { name: 'Lima',           lat: -12.05, lon: -77.04, pop:10000000, sets: [81], capital: true },
  { name: 'Cuzco',          lat: -13.53, lon: -71.97, pop:  430000, sets: [81], aliases: ['Cusco'] },
  { name: 'La Paz',         lat: -16.50, lon: -68.15, pop:  900000, sets: [81], capital: true },
  { name: 'Brasília',       lat: -15.79, lon: -47.88, pop: 3000000, sets: [81], capital: true, aliases: ['Brasilia'] },
  { name: 'São Paulo',      lat: -23.55, lon: -46.63, pop:12300000, sets: [81], aliases: ['Sao Paulo'] },
  { name: 'Rio de Janeiro', lat: -22.91, lon: -43.17, pop: 6700000, sets: [81] },
  { name: 'Manaus',         lat:  -3.12, lon: -60.02, pop: 2100000, sets: [81] },
  { name: 'Salvador',       lat: -12.97, lon: -38.51, pop: 2900000, sets: [81] },
  { name: 'Asunción',       lat: -25.28, lon: -57.63, pop:  525000, sets: [81], capital: true, aliases: ['Asuncion'] },
  { name: 'Santiago',       lat: -33.45, lon: -70.67, pop: 6200000, sets: [81], capital: true, aliases: ['Santiago de Chile'] },
  { name: 'Córdoba',        lat: -31.42, lon: -64.19, pop: 1400000, sets: [81], aliases: ['Cordoba'] },
  { name: 'Buenos Aires',   lat: -34.61, lon: -58.38, pop:15200000, sets: [81], capital: true },
  { name: 'Montevideo',     lat: -34.90, lon: -56.19, pop: 1400000, sets: [81], capital: true },
  // ── Set 82: Afrika (8.2) — 15 steden, 13 hoofdsteden ────────────────────
  { name: 'Casablanca',     lat:  33.57, lon:  -7.59, pop: 3360000, sets: [82] },
  { name: 'Algiers',        lat:  36.75, lon:   3.06, pop: 2900000, sets: [82], capital: true, aliases: ['Alger', 'الجزائر'] },
  { name: 'Tunis',          lat:  36.81, lon:  10.18, pop: 2400000, sets: [82], capital: true },
  { name: 'Cairo',          lat:  30.05, lon:  31.25, pop:21000000, sets: [82], capital: true, aliases: ['Kaïro', 'Kairo', 'Al-Qāhirah', 'القاهرة'] },
  { name: 'Alexandrië',     lat:  31.20, lon:  29.92, pop: 5200000, sets: [82], aliases: ['Alexandrie', 'Alexandria', 'Al-Iskandariyyah', 'الإسكندرية'] },
  { name: 'Khartoem',       lat:  15.59, lon:  32.53, pop: 5300000, sets: [82], capital: true, aliases: ['Khartoum', 'Al-Khurṭūm', 'الخرطوم'] },
  { name: 'Addis Abeba',    lat:   9.03, lon:  38.74, pop: 3600000, sets: [82], capital: true, aliases: ['Addis Ababa', 'አዲስ አበባ'] },
  { name: 'Nairobi',        lat:  -1.29, lon:  36.82, pop: 4700000, sets: [82], capital: true },
  { name: 'Dar es Salaam',  lat:  -6.80, lon:  39.28, pop: 6700000, sets: [82], aliases: ['Dar-es-Salaam'] },
  { name: 'Lagos',          lat:   6.52, lon:   3.38, pop:15400000, sets: [82] },
  { name: 'Accra',          lat:   5.60, lon:  -0.19, pop: 2500000, sets: [82], capital: true },
  { name: 'Dakar',          lat:  14.72, lon: -17.47, pop: 3100000, sets: [82], capital: true },
  { name: 'Kinshasa',       lat:  -4.32, lon:  15.31, pop:15000000, sets: [82], capital: true },
  { name: 'Johannesburg',   lat: -26.20, lon:  28.05, pop: 6200000, sets: [82] },
  { name: 'Kaapstad',       lat: -33.93, lon:  18.42, pop: 4700000, sets: [82], capital: true, aliases: ['Cape Town', 'Kaapstadt'] },
  // ── Set 83: Noord- en Midden-Amerika (8.3) — 17 steden, 4 hoofdsteden ────
  { name: 'Ottawa',         lat:  45.42, lon: -75.70, pop: 1000000, sets: [83], capital: true },
  { name: 'Toronto',        lat:  43.65, lon: -79.38, pop: 2800000, sets: [83] },
  { name: 'Montréal',       lat:  45.50, lon: -73.57, pop: 1800000, sets: [83], aliases: ['Montreal'] },
  { name: 'Vancouver',      lat:  49.28, lon:-123.12, pop:  675000, sets: [83] },
  { name: 'Washington',     lat:  38.90, lon: -77.03, pop:  700000, sets: [83], capital: true, aliases: ['Washington D.C.', 'Washington DC'] },
  { name: 'New York',       lat:  40.71, lon: -74.01, pop: 8400000, sets: [83], aliases: ['New York City', 'NYC'] },
  { name: 'Chicago',        lat:  41.88, lon: -87.63, pop: 2700000, sets: [83] },
  { name: 'Los Angeles',    lat:  34.05, lon:-118.24, pop: 4000000, sets: [83], aliases: ['LA', 'L.A.'] },
  { name: 'San Francisco',  lat:  37.77, lon:-122.42, pop:  875000, sets: [83], aliases: ['SF'] },
  { name: 'Houston',        lat:  29.76, lon: -95.37, pop: 2300000, sets: [83] },
  { name: 'New Orleans',    lat:  29.95, lon: -90.07, pop:  380000, sets: [83] },
  { name: 'Miami',          lat:  25.76, lon: -80.19, pop:  470000, sets: [83] },
  { name: 'Detroit',        lat:  42.33, lon: -83.05, pop:  630000, sets: [83] },
  { name: 'Denver',         lat:  39.74, lon:-104.99, pop:  715000, sets: [83] },
  { name: 'Mexico-Stad',    lat:  19.43, lon: -99.13, pop: 9200000, sets: [83], capital: true, aliases: ['Mexico Stad', 'Mexico City', 'Ciudad de México', 'CDMX'] },
  { name: 'Monterrey',      lat:  25.67, lon:-100.31, pop: 1140000, sets: [83] },
  { name: 'Havana',         lat:  23.13, lon: -82.38, pop: 2100000, sets: [83], capital: true, aliases: ['Habana', 'La Habana'] },
  // ── Set 84: Midden-Oosten (8.4) — 13 steden, 12 hoofdsteden + Mekka ────────
  { name: 'Ankara',     lat: 39.93, lon: 32.87, pop: 5600000, sets: [84], capital: true },
  { name: 'Damascus',   lat: 33.51, lon: 36.28, pop: 2000000, sets: [84], capital: true, aliases: ['Dimasjk', 'Dimashq'] },
  { name: 'Beiroet',    lat: 33.89, lon: 35.50, pop: 2400000, sets: [84], capital: true, aliases: ['Beirut', 'Bayrūt'] },
  { name: 'Jeruzalem',  lat: 31.78, lon: 35.22, pop:  950000, sets: [84], capital: true, aliases: ['Jerusalem', 'Yerushalayim', 'Al-Quds'] },
  { name: 'Amman',      lat: 31.95, lon: 35.93, pop: 4000000, sets: [84], capital: true, aliases: ['ʿAmmān'] },
  { name: 'Bagdad',     lat: 33.31, lon: 44.36, pop: 7000000, sets: [84], capital: true, aliases: ['Baghdad', 'Baġdād'] },
  { name: 'Teheran',    lat: 35.69, lon: 51.39, pop: 9000000, sets: [84], capital: true, aliases: ['Tehran', 'Tehrān'] },
  { name: 'Riyad',      lat: 24.71, lon: 46.68, pop: 7500000, sets: [84], capital: true, aliases: ['Riyadh', 'Ar-Riyāḍ'] },
  { name: 'Mekka',      lat: 21.42, lon: 39.83, pop: 2000000, sets: [84], aliases: ['Mecca', 'Makkah'] },
  { name: 'Sanaa',      lat: 15.37, lon: 44.19, pop: 2500000, sets: [84], capital: true, aliases: ['Sana\'a', 'Sanʿāʾ', 'Sana'] },
  { name: 'Tbilisi',    lat: 41.72, lon: 44.79, pop: 1100000, sets: [84], capital: true, aliases: ['Tiflis'] },
  { name: 'Jerevan',    lat: 40.18, lon: 44.51, pop: 1100000, sets: [84], capital: true, aliases: ['Yerevan', 'Erevan'] },
  { name: 'Bakoe',      lat: 40.41, lon: 49.87, pop: 2300000, sets: [84], capital: true, aliases: ['Baku', 'Bakı'] },
  // ── Set 85: Steden van Zuid-Azië (8.5) ─────────────────────────────────────
  // 12 steden: 6 hoofdsteden (Tasjkent/Kabul/Islamabad/New Delhi/Kathmandu/Dhaka)
  // + 6 niet-hoofdsteden (Almaty als voormalige hoofdstad KZ; Lahore/Karachi PK;
  // Mumbai/Chennai/Kolkata IN). Sri Lanka: opdrachtblad vraagt geen stad.
  { name: 'Almaty',     lat: 43.24, lon: 76.89, pop: 2000000, sets: [85], aliases: ['Alma-Ata', 'Almata'] },
  { name: 'Tasjkent',   lat: 41.30, lon: 69.24, pop: 2900000, sets: [85], capital: true, aliases: ['Tashkent', 'Toshkent'] },
  { name: 'Kabul',      lat: 34.53, lon: 69.17, pop: 4600000, sets: [85], capital: true, aliases: ['Kabol', 'Kābul'] },
  { name: 'Islamabad',  lat: 33.69, lon: 73.05, pop: 1100000, sets: [85], capital: true, aliases: ['Islāmābād'] },
  { name: 'Lahore',     lat: 31.55, lon: 74.34, pop:13500000, sets: [85], aliases: ['Lāhaur'] },
  { name: 'Karachi',    lat: 24.86, lon: 67.01, pop:16000000, sets: [85], aliases: ['Karāchi'] },
  { name: 'New Delhi',  lat: 28.61, lon: 77.21, pop:32000000, sets: [85], capital: true, aliases: ['Delhi', 'Nieuw-Delhi'] },
  { name: 'Mumbai',     lat: 19.08, lon: 72.88, pop:20000000, sets: [85], aliases: ['Bombay'] },
  { name: 'Chennai',    lat: 13.08, lon: 80.27, pop:11000000, sets: [85], aliases: ['Madras'] },
  { name: 'Kolkata',    lat: 22.57, lon: 88.36, pop:15000000, sets: [85], aliases: ['Calcutta', 'Calcuta'] },
  { name: 'Kathmandu',  lat: 27.72, lon: 85.32, pop: 1500000, sets: [85], capital: true, aliases: ['Kāṭhmāṇḍau'] },
  { name: 'Dhaka',      lat: 23.81, lon: 90.41, pop:10000000, sets: [85], capital: true, aliases: ['Dacca', 'Ḍhaka'] },
  // ── Set 86: Steden van Oost-Azië (8.6) ─────────────────────────────────────
  // 14 steden: 5 hoofdsteden (Beijing/Tokyo/Ulaanbaatar/Pyongyang/Seoul)
  // + 9 niet-hoofd. Moskou staat niet in opdrachtblad — focus Siberië.
  // Harbin (China NO) hoort qua oefening bij de Siberische cluster.
  // Hongkong is SAR van China — eigen stad zonder capital.
  { name: 'Omsk',         lat: 54.99, lon: 73.37, pop: 1100000, sets: [86] },
  { name: 'Novosibirsk',  lat: 55.03, lon: 82.92, pop: 1600000, sets: [86], aliases: ['Novosibirsk', 'Nowosibirsk'] },
  { name: 'Irkoetsk',     lat: 52.29, lon: 104.30,pop:  620000, sets: [86], aliases: ['Irkutsk'] },
  { name: 'Vladivostok',  lat: 43.12, lon: 131.89,pop:  600000, sets: [86] },
  { name: 'Harbin',       lat: 45.80, lon: 126.53,pop:10000000, sets: [86], aliases: ['Haerbin', 'Haʼerbin'] },
  { name: 'Ulaanbaatar',  lat: 47.91, lon: 106.92,pop: 1600000, sets: [86], capital: true, aliases: ['Ulan Bator', 'Oelan-Bator'] },
  { name: 'Beijing',      lat: 39.90, lon: 116.41,pop:22000000, sets: [86], capital: true, aliases: ['Peking', 'Běijīng'] },
  { name: 'Shanghai',     lat: 31.23, lon: 121.47,pop:28000000, sets: [86], aliases: ['Shànghǎi'] },
  { name: 'Hongkong',     lat: 22.32, lon: 114.17,pop: 7500000, sets: [86], aliases: ['Hong Kong', 'Xianggang', 'Xiānggǎng'] },
  { name: 'Tokyo',        lat: 35.68, lon: 139.77,pop:37000000, sets: [86], capital: true, aliases: ['Tokio', 'Tōkyō'] },
  { name: 'Osaka',        lat: 34.69, lon: 135.50,pop:19000000, sets: [86], aliases: ['Ōsaka'] },
  { name: 'Sapporo',      lat: 43.07, lon: 141.35,pop: 2700000, sets: [86], aliases: ['Sapporo-shi'] },
  { name: 'Pyongyang',    lat: 39.02, lon: 125.75,pop: 3100000, sets: [86], capital: true, aliases: ['Pjongjang', 'P\'yŏngyang'] },
  { name: 'Seoul',        lat: 37.57, lon: 126.98,pop:25000000, sets: [86], capital: true, aliases: ['Seoel', 'Sŏul'] },
];

// Landen voor sets met quizType 'country'.
// lat/lon = centroïd (voor pan-to en als fallback klik-punt).
const ALL_COUNTRIES = [
  // ── Set 71: Landen van Europa (7.1) ───────────────────────────
  { name: 'Finland',  lat: 64.00, lon: 26.00, sets: [71, 78] },
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
  { name: 'Denemarken',          lat: 56.0,  lon:  9.0,  sets: [58, 71, 78] },
  { name: 'Noorwegen',           lat: 61.4,  lon:  9.7,  sets: [58, 71, 78] },
  { name: 'Zweden',              lat: 65.9,  lon: 19.0,  sets: [58, 71, 78] },
  { name: 'Oostenrijk',          lat: 47.5,  lon: 14.1,  sets: [58, 71] },
  { name: 'Zwitserland',         lat: 46.7,  lon:  7.5,  sets: [58, 71] },
  { name: 'Italië',              lat: 44.7,  lon: 11.1,  sets: [58, 71] },
  { name: 'Polen',               lat: 52.0,  lon: 19.5,  sets: [58, 71, 77] },
  { name: 'Tsjechië',            lat: 49.9,  lon: 15.4,  sets: [58, 71, 77] },
  { name: 'Hongarije',           lat: 47.1,  lon: 19.4,  sets: [71, 77] },
  // ── Set 58: Onze buren — extra land (niet in set 71) ────────
  { name: 'Slovenië',            lat: 46.1,  lon: 14.8,  sets: [58, 79] },
  // ── Set 77: Landen van Oost-Europa (7.7) ────────────────────
  // lat/lon = centroïd voor pan-to en labelpositie. Rusland-centroïd bewust
  // op het Europese deel (Moskou-regio) zodat het label binnen de bounds valt.
  { name: 'Slowakije',           lat: 48.67, lon: 19.70, sets: [77, 79], aliases: ['Slovakia'] },
  { name: 'Oekraïne',            lat: 49.00, lon: 31.50, sets: [77], aliases: ['Oekraine', 'Ukraine', 'Україна'] },
  { name: 'Moldavië',            lat: 47.20, lon: 28.50, sets: [77], aliases: ['Moldavie', 'Moldova'] },
  { name: 'Roemenië',            lat: 45.90, lon: 24.90, sets: [77, 79], aliases: ['Roemenie', 'Romania', 'România'] },
  { name: 'Bulgarije',           lat: 42.70, lon: 25.50, sets: [77, 79], aliases: ['Bulgaria', 'България'] },
  { name: 'Wit-Rusland',         lat: 53.70, lon: 27.90, sets: [77], aliases: ['Wit Rusland', 'Belarus', 'Беларусь'] },
  { name: 'Rusland',             lat: 55.00, lon: 45.00, sets: [77], aliases: ['Russia', 'Россия'] },
  { name: 'Estland',             lat: 58.67, lon: 25.54, sets: [77], aliases: ['Estonia', 'Eesti'] },
  { name: 'Letland',             lat: 56.90, lon: 24.60, sets: [77], aliases: ['Latvia', 'Latvija'] },
  { name: 'Litouwen',            lat: 55.30, lon: 23.90, sets: [77], aliases: ['Lithuania', 'Lietuva'] },
  // ── Set 79: Zuidoost-Europa (7.9) — Slovenië, Roemenië, Bulgarije en Slowakije hergebruikt ─
  { name: 'Kroatië',             lat: 45.10, lon: 15.20, sets: [79], aliases: ['Kroatie', 'Croatia', 'Hrvatska'] },
  { name: 'Bosnië-Hercegovina',  lat: 44.00, lon: 17.80, sets: [79], aliases: ['Bosnie-Hercegovina', 'Bosnia', 'Bosnië', 'Bosnia and Herzegovina', 'Bosna i Hercegovina'] },
  { name: 'Servië',              lat: 44.00, lon: 20.80, sets: [79], aliases: ['Servie', 'Serbia', 'Srbija'] },
  { name: 'Montenegro',          lat: 42.70, lon: 19.30, sets: [79], aliases: ['Crna Gora'] },
  { name: 'Albanië',             lat: 41.00, lon: 20.10, sets: [79], aliases: ['Albanie', 'Albania', 'Shqipëria'] },
  { name: 'Noord-Macedonië',     lat: 41.60, lon: 21.75, sets: [79], aliases: ['Noord Macedonie', 'North Macedonia', 'Macedonië', 'Macedonia', 'Severna Makedonija'] },
  { name: 'Griekenland',         lat: 39.00, lon: 22.50, sets: [79], aliases: ['Greece', 'Ελλάδα', 'Ellada'] },
  // Turkije-centroïd bewust op het Europese deel (Trakië) zodat label binnen de
  // set-bounds [[34,13],[49,45]] valt. De polygoon omvat wel Anatolië tot 45°E.
  { name: 'Turkije',             lat: 39.00, lon: 35.00, sets: [79], aliases: ['Turkey', 'Türkiye', 'Turkiye'] },
  { name: 'Cyprus',              lat: 35.10, lon: 33.40, sets: [79], aliases: ['Kύπρος', 'Kypros', 'Kıbrıs'] },
  // ── Set 81: Zuid-Amerika (8.1) — Natural Earth polygonen in landen-zuidamerika.geojson ─
  { name: 'Colombia',   lat:   4.0, lon: -73.0, sets: [81] },
  { name: 'Venezuela',  lat:   7.5, lon: -66.0, sets: [81] },
  { name: 'Suriname',   lat:   4.0, lon: -56.0, sets: [81] },
  { name: 'Ecuador',    lat:  -1.5, lon: -78.5, sets: [81] },
  { name: 'Peru',       lat: -10.0, lon: -76.0, sets: [81] },
  { name: 'Bolivia',    lat: -17.0, lon: -65.0, sets: [81] },
  { name: 'Brazilië',   lat: -10.0, lon: -55.0, sets: [81], aliases: ['Brazilie', 'Brasil', 'Brazil'] },
  { name: 'Paraguay',   lat: -23.0, lon: -58.0, sets: [81] },
  { name: 'Chili',      lat: -35.0, lon: -71.0, sets: [81], aliases: ['Chile'] },
  { name: 'Argentinië', lat: -35.0, lon: -65.0, sets: [81], aliases: ['Argentinie', 'Argentina'] },
  { name: 'Uruguay',    lat: -33.0, lon: -55.5, sets: [81] },
  // ── Set 82: Afrika (8.2) — Natural Earth polygonen in landen-afrika.geojson ─
  { name: 'Marokko',     lat:  32.0, lon:  -6.5, sets: [82], aliases: ['Morocco', 'Al-Maġrib', 'المغرب'] },
  { name: 'Algerije',    lat:  28.0, lon:   2.5, sets: [82], aliases: ['Algeria', 'Al-Jazāʾir', 'الجزائر'] },
  { name: 'Tunesië',     lat:  34.0, lon:   9.5, sets: [82], aliases: ['Tunesie', 'Tunisia', 'Tūnis', 'تونس'] },
  { name: 'Egypte',      lat:  27.0, lon:  30.0, sets: [82], aliases: ['Egypt', 'Miṣr', 'مصر'] },
  { name: 'Sudan',       lat:  15.5, lon:  30.0, sets: [82], aliases: ['Soedan', 'السودان'] },
  { name: 'Ethiopië',    lat:   9.0, lon:  40.0, sets: [82], aliases: ['Ethiopie', 'Ethiopia', 'ኢትዮጵያ'] },
  { name: 'Kenia',       lat:   0.0, lon:  37.8, sets: [82], aliases: ['Kenya'] },
  { name: 'Tanzania',    lat:  -6.5, lon:  34.5, sets: [82] },
  { name: 'Nigeria',     lat:  10.0, lon:   8.0, sets: [82] },
  { name: 'Ghana',       lat:   7.9, lon:  -1.0, sets: [82] },
  { name: 'Senegal',     lat:  14.5, lon: -14.5, sets: [82], aliases: ['Sénégal'] },
  { name: 'DR Congo',    lat:  -2.5, lon:  23.5, sets: [82], aliases: ['Democratische Republiek Congo', 'Congo-Kinshasa', 'Zaïre'] },
  { name: 'Zuid-Afrika', lat: -29.0, lon:  25.0, sets: [82], aliases: ['Zuid Afrika', 'South Africa', 'RSA'] },
  // ── Set 83: Noord- en Midden-Amerika (8.3) — NE polygonen in landen-noord-midden-amerika.geojson ─
  { name: 'Canada',    lat:  56.0, lon:-106.0, sets: [83] },
  { name: 'VS',        lat:  39.0, lon: -98.0, sets: [83], aliases: ['Verenigde Staten', 'USA', 'United States', 'Verenigde Staten van Amerika'] },
  { name: 'Mexico',    lat:  23.0, lon:-102.0, sets: [83], aliases: ['México', 'Estados Unidos Mexicanos'] },
  { name: 'Cuba',      lat:  21.5, lon: -79.0, sets: [83] },
  { name: 'Haïti',     lat:  19.0, lon: -73.0, sets: [83], aliases: ['Haiti', 'République d\'Haïti'] },
  { name: 'Guatemala', lat:  15.5, lon: -90.3, sets: [83] },
  { name: 'Nicaragua', lat:  13.0, lon: -85.0, sets: [83] },
  // ── Set 84: Midden-Oosten (8.4) — NE polygonen in landen-midden-oosten.geojson ─
  { name: 'Turkije',       lat: 39.0, lon: 35.0, sets: [84], aliases: ['Türkiye', 'Turkey'] },
  { name: 'Syrië',         lat: 35.0, lon: 38.0, sets: [84], aliases: ['Syria', 'Syrie'] },
  { name: 'Libanon',       lat: 33.9, lon: 35.9, sets: [84], aliases: ['Lebanon', 'Liban'] },
  { name: 'Israël',        lat: 31.5, lon: 34.8, sets: [84], aliases: ['Israel'] },
  { name: 'Jordanië',      lat: 31.0, lon: 36.5, sets: [84], aliases: ['Jordan', 'Jordanie'] },
  { name: 'Irak',          lat: 33.0, lon: 44.0, sets: [84], aliases: ['Iraq'] },
  { name: 'Iran',          lat: 32.5, lon: 54.0, sets: [84], aliases: ['Perzië', 'Persia'] },
  { name: 'Saoedi-Arabië', lat: 24.0, lon: 45.0, sets: [84], aliases: ['Saoedi Arabië', 'Saudi-Arabië', 'Saudi Arabia', 'KSA'] },
  { name: 'Jemen',         lat: 15.5, lon: 47.5, sets: [84], aliases: ['Yemen'] },
  { name: 'Koeweit',       lat: 29.3, lon: 47.5, sets: [84], aliases: ['Kuwait'] },
  { name: 'Georgië',       lat: 42.3, lon: 43.5, sets: [84], aliases: ['Georgia', 'Sakartvelo'] },
  { name: 'Armenië',       lat: 40.1, lon: 45.0, sets: [84], aliases: ['Armenia', 'Hayastan'] },
  { name: 'Azerbeidzjan',  lat: 40.3, lon: 47.8, sets: [84], aliases: ['Azerbaijan', 'Azerbeidzjaan'] },
  // ── Set 85: Landen van Zuid-Azië (8.5) ─────────────────────────────────────
  { name: 'Kazachstan',    lat: 48.0, lon: 68.0, sets: [85], aliases: ['Kazakhstan', 'Qazaqstan'] },
  { name: 'Oezbekistan',   lat: 41.5, lon: 64.0, sets: [85], aliases: ['Uzbekistan', 'Oʻzbekiston'] },
  { name: 'Afghanistan',   lat: 33.9, lon: 66.0, sets: [85], aliases: ['Afganistan', 'Afġānistān'] },
  { name: 'Pakistan',      lat: 30.0, lon: 70.0, sets: [85], aliases: ['Pākistān'] },
  { name: 'India',         lat: 22.5, lon: 79.0, sets: [85], aliases: ['Bhārat', 'Hindustan'] },
  { name: 'Nepal',         lat: 28.2, lon: 84.1, sets: [85], aliases: ['Nēpāl'] },
  { name: 'Bangladesh',    lat: 23.7, lon: 90.4, sets: [85], aliases: ['Bānglādesh'] },
  { name: 'Sri Lanka',     lat:  7.9, lon: 80.8, sets: [85], aliases: ['Ceylon', 'Srī Laṅkā'] },
  // ── Set 86: Landen van Oost-Azië (8.6) ─────────────────────────────────────
  // Rusland: volledig polygoon (incl. Kaliningrad), centroïd in Siberië.
  { name: 'Rusland',       lat: 60.0, lon: 90.0, sets: [86], aliases: ['Russia', 'Rossija', 'Russische Federatie'] },
  { name: 'Mongolië',      lat: 46.9, lon:103.0, sets: [86], aliases: ['Mongolia'] },
  { name: 'China',         lat: 35.0, lon:103.0, sets: [86], aliases: ['Volksrepubliek China', 'PRC', "Zhōngguó"] },
  { name: 'Japan',         lat: 36.2, lon:138.3, sets: [86], aliases: ['Nippon', 'Nihon'] },
  { name: 'Noord-Korea',   lat: 40.3, lon:127.5, sets: [86], aliases: ['North Korea', 'DPRK', 'Chosŏn'] },
  { name: 'Zuid-Korea',    lat: 36.5, lon:127.8, sets: [86], aliases: ['South Korea', 'ROK', 'Hanguk'] },
  { name: 'Taiwan',        lat: 23.7, lon:121.0, sets: [86], aliases: ['Formosa', 'Republic of China', 'ROC', 'Táiwān'] },
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
  { name: 'Donau',            lat: 47.50, lon: 16.50, sets: [76, 77], aliases: ['Donau', 'Danube', 'Dunaj'] },
  { name: 'Po',               lat: 45.00, lon: 10.50, sets: [76] },
  { name: 'Meer van Genève',  lat: 46.45, lon:  6.50, sets: [76], aliases: ['Lac Léman', 'Genfersee', 'Lac de Genève'] },
  { name: 'Balaton',          lat: 46.85, lon: 17.75, sets: [76], aliases: ['Balatonmeer'] },
  { name: 'Adriatische Zee',  lat: 42.50, lon: 15.00, sets: [76], aliases: ['Adriatic Sea', 'Mare Adriatico'] },
  // ── Set 77: Wateren van Oost-Europa (7.7) — Donau staat hierboven in set 76, aangevuld met [77] ─
  { name: 'Oder',             lat: 52.50, lon: 14.50, sets: [77], aliases: ['Odra'] },
  { name: 'Weichsel',         lat: 52.30, lon: 19.50, sets: [77], aliases: ['Wisła', 'Wisla', 'Vistula'] },
  { name: 'Dnjepr',           lat: 50.00, lon: 31.00, sets: [77], aliases: ['Dnipro', 'Dniepr', 'Dnieper', 'Dnepr'] },
  { name: 'Oostzee',          lat: 58.00, lon: 20.00, sets: [77, 78], aliases: ['Baltische Zee', 'Baltic Sea'] },
  { name: 'Zwarte Zee',       lat: 43.40, lon: 34.00, sets: [77, 79], aliases: ['Black Sea', 'Karadeniz'] },
  // ── Set 78: Wateren van Noord-Europa (7.8) ────────────────────────────────
  { name: 'Sont',               lat: 55.80, lon: 12.70, sets: [78], aliases: ['Øresund', 'Oresund'] },
  { name: 'Botnische Golf',     lat: 62.00, lon: 20.00, sets: [78], aliases: ['Gulf of Bothnia', 'Pohjanlahti'] },
  { name: 'Finse Golf',         lat: 59.70, lon: 25.00, sets: [78], aliases: ['Gulf of Finland', 'Suomenlahti'] },
  { name: 'Barentszzee',        lat: 71.50, lon: 37.00, sets: [78], aliases: ['Barents Sea', 'Barentsz Zee', 'Barentszee'] },
  { name: 'Atlantische Oceaan', lat: 62.00, lon:  0.00, sets: [78], aliases: ['Atlantic Ocean', 'Atlantic'] },
  // ── Set 79: Wateren van Zuidoost-Europa (7.9) ─────────────────────────────
  { name: 'Bosporus',           lat: 41.12, lon: 29.07, sets: [79], aliases: ['Bosphorus', 'İstanbul Boğazı'] },
  // ── Set 81: Wateren van Zuid-Amerika (8.1) ────────────────────────────────
  // Amazone: LineString uit OSM relation Q3783 (main_stream) → wateren.geojson
  { name: 'Amazone',            lat: -3.00, lon: -60.00, sets: [81], aliases: ['Amazon', 'Rio Amazonas', 'Amazonas'] },
  // ── Set 82: Wateren van Afrika (8.2) ──────────────────────────────────────
  // Nijl/Congo/Niger: LineStrings uit OSM (main_stream). Victoriameer: Polygon.
  // Suezkanaal: LineString. Rode Zee + Straat van Gibraltar: fuzzy ellipsen
  // (policy — geen nieuwe harde zee-polygonen, cf. memory feedback).
  { name: 'Nijl',                 lat:  25.00, lon:  32.00, sets: [82], aliases: ['Nile', 'النيل'] },
  { name: 'Congo',                lat:  -2.00, lon:  17.00, sets: [82], aliases: ['Congo-rivier', 'Fleuve Congo'] },
  { name: 'Niger',                lat:  13.00, lon:   3.00, sets: [82], aliases: ['Niger-rivier'] },
  { name: 'Victoriameer',         lat:  -1.00, lon:  33.00, sets: [82], aliases: ['Lake Victoria', 'Nalubaale'] },
  { name: 'Suezkanaal',           lat:  30.60, lon:  32.35, sets: [82, 84], aliases: ['Suez Canal', 'Qanāt as-Suways', 'قناة السويس'] },
  // Rode Zee: fuzzy, langgerekt N-Z, ~12°N..28°N, 33°E..43°E. rx=5, ry=8.
  // Gedeeld met set 82 (Afrika) — zelfde zee grenst aan Afrika én Arabië.
  { name: 'Rode Zee',             lat:  20.00, lon:  38.00, shape: 'fuzzy', rx: 5.00, ry: 8.00, sets: [82, 84], aliases: ['Red Sea', 'Baḥr al-Aḥmar'] },
  // Straat van Gibraltar: smalle zeestraat (~14 km); kleine ellips, net zichtbaar.
  { name: 'Straat van Gibraltar', lat:  35.95, lon:  -5.60, shape: 'fuzzy', rx: 0.80, ry: 0.40, sets: [82], aliases: ['Strait of Gibraltar', 'Estrecho de Gibraltar'] },
  // ── Set 83: Wateren van Noord- en Midden-Amerika (8.3) ────────────────────
  // Mississippi/Rio Grande: LineStrings uit OSM main_stream.
  // Panamakanaal: 2-punt schematische lijn (OSM-relation had parallelle
  // sluisbanen + meerdoorvaart — zigzag-vormig).
  // Caribische Zee: fuzzy (policy — geen nieuwe harde zee-polygonen).
  { name: 'Mississippi',   lat:  38.00, lon: -91.00, sets: [83], aliases: ['Mississippi River'] },
  { name: 'Rio Grande',    lat:  31.00, lon:-103.00, sets: [83], aliases: ['Río Grande', 'Río Bravo', 'Río Bravo del Norte'] },
  { name: 'Panamakanaal',  lat:   9.15, lon: -79.70, sets: [83], aliases: ['Panama Canal', 'Canal de Panamá'] },
  // Caribische Zee: fuzzy ellips, ~9°N..23°N, -88°W..-60°W. rx=14 (lon), ry=7 (lat).
  { name: 'Caribische Zee', lat: 15.00, lon: -75.00, shape: 'fuzzy', rx: 14.00, ry: 7.00, sets: [83], aliases: ['Caraïbische Zee', 'Caribbean Sea', 'Mar Caribe'] },
  // ── Set 84: Wateren van Midden-Oosten (8.4) ───────────────────────────────
  // Eufraat: LineString uit OSM Q34589 (main_stream) → wateren.geojson.
  // Suezkanaal + Rode Zee: hergebruikt uit set 82 via sets:[82,84].
  // Overige 5 zeeën: fuzzy ellipsen (policy — geen nieuwe harde zee-polygonen).
  { name: 'Eufraat',          lat:  35.00, lon:  40.00, sets: [84], aliases: ['Euphrates', 'Furāt', 'Al-Furāt'] },
  // Zwarte Zee: ~41°N..46°N, 28°E..42°E. rx=8, ry=3.
  { name: 'Zwarte Zee',       lat:  43.00, lon:  34.00, shape: 'fuzzy', rx: 8.00, ry: 3.00, sets: [84], aliases: ['Black Sea', 'Kara Deniz'] },
  // Perzische Golf: langgerekt NW-SE, ~24°N..30°N, 48°E..57°E.
  { name: 'Perzische Golf',   lat:  27.00, lon:  51.50, shape: 'fuzzy', rx: 5.50, ry: 2.50, sets: [84], aliases: ['Perzische golf', 'Persian Gulf', 'Arabische Golf', 'Khalīj Fārs'] },
  // Kaspische Zee: N-Z georiënteerd binnenmeer, ~36°N..47°N, 47°E..54°E.
  { name: 'Kaspische Zee',    lat:  42.00, lon:  50.50, shape: 'fuzzy', rx: 3.50, ry: 6.00, sets: [84], aliases: ['Caspian Sea', 'Kaspian Zee'] },
  // Middellandse Zee: enorm, ~30°N..46°N, -5°W..36°E. Centrum binnen Europa
  // maar ellips strekt tot oost-kust Israël/Libanon. Ook set 82 (NB: set 82
  // heeft hem nu niet; volgens opdrachtblad 8.2 enkel Rode Zee + Gibraltar).
  { name: 'Middellandse Zee', lat:  35.00, lon:  18.00, shape: 'fuzzy', rx: 20.00, ry: 5.00, sets: [84], aliases: ['Mediterrane Zee', 'Mediterranean', 'Mediterranean Sea'] },
  // Indische Oceaan: gigantisch. Vanuit ME-perspectief centraal op Arabische
  // Zee zodat hij ~Z-oost in beeld komt. Grote ellips.
  { name: 'Indische Oceaan',  lat:  10.00, lon:  65.00, shape: 'fuzzy', rx: 20.00, ry: 15.00, sets: [84, 85], aliases: ['Indian Ocean'] },
  // ── Set 85: Wateren van Zuid-Azië (8.5) ────────────────────────────────────
  // Ganges (Q5089) + Indus (Q7348): LineStrings uit OSM main_stream → wateren.geojson.
  // 3 zeeën als fuzzy ellips; Indische Oceaan gedeeld met set 84.
  { name: 'Ganges',             lat:  25.50, lon:  85.00, sets: [85], aliases: ['Ganga', 'Gaṅgā'] },
  { name: 'Indus',              lat:  28.00, lon:  70.00, sets: [85], aliases: ['Sindhu', 'Sindh'] },
  // Arabische Zee: ~8°N..25°N, 55°E..75°E. rx=10, ry=8.
  { name: 'Arabische Zee',      lat:  15.00, lon:  65.00, shape: 'fuzzy', rx: 10.00, ry:  8.00, sets: [85], aliases: ['Arabian Sea'] },
  // Golf van Bengalen: ~5°N..22°N, 80°E..95°E. rx=7, ry=8.
  { name: 'Golf van Bengalen',  lat:  14.00, lon:  88.00, shape: 'fuzzy', rx:  7.00, ry:  8.00, sets: [85], aliases: ['Bay of Bengal', 'Bengaalse Golf'] },
  // ── Set 86: Wateren van Oost-Azië (8.6) ────────────────────────────────────
  // Huang He + Chang Jiang: LineStrings uit OSM main_stream → wateren.geojson.
  // Zuid-Chinese Zee: ~2°N..22°N, 105°E..120°E. rx=8, ry=10.
  // Grote Oceaan: gigantisch, oostelijk van Japan. Centrum op ~30°N/160°E,
  // rx=30, ry=25 — dekt het zichtbare deel in de OAZ-viewport.
  { name: 'Huang He',           lat:  37.50, lon: 110.00, sets: [86], aliases: ['Gele Rivier', 'Yellow River', 'Huáng Hé'] },
  { name: 'Chang Jiang',        lat:  30.00, lon: 112.00, sets: [86], aliases: ['Yangtze', 'Yangzi', 'Cháng Jiāng', 'Blauwe Rivier'] },
  { name: 'Zuid-Chinese Zee',   lat:  14.00, lon: 115.00, shape: 'fuzzy', rx:  8.00, ry: 10.00, sets: [86], aliases: ['South China Sea', 'Zuid Chinese Zee'] },
  { name: 'Grote Oceaan',       lat:  30.00, lon: 160.00, shape: 'fuzzy', rx: 30.00, ry: 25.00, sets: [86], aliases: ['Stille Oceaan', 'Pacific Ocean', 'Pacific'] },
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
  // Duitse regio's zijn overwegend fuzzy ellipsen — kinderen leren ze als globale
  // streken, niet als bestuurlijke grenzen. Uitzondering: Beieren (Bundesland met
  // exacte admin-grens; polygoon uit OSM — zie #81).
  { name: 'Ruhrgebied',   lat: 51.47, lon:  7.30, kind: 'gewest', shape: 'fuzzy', rx: 0.55, ry: 0.22, sets: [74] },
  { name: 'Beieren',      lat: 48.90, lon: 11.50, kind: 'gewest', sets: [74], aliases: ['Bavaria'] },
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
  // Apennijnen lopen diagonaal NW→SE van Emilia (44,11) tot Calabrië (39,16).
  // rot=25° (CCW, CCW met cos(lat)-compensatie in buildEllipseFeature) kantelt de
  // lange as evenwijdig aan de bergrug; center zit midden op de laars.
  { name: 'Apennijnen',  lat: 42.00, lon: 13.50, kind: 'gewest', shape: 'fuzzy', rx: 0.70, ry: 2.80, rot: 25, sets: [76], aliases: ['Apennines', 'Appennini'] },
  // Sicilië en Sardinië: harde polygonen uit Natural Earth (gewesten.geojson)
  { name: 'Sicilië',     lat: 37.60, lon: 14.00, kind: 'gewest', sets: [76], aliases: ['Sicilia', 'Sicily'] },
  { name: 'Sardinië',    lat: 40.00, lon:  9.10, kind: 'gewest', sets: [76], aliases: ['Sardegna', 'Sardinia'] },
  // ── Set 77: Oost-Europa (7.7) — gebergten als fuzzy ellipsen ─────────────────
  // Karpaten: boog door Slowakije, zuid-Polen, west-Oekraïne tot de Transsylvanische Alpen.
  //   Ellips kan geen boog volgen — compromis: wijde ry zodat hij de hele boog dekt.
  // Balkan (Stara Planina): oost-west door centraal Bulgarije, smal en langgerekt.
  // Kaukasus: WNW-OZO tussen Zwarte Zee en Kaspische Zee, grens Rusland/Georgië.
  { name: 'Karpaten', lat: 47.50, lon: 24.00, kind: 'gewest', shape: 'fuzzy', rx: 3.50, ry: 2.00, sets: [77], aliases: ['Carpathians', 'Carpați', 'Karpaty'] },
  { name: 'Balkan',   lat: 42.75, lon: 25.00, kind: 'gewest', shape: 'fuzzy', rx: 2.50, ry: 0.35, sets: [77], aliases: ['Stara Planina', 'Balkangebergte'] },
  { name: 'Kaukasus', lat: 42.80, lon: 44.00, kind: 'gewest', shape: 'fuzzy', rx: 3.50, ry: 0.55, sets: [77], aliases: ['Caucasus', 'Kavkaz'] },
  // ── Set 78: Noord-Europa (7.8) — fuzzy gebieden ─────────────────────────────
  // Lapland: noordelijk Scandinavië, boven de poolcirkel — ruim gebied over NO/SE/FI.
  // Jutland: Deens schiereiland, N-Z lang smal — centrum rond Viborg.
  { name: 'Lapland', lat: 68.00, lon: 22.00, kind: 'gewest', shape: 'fuzzy', rx: 6.00, ry: 2.20, sets: [78], aliases: ['Lappi', 'Sápmi'] },
  { name: 'Jutland', lat: 56.30, lon:  9.30, kind: 'gewest', shape: 'fuzzy', rx: 0.80, ry: 1.80, sets: [78], aliases: ['Jylland'] },
  // ── Set 79: Zuidoost-Europa (7.9) — Kreta als harde polygoon uit Natural Earth ─
  { name: 'Kreta', lat: 35.20, lon: 24.80, kind: 'gewest', sets: [79], aliases: ['Crete', 'Kriti', 'Κρήτη'] },
  // ── Set 81: Zuid-Amerika (8.1) — fuzzy ellipsen ─────────────────────────────
  // Andes: lange N-Z bergrug door 7 landen (VE → AR/CL). Ellips is per definitie
  // een compromis — ry dekt ~8°N tot ~54°S, rx smal (2°) omdat de keten zelf smal is.
  // Vuurland: eilandengroep rond Ushuaia; ruime ellips omdat meerdere eilanden + Straat van Magallanes.
  { name: 'Andes',    lat: -22.00, lon: -68.50, kind: 'gebied', shape: 'fuzzy', rx: 2.20, ry: 27.00, sets: [81], aliases: ['Andesgebergte', 'Los Andes'] },
  { name: 'Vuurland', lat: -54.00, lon: -68.50, kind: 'gebied', shape: 'fuzzy', rx: 2.20, ry: 1.50, sets: [81], aliases: ['Tierra del Fuego'] },
  // ── Set 82: Afrika (8.2) — fuzzy gebieden ─────────────────────────────────
  // Sahara: enorme woestijn N-Afrika, 15°N..30°N, -15°W..35°E. rx groot, ry matig.
  // Atlasgebergte: N-W Afrika, Marokko→Tunesië, langgerekt.
  // Canarische Eilanden: archipel ~28°N, ~-15°W (ruime ellips dekt alle 7 eilanden).
  { name: 'Sahara',              lat:  23.00, lon:  10.00, kind: 'gebied', shape: 'fuzzy', rx: 25.00, ry: 7.50, sets: [82], aliases: ['Sahara-woestijn', 'Sahara Desert'] },
  { name: 'Atlasgebergte',       lat:  32.50, lon:  -3.00, kind: 'gebied', shape: 'fuzzy', rx:  6.00, ry: 1.20, sets: [82], aliases: ['Atlas', 'Atlas Mountains'] },
  { name: 'Canarische Eilanden', lat:  28.30, lon: -15.80, kind: 'gebied', shape: 'fuzzy', rx:  2.60, ry: 1.10, sets: [82], aliases: ['Canarische eilanden', 'Canarias', 'Canary Islands'] },
  // ── Set 83: Noord- en Midden-Amerika (8.3) ────────────────────────────────
  // Alaska/Groenland/Texas/Florida: harde polygonen uit Natural Earth (admin_1
  // + admin_0) — kustlijn zonder territoriale wateren. In gewesten.geojson.
  // Rocky Mountains / Sierra Nevada / Appalachen: fuzzy ellipsen — bergruggen
  // hebben geen bestuurlijke grens, en school-niveau heeft genoeg aan een ruwe
  // markering van het gebied.
  { name: 'Alaska',          lat:  64.00, lon:-152.00, kind: 'gewest', sets: [83] },
  { name: 'Groenland',       lat:  72.00, lon: -40.00, kind: 'gewest', sets: [83], aliases: ['Greenland', 'Kalaallit Nunaat'] },
  { name: 'Texas',           lat:  31.00, lon:-100.00, kind: 'gewest', sets: [83] },
  { name: 'Florida',         lat:  28.50, lon: -82.00, kind: 'gewest', sets: [83] },
  // Rocky Mountains: lange N-Z rug van Alaska-zuid tot New Mexico (~60°→32°N,
  // ~-108°W). Centrum op Wyoming/Montana, ry groot.
  { name: 'Rocky Mountains', lat:  45.00, lon:-112.00, kind: 'gebied', shape: 'fuzzy', rx:  3.00, ry: 14.00, sets: [83], aliases: ['Rockies', 'Rocky Mts', 'Rotsgebergte'] },
  // Sierra Nevada: CA, langs oostflank Central Valley, ~35.5-40°N.
  { name: 'Sierra Nevada',   lat:  38.00, lon:-119.50, kind: 'gebied', shape: 'fuzzy', rx:  0.55, ry:  2.50, sets: [83] },
  // Appalachen: van Alabama tot Maine, SW-NE diagonaal. N-Z-ellips dekt
  // vrijwel volledig de hele rug; rot niet strikt nodig op continent-zoom.
  { name: 'Appalachen',      lat:  39.00, lon: -79.00, kind: 'gebied', shape: 'fuzzy', rx:  2.50, ry:  6.50, sets: [83], aliases: ['Appalachian Mountains', 'Appalachians'] },
  // ── Set 85: Gebieden van Zuid-Azië (8.5) ────────────────────────────────────
  // Himalaya: fuzzy ellips over de gebergteboog NW→ZO, ~27°N/83°E met lichte
  // rotatie. Mount Everest: nieuw type 'berg' met shape: 'peak' — rendert als
  // rood-bruine driehoek (zie PEAK_* stijlen in index.html).
  { name: 'Himalaya',       lat: 29.00, lon: 83.00, kind: 'gebied', shape: 'fuzzy', rx: 12.00, ry: 2.20, rot: -20, sets: [85], aliases: ['Himalaja', 'Himālaya'] },
  { name: 'Mount Everest',  lat: 27.99, lon: 86.93, kind: 'berg',   shape: 'peak',  size: 1.2, sets: [85], aliases: ['Everest', 'Sagarmāthā', 'Chomolungma'] },
  // ── Set 86: Gebieden van Oost-Azië (8.6) ────────────────────────────────────
  // Tibet: hoogplateau in SW-China, ~28°N..36°N, 82°E..98°E. rx=8, ry=3.5.
  // Gobi: woestijn Mongolië+Noord-China, ~39°N..48°N, 90°E..115°E. rx=12, ry=3.5.
  // Siberië: enorme noordelijke regio, ~52°N..72°N, 65°E..165°E. rx=35, ry=8.
  { name: 'Tibet',    lat: 31.50, lon:  89.00, kind: 'gebied', shape: 'fuzzy', rx:  8.00, ry: 3.50, sets: [86], aliases: ['Xizang', 'Bod'] },
  { name: 'Gobi',     lat: 43.00, lon: 103.00, kind: 'gebied', shape: 'fuzzy', rx: 12.00, ry: 3.50, sets: [86], aliases: ['Gobi-woestijn', 'Gobi Desert'] },
  { name: 'Siberië',  lat: 62.00, lon: 100.00, kind: 'gebied', shape: 'fuzzy', rx: 35.00, ry: 9.00, sets: [86], aliases: ['Siberia', 'Sibir'] },
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
   // Set 7.7: Oost-Europa — 4 fases: landen, steden, gebergten, wateren.
   // Grotere klikdrempels (100/300) omdat de schaal van Oost-Europa veel groter
   // is dan Italië/Midden-Europa (vgl. 5.8 Onze buren, ook 100/300).
   77: { name: '7.7 – Oost-Europa', group: 7, mastery: 1,
         bounds: [[40, 14], [67, 50]],
         clickCorrectKm: 100, clickCloseKm: 300,
         phases: [
           { id: 'countries', label: 'Landen',    quizType: 'country'  },
           { id: 'cities',    label: 'Steden',    quizType: 'place'    },
           { id: 'mountains', label: 'Gebergten', quizType: 'province' },
           { id: 'waters',    label: 'Wateren',   quizType: 'water'    },
         ] },
   // Set 7.8: Noord-Europa — Scandinavië en de Baltische regio.
   // Bounds omvatten Noord-Noorwegen (Hammerfest ~71°N) en Denemarken (~54°N),
   // en van IJslandzee/Groenlandzee (-5°E) tot Barentszzee (40°E).
   78: { name: '7.8 – Noord-Europa', group: 7, mastery: 1,
         bounds: [[54, -5], [72, 40]],
         clickCorrectKm: 100, clickCloseKm: 300,
         phases: [
           { id: 'countries', label: 'Landen',   quizType: 'country'  },
           { id: 'cities',    label: 'Steden',   quizType: 'place'    },
           { id: 'regions',   label: 'Gebieden', quizType: 'province' },
           { id: 'waters',    label: 'Wateren',  quizType: 'water'    },
         ] },
   // Set 7.9: Zuidoost-Europa — Balkan + Turkije + Griekenland + Cyprus.
   79: { name: '7.9 – Zuidoost-Europa', group: 7, mastery: 1,
         bounds: [[34, 13], [49, 45]],
         clickCorrectKm: 100, clickCloseKm: 300,
         phases: [
           { id: 'countries', label: 'Landen',   quizType: 'country'  },
           { id: 'cities',    label: 'Steden',   quizType: 'place'    },
           { id: 'regions',   label: 'Gebieden', quizType: 'province' },
           { id: 'waters',    label: 'Wateren',  quizType: 'water'    },
         ] },
   // Set 8.1: Zuid-Amerika — 11 landen, 19 steden, 2 gebieden (Andes + Vuurland), 1 rivier (Amazone).
   // Continentale schaal → ruimere klikdrempels dan EU-sets (150/400 i.p.v. 100/300).
   // Bounds ruim om het hele continent (incl. Caribische kust Venezuela/Colombia
   // en Kaap Hoorn) prominent in beeld te laten komen op mobiel én desktop.
   81: { name: '8.1 – Zuid-Amerika', group: 8, mastery: 1,
         bounds: [[-58, -85], [15, -32]],
         // Continent-zoom: span ~73° lat × 53° lon. Europese sets bij 29° span
         // gebruiken 100/300; schaal proportioneel + marge voor cities die
         // nauwelijks een pixel zijn.
         clickCorrectKm: 250, clickCloseKm: 700,
         phases: [
           { id: 'countries', label: 'Landen',   quizType: 'country'  },
           { id: 'cities',    label: 'Steden',   quizType: 'place'    },
           { id: 'regions',   label: 'Gebieden', quizType: 'province' },
           { id: 'waters',    label: 'Wateren',  quizType: 'water'    },
         ] },
   // ── Set 82: Afrika (8.2) — continent, 13 landen, 15 steden, 3 gebieden, 7 wateren ─
   // Bounds sluiten Kaap Verdische Eilanden, Somalië, Kaap de Goede Hoop en de
   // Middellandse Zee in. Klikdrempels 250/700 conform 8.1 (vergelijkbare continent-zoom).
   82: { name: '8.2 – Afrika', group: 8, mastery: 1,
         bounds: [[-36, -20], [38, 55]],
         clickCorrectKm: 250, clickCloseKm: 700,
         phases: [
           { id: 'countries', label: 'Landen',   quizType: 'country'  },
           { id: 'cities',    label: 'Steden',   quizType: 'place'    },
           { id: 'regions',   label: 'Gebieden', quizType: 'province' },
           { id: 'waters',    label: 'Wateren',  quizType: 'water'    },
         ] },
   // ── Set 83: Noord- en Midden-Amerika (8.3) — 7 landen, 17 steden, 7 gebieden, 4 wateren ─
   // Bounds ruim genoeg voor volledige Aleoeten (tot -172°W) én Groenland-
   // noordkaap (tot 83.6°N). Eerder [[5,-170],[75,-10]] sneed beide af.
   // Panama (~5°N) is de zuidgrens. Klikdrempels 250/700 conform 8.1/8.2.
   83: { name: '8.3 – Noord- en Midden-Amerika', group: 8, mastery: 1,
         bounds: [[5, -175], [85, -10]],
         clickCorrectKm: 250, clickCloseKm: 700,
         phases: [
           { id: 'countries', label: 'Landen',   quizType: 'country'  },
           { id: 'cities',    label: 'Steden',   quizType: 'place'    },
           { id: 'regions',   label: 'Gebieden', quizType: 'province' },
           { id: 'waters',    label: 'Wateren',  quizType: 'water'    },
         ] },
   // ── Set 84: Midden-Oosten (8.4) — 13 landen, 13 steden, 8 wateren ─────────
   // Opdrachtblad: geen gebieden-fase (afwijking van 8.1/8.2/8.3).
   // Bounds ruim: Jemen zuid (~12°N) tot Georgië/Kaspische Zee noord (~47°N);
   // Middellandse Zee west (~22°E) tot Iran oost (~65°E).
   // Klikdrempels 250/700 conform 8.1/8.2/8.3.
   84: { name: '8.4 – Midden-Oosten', group: 8, mastery: 1,
         bounds: [[10, 22], [47, 65]],
         clickCorrectKm: 250, clickCloseKm: 700,
         phases: [
           { id: 'countries', label: 'Landen',  quizType: 'country' },
           { id: 'cities',    label: 'Steden',  quizType: 'place'   },
           { id: 'waters',    label: 'Wateren', quizType: 'water'   },
         ] },
   // ── Set 85: Zuid-Azië (8.5) — 8 landen, 12 steden, 2 gebieden, 5 wateren ──
   // Gebieden-fase bevat Himalaya (fuzzy) + Mount Everest (nieuw shape 'peak',
   // driehoek-marker in rood-bruin). Bounds: Sri Lanka zuid (~5°N) tot
   // Kazachstan noord (~56°N); Arabische Zee west (~55°E) tot Bangladesh oost
   // (~95°E). Klikdrempels 250/700 conform 8.1–8.4.
   85: { name: '8.5 – Zuid-Azië', group: 8, mastery: 1,
         bounds: [[5, 55], [56, 95]],
         clickCorrectKm: 250, clickCloseKm: 700,
         phases: [
           { id: 'countries', label: 'Landen',   quizType: 'country'  },
           { id: 'cities',    label: 'Steden',   quizType: 'place'    },
           { id: 'regions',   label: 'Gebieden', quizType: 'province' },
           { id: 'waters',    label: 'Wateren',  quizType: 'water'    },
         ] },
   // ── Set 86: Oost-Azië (8.6) — 7 landen, 14 steden, 3 gebieden, 4 wateren ──
   // Rusland volledig (ook Kaliningrad), ondanks dat viewport-bounds westelijk
   // afkappen. Bounds: kern Oost-Azië (Taiwan zuid ~18°N tot zuid-Siberië ~55°N;
   // west-China ~95°E tot Japan oost ~150°E). Rusland strekt verder uit maar
   // feature-centrering neemt over zodra Rusland de vraag is. Klikdrempels
   // 250/700 conform 8.1–8.5.
   86: { name: '8.6 – Oost-Azië', group: 8, mastery: 1,
         bounds: [[18, 95], [55, 150]],
         clickCorrectKm: 250, clickCloseKm: 700,
         phases: [
           { id: 'countries', label: 'Landen',   quizType: 'country'  },
           { id: 'cities',    label: 'Steden',   quizType: 'place'    },
           { id: 'regions',   label: 'Gebieden', quizType: 'province' },
           { id: 'waters',    label: 'Wateren',  quizType: 'water'    },
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

# Topografie Quiz

Een topografie-oefentool voor groep 5, gebaseerd op de Geobas-methode. Kinderen leren plaatsen en provincies via meerkeuze of zelf typen, met spaced repetition.

**Live:** open `index.html` in een browser — geen buildstap, geen server vereist.

---

## Projectstructuur

| Bestand | Inhoud |
|---------|--------|
| `index.html` | Volledige app: HTML, CSS, JavaScript |
| `cities.js` | Alle plaatsdata, set-definities, provinciedata |

---

## Een nieuw level toevoegen

### 1. Plaatsen toevoegen aan `cities.js`

Voeg elke nieuwe plaats toe aan `ALL_CITIES`:

```js
{ name: "Plaatsnaam", lat: 52.12, lon: 4.56, pop: 75000, sets: [66] }
```

| Veld | Verplicht | Uitleg |
|------|-----------|--------|
| `name` | ✓ | Officiële naam (wordt getoond en gecontroleerd) |
| `lat` / `lon` | ✓ | WGS84-coördinaten |
| `pop` | ✓ | Bevolking (CBS 2023); bepaalt de stipgrootte (logaritmisch, 4–12px) |
| `sets` | ✓ | Array van set-nummers; een plaats kan in meerdere sets zitten |
| `capital` | | `true` voor provinciehoofdsteden (vierkante marker) |
| `aliases` | | Alternatieve spellingen die als goed worden geaccepteerd |

Als een plaats al bestaat (bijv. Zwolle in set 56), voeg dan alleen het nieuwe setnummer toe aan het bestaande `sets`-array.

### 2. De set registreren in `SETS`

```js
const SETS = {
  // ... bestaande sets ...
  67: { name: '6.7 – Noord-Holland', quizType: 'place', fitOnStart: true },
};
```

| Veld | Uitleg |
|------|--------|
| `name` | Weergavenaam in het menu |
| `quizType` | `'place'` (stippen op kaart) of `'province'` (provincievlakken) |
| `fitOnStart` | `true` = zoom in op de actieve plaatsen; `false` = heel Nederland |

**Set-nummering** volgt de Geobas-hoofdstuknummers: 54 → 5.4, 61 → 6.1, enz. Gehele getallen sorteren automatisch in de juiste volgorde in het menu.

---

## Quiztypes

### `place` (standaard)
Elke stad krijgt een stip op de kaart. Provinciehoofdsteden (`capital: true`) krijgen een vierkante marker in plaats van een cirkel.

### `province`
Provincievlakken worden gekleurd vanuit een GeoJSON-bestand van [cartomap.github.io](https://cartomap.github.io/nl/wgs84/provincie_2023.geojson). De vlakken worden vergeleken op `statnaam`; zorg dat `ALL_PROVINCES[].name` exact overeenkomt. Dit type gebruikt `ALL_PROVINCES` als `activeCities` in plaats van `ALL_CITIES`.

---

## Spaced repetition

- **Meerkeuze:** een plaats is geleerd na 3× correct (`MASTERY_MC = 3`)
- **Typen:** na 1× correct (`MASTERY_TEXT = 1`)
- Elke fout reset de streak naar 0
- Plaatsen dichterbij de huidige vraag worden vaker als afleider gekozen (`nearbyDistractors`)

---

## Fuzzy matching (typmodus)

Antwoorden worden genormaliseerd (lowercase, spaties/koppeltekens verwijderd) en vergeleken via Levenshtein-afstand:

| Naamlengte | Max. typefouten |
|------------|----------------|
| ≤ 4 tekens | 0 |
| 5–8 tekens | 1 |
| ≥ 9 tekens | 2 |

Bij een typefouten-match krijgt de leerling de melding "Bijna!" maar telt het wel als goed.

---

## Navigatie & voortgang

De app gebruikt de History API (`pushState`/`popstate`) zodat de browserterugknop werkt. Voortgang per level+modus wordt opgeslagen in `sessionStorage` en automatisch hersteld bij terugnavigeren. Voortgang wordt gewist zodra een quiz volledig is afgerond.

---

## Feedback

Feedback van gebruikers gaat via een ingebouwd formulier naar Google Sheets (Google Forms endpoint). Issues worden bijgehouden op [GitHub](https://github.com/jelmerkk/topoquiz/issues).

# Manual test-script

Handmatig doorlopen vóór elke staging→main release. Dekt wat unit + Playwright
niet zien: visuele styling, animaties, kaart-zoom, PWA-gedrag, audio/haptics,
storage-persistentie en cross-device quirks.

Tijdsindicatie: **10 min voor een patch**, **20 min voor een minor**.

## Minimum-doorloop (elk release-type)

### 1. Home (start-scherm)

- [ ] Title "TOPOGRAFIE QUIZ" + kaart-emoji zichtbaar (emoji verdwijnt ≤480px).
- [ ] XP-card rechts in header: "NIVEAU 1" + "340 / 500" hebben duidelijke gap
      (niet tegen elkaar plakken). Mobile + desktop.
- [ ] Groep-select (5/6/7/8): actieve knop rood, andere paper. Wissel werkt.
- [ ] Daily-knop (groene accent) bovenaan de set-lijst, Bonus-knop (geel)
      eronder. Beide tonen groep-specifieke titel.
- [ ] Hamburger-menu (rechtsboven): open/close werkt, items klikbaar.
- [ ] Install-prompt verschijnt op Chrome Android / Safari iOS (A2HS).

### 2. Set 5.4 – Provincies (simpleSet + polygon)

- [ ] Opstart toont NL-overzicht (NIET ingezoomd op één provincie).
- [ ] Huidige provincie oranje (highlight).
- [ ] 1× correct antwoord → provincie direct groen (#58CC02), `x/12 geleerd`
      teller +1. **Regressie-gevoelig (v2.25.2).**
- [ ] 1× fout → provincie blijft oranje, streak reset.
- [ ] Eindscherm toont aantal meteen-goed + retry-knop.

### 3. Set 5.7 – Wateren (simpleSet + line/polygon)

- [ ] Opstart: NL-overzicht, geen water zichtbaar (hidden tot je er een raadt).
- [ ] Huidige water blauw-highlight.
- [ ] 1× correct → water blijft zichtbaar in groen.
- [ ] Niet-geraden wateren blijven verborgen tot ze aan de beurt komen.

### 4. Set 5.8 – Onze buren (phasedSet, 2 fases)

- [ ] Fase 1: landen. Bounds zoomen in op Europa.
- [ ] Fase-label in scoreboard toont "Landen".
- [ ] Na laatste land-vraag overgang naar fase 2 (hoofdsteden).
- [ ] Fase-label update naar "Hoofdsteden".

### 5. Daily Challenge (SETS[98])

- [ ] Groep-specifieke mix (groep 5: 3 prov + 5 steden + 2 wateren;
      groep 7: 2 landen + 4 steden + 2 regio's + 1 gebergte + 1 water).
- [ ] **Per-vraag zoom**: kaart flyTo naar elk item, geen initial NL-overview.
- [ ] Na 10 vragen: emoji-grid + share-knop + "volgende dagelijkse uitdaging".
- [ ] Zelfde dag opnieuw openen → done-state, niet opnieuw speelbaar.
- [ ] Ander tijdzone / datum mockup (via `?date=YYYY-MM-DD`): nieuwe pool.

### 6. Bonus (SETS[99])

- [ ] Groep-specifieke omvang (5: 20 / 6: 25 / 7: 35 / 8: 40 items).
- [ ] Mix klopt met `BONUS_FORMAT[group]`.
- [ ] Per-vraag zoom cap op zoom 8 (geen hoppy-zoom).

### 7. Modi

- [ ] **MC**: 4 opties, correct groen, wrong rood, klik-disable alle.
- [ ] **Text**: typen + Enter, "close" match (1 letter off) → fb-close stijl.
- [ ] **Map**: klik-op-kaart, distance-based correct/close/wrong markers.

## Bij minor-release (extra)

### 8. Persistentie

- [ ] Verlaat quiz mid-sessie → terugkomen: progress hersteld (streak,
      masteredCount, juiste vraag-nummer).
- [ ] Daily afronden → reload pagina: done-state blijft.
- [ ] Groep wisselen → daily/bonus toont nieuwe groep-pool.

### 9. PWA & offline

- [ ] Eerste bezoek: SW installeert (DevTools → Application → Service Workers).
- [ ] Network offline → reload: app laadt, alle 7 sets speelbaar.
- [ ] SW cache-versie (`topoquiz-vX.Y.Z`) bump bij elke release, oude cache
      wordt geëvinceerd op activate.

### 10. Feedback-modal

- [ ] Hamburger → "Feedback geven": modal opent met level+modus+versie.
- [ ] Verzenden opent mail-client met pre-filled body.
- [ ] Close werkt via X-knop + ESC + backdrop-klik.

### 11. Hamburger-items

- [ ] Terug naar home, settings-stub, dev-menu (localhost only),
      install-PWA-btn (als A2HS beschikbaar).

## Bij major-release (extra)

### 12. Cross-device

- [ ] iPhone Safari (portrait + landscape).
- [ ] Android Chrome.
- [ ] iPad (tablet-breakpoint ≥768px).
- [ ] Desktop 1280+ (evt. dashboard-layout #106).

### 13. Performance

- [ ] Lighthouse: Performance ≥90, Accessibility ≥90, PWA ≥90.
- [ ] Kaart-tegelcache werkt (geen herlaad bij zoom/pan).

### 14. Alle 30+ sets één vraag spelen

- [ ] 5.x, 6.x, 7.1 t/m 7.x, 8.1 t/m 8.9 — elke set startet zonder console-
      error, toont de juiste quiz-type, MC-opties verschijnen.

---

Bijwerken zodra er een nieuwe set, feature of regressie-klasse bij komt.
Issue #118 voor wijzigingsverzoeken.

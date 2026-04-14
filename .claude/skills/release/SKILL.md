---
name: release
description: >
  Gebruik deze skill om een voltooide feature of bugfix op de `dev` branch van topoquiz
  live te krijgen: versie-bump, README, tests, commit, merge-naar-dev, issue sluiten en
  GitHub release. Triggers: "release", "uitrollen", "afronden", "merge naar dev",
  "feature afronden", "/release", "klaar voor merge", "live zetten".
  Voert het volledige ritueel uit in de juiste volgorde — niets overslaan.
---

# Release skill voor topoquiz

Volledig afrondingsritueel voor een feature of bugfix. Loopt stap voor stap; elke stap is een blocker voor de volgende.

## Wanneer inzetten

- Gebruiker zegt "afronden", "release", "merge dit naar dev", of `/release`.
- Een feature/fix is inhoudelijk klaar, tests bestaan, code werkt lokaal.
- Er is een GitHub issue-nummer dat hierbij hoort (bijna altijd — zo niet, vraag erom).

## Wat je nodig hebt vóór je start

Vraag de gebruiker (in één bericht) als dit nog niet duidelijk is:
1. **Issue-nummer** (bijv. `#42`). Zonder issue: vraag of we er een moeten aanmaken of release-notes zonder issue-link willen.
2. **Type bump**: `patch` (bugfix), `minor` (feature), of `major` (breaking). Bij twijfel: default `patch` voor fixes, `minor` voor nieuwe user-facing functionaliteit.
3. **Eén-zin release-note** voor de GitHub release body.

## De 10 stappen

Voer uit in deze volgorde. Stop en rapporteer als een stap faalt — nooit een stap overslaan met een workaround.

### 1. Branch-status controleren
```bash
git status && git branch --show-current
```
- Moet op een feature-branch of op `dev` staan. Nooit `staging` of `main`.
- Working tree moet clean zijn (uncommitted changes kunnen OK zijn als ze bij de release horen; toon ze aan de gebruiker voor bevestiging).

### 2. Huidige versie lezen
Lees `index.html` voor de huidige waarden:
- `<meta name="version" content="x.y.z">` (~regel 8)
- `const APP_VERSION = 'vx.y.z'` (~regel 1868)

Bepaal de nieuwe versie via semver (patch/minor/major uit stap 0).

### 3. Versie-bump in `index.html`
Update **beide** plekken met de nieuwe versie. Ze moeten synchroon blijven. Gebruik Edit, niet zoek-en-vervang van hand.

### 4. README bijwerken
Als de release user-facing functionaliteit toevoegt: beschrijf de feature in `README.md` (bijv. nieuwe set onder "Projectstructuur" of "Een nieuw level toevoegen"). Puur technische fixes hoeven vaak geen README-update — laat het aan de gebruiker voorleggen als je twijfelt.

### 5. `npm test` draaien — BLOCKER
```bash
npm test
```
Moet volledig groen zijn (unit + Playwright). Bij falen: **stop**, rapporteer aan de gebruiker, verwerk geen workarounds. Geen uitzonderingen, ook niet voor "alleen een CSS-fix".

### 6. Commit
```bash
git add -- index.html README.md <overige bestanden>
git commit -m "$(cat <<'EOF'
<type>(#<issue>): <korte omschrijving>

<optionele uitleg van wat en waarom — Engels>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```
Commit-berichten in het **Engels**. `<type>` = `feat`, `fix`, `refactor`, `docs`, etc. (conventional-commits-stijl). Geen `git add -A`/`git add .` — expliciet de bestanden noemen.

### 7. Push + Cloudflare preview
```bash
git push
```
Als op feature-branch: `git push -u origin feature/xxx`. Wacht op gebruikersakkoord via de Cloudflare preview-URL vóór stap 8. Voor een kleine bugfix direct op `dev`: preview-stap is optioneel, vraag de gebruiker.

### 8. Merge naar `dev` (alleen als vanaf feature-branch)
```bash
git checkout dev
git merge feature/xxx --no-ff
git push
```
Geen `gh pr create` — de gebruiker wil geen PR-workflow. Direct mergen na preview-goedkeuring.

### 9. GitHub issue sluiten
```bash
gh issue close <nr> --comment "Fixed in vX.Y.Z — <korte uitleg>"
```
- Altijd een oplossings-comment toevoegen vóór `close`.
- Issue-body **nooit** bewerken — alleen comments.

### 10. GitHub release
```bash
gh release create vX.Y.Z \
  --title "vX.Y.Z — <naam>" \
  --notes "$(cat <<'EOF'
<release-note uit stap 0>

Closes #<nr>.
EOF
)"
```

## Slot

Rapporteer aan de gebruiker:
- Nieuwe versie + korte samenvatting van wat er is uitgerold
- Link naar de release (`gh release view vX.Y.Z --web --json url`)
- Eventuele vervolgstappen (bijv. "nog niet naar staging gepusht — wacht op jouw akkoord")

## Hard no's

- **Nooit** `npm test` overslaan.
- **Nooit** direct naar `staging` of `main` pushen.
- **Nooit** `git add -A` of `git add .` — altijd expliciete bestanden.
- **Nooit** issue-body overschrijven.
- **Nooit** `--no-verify` of `--no-gpg-sign` op `git commit`.
- **Nooit** `gh pr create` — geen PR-workflow in dit project.

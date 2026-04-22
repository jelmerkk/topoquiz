---
name: release
description: >
  Gebruik deze skill om een voltooide feature of bugfix op de `dev` branch van topoquiz
  live te krijgen: versie-bump, README, tests, commit, merge-naar-dev, issue sluiten en
  Codeberg release. Triggers: "release", "uitrollen", "afronden", "merge naar dev",
  "feature afronden", "/release", "klaar voor merge", "live zetten".
  Voert het volledige ritueel uit in de juiste volgorde — niets overslaan.
---

# Release skill voor topoquiz

Volledig afrondingsritueel voor een feature of bugfix. Loopt stap voor stap; elke stap is een blocker voor de volgende.

## Wanneer inzetten

- Gebruiker zegt "afronden", "release", "merge dit naar dev", of `/release`.
- Een feature/fix is inhoudelijk klaar, tests bestaan, code werkt lokaal.
- Er is een Codeberg issue-nummer dat hierbij hoort (bijna altijd — zo niet, vraag erom).

## Wat je nodig hebt vóór je start

Vraag de gebruiker (in één bericht) als dit nog niet duidelijk is:
1. **Issue-nummer** (bijv. `#42`). Zonder issue: vraag of we er een moeten aanmaken of release-notes zonder issue-link willen.
2. **Type bump**: `patch` (bugfix), `minor` (feature), of `major` (breaking). Bij twijfel: default `patch` voor fixes, `minor` voor nieuwe user-facing functionaliteit.
3. **Eén-zin release-note** voor de GitHub release body.

## Het grote plaatje — dev → staging → main

Standaardflow (de normale modus):

```
feature branch (optioneel) ─▶ dev ─▶ (CF preview + user-akkoord) ─▶ staging ─▶ (CI groen) ─▶ main ─▶ prod
                                                                       │
                                                                       └─▶ release aanmaken ─▶ issue sluiten
```

- **Jij werkt op `dev`** (of een feature-branch die naar `dev` mergt). Elke push triggert een Cloudflare Pages preview.
- **De gebruiker test functioneel** op de dev-preview en geeft **expliciet groen licht** om de pipeline af te trappen.
- **Dan pas merge je `dev` → `staging`.** Die push triggert `.forgejo/workflows/e2e.yml` op Codeberg: tests draaien, en bij succes wordt `staging` naar `main` gemerged en gerynct naar Uberspace.
- **Verifieer dat de pipeline groen is** (`./scripts/forgejo-run-watch.sh staging`). Rood = stop, onderzoek, niet doorrollen.
- **Pas als de pipeline groen is**: Codeberg release aanmaken en het issue sluiten met een verwijzing naar de versie.
- **Nooit** een release of issue-sluit-comment plaatsen vóór de pipeline groen is — dan verwijs je naar iets wat nog niet in productie staat.

### Uitzondering: dev als feature-branch (Geobas 7/8 — tot en met set 7.3)

Tijdens de ontwikkeling van Geobas-7.3 (en eerder 7.2) is `dev` tijdelijk gebruikt als **langdurige feature-branch**: we pushen alleen naar `origin/dev` voor de CF-preview en slaan staging/main/release volledig over totdat de gebruiker een milestone-akkoord geeft. Deze uitzondering **stopt na set 7.3**. Vanaf set 7.4 volgen we weer de normale flow hierboven: elke feature-afronding = echte release naar productie.

Als je twijfelt of we nog in de uitzondering zitten: vraag de gebruiker. Bij een reguliere release na de uitzondering: gewoon stap 1–11 hieronder volgen.

## De stappen

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

### 5. Unit tests draaien — BLOCKER
```bash
node test.mjs
```
Moet volledig groen zijn. Bij falen: **stop**, rapporteer aan de gebruiker, verwerk geen workarounds.

**Niet** `npm test` lokaal draaien — die draait ook de Playwright-suite (minuten) en is dan een duplicaat van wat `.forgejo/workflows/e2e.yml` toch al doet zodra je naar `staging` pusht. De pipeline is de waarheid voor end-to-end; lokaal snel je unit-tests checken is genoeg.

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

### 8. Merge feature-branch naar `dev` (alleen als je op feature-branch zat)
```bash
git checkout dev
git merge feature/xxx --no-ff
git push
```
Geen `tea pr create` — de gebruiker wil geen PR-workflow. Direct mergen na preview-goedkeuring.

### 9. Wacht op functioneel groen licht voor de staging-push

**Dit is de gate tussen dev en productie.** Pas als de gebruiker expliciet zegt "ga maar door" / "push naar staging" / "trek de pipeline" mag stap 10 worden uitgevoerd. Niet raden.

Tijdens de Geobas-7/8 uitzondering (t/m 7.3) **stopt** de skill hier: geen staging-push, geen release, geen issue-close. Rapporteer dat dev gesynct is en wacht op het milestone-akkoord van de gebruiker.

### 10. Merge `dev` → `staging` en verifieer de pipeline
```bash
git checkout staging
git merge dev --no-ff
git push origin staging
git checkout dev
```
De push naar `staging` triggert `.forgejo/workflows/e2e.yml` op Codeberg: unit + Playwright + rsync-deploy. Verifieer:
```bash
./scripts/forgejo-run-watch.sh staging
```
Het script polt de Forgejo Actions API tot de laatste run op de branch klaar is, exit 0 = success, exit 1 = failure, exit 2 = API/timeout. Vereist `CODEBERG_TOKEN` env-var (PAT met `read:repository`).

- **Groen** (exit 0) → door naar stap 11.
- **Rood** (exit 1) → **stop**. Open de run op `https://codeberg.org/jelmerk/topoquiz/actions`, rapporteer welke job faalde, onderzoek de oorzaak, fix op `dev`, herhaal stap 5–10. Nooit rood negeren; nooit met `workflow_dispatch` handmatig forceren.
- **Script draait nog** → wacht af, het blokkeert tot de run klaar is.

### 11. Codeberg release + issue sluiten (alleen na groene pipeline)
```bash
tea release create --repo jelmerk/topoquiz \
  --tag vX.Y.Z \
  --title "vX.Y.Z — <naam>" \
  --note "$(cat <<'EOF'
<release-note uit stap 0>

Closes #<nr>.
EOF
)"

tea issue close <nr> --repo jelmerk/topoquiz \
  --comment "Fixed in vX.Y.Z — <korte uitleg>"
```
- **Release eerst, dan issue sluiten** — zodat het close-comment naar een bestaande release kan verwijzen.
- Altijd een oplossings-comment toevoegen vóór `close`.
- Issue-body **nooit** bewerken — alleen comments.
- `tea` gebruikt de login uit `tea login add --name codeberg …` (Fase 0 install). Als `tea` niet bestaat: `brew install tea`.

## Slot

Rapporteer aan de gebruiker:
- Nieuwe versie + korte samenvatting van wat er is uitgerold
- Link naar de release (`https://codeberg.org/jelmerk/topoquiz/releases/tag/vX.Y.Z`)
- Status van de pipeline (groen, URL naar de run op `https://codeberg.org/jelmerk/topoquiz/actions`)
- Als we in de Geobas-uitzondering zaten: expliciet vermelden dat staging/release overgeslagen is en wat er nog wacht op milestone-akkoord.

## Hard no's

- **Nooit** `npm test` overslaan.
- **Nooit** direct naar `staging` of `main` pushen.
- **Nooit** `git add -A` of `git add .` — altijd expliciete bestanden.
- **Nooit** issue-body overschrijven.
- **Nooit** `--no-verify` of `--no-gpg-sign` op `git commit`.
- **Nooit** `tea pr create` — geen PR-workflow in dit project.

# CLAUDE.md

Projectspecifieke werkafspraken voor Claude. Voor architectuur, datastructuren en quiz-mechanica: zie [README.md](README.md).

## Werktaal
- Commits: **Engels**
- Code-comments: **Nederlands** (past bij de app-taal)
- Chat: volg de taal van de gebruiker

Elke commit eindigt met: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

## Branch-strategie
- `dev` — **default werkbranch**. Elke push krijgt een CF-preview. Alle nieuwe features en fixes gaan hier direct heen, tenzij user expliciet om een feature-branch vraagt.
- `feature/*` — **uitzondering, niet de regel**. Alleen gebruiken als:
  - de gebruiker er expliciet om vraagt, **of**
  - er meerdere parallele lijnen tegelijk moeten leven (zeldzaam in dit solo-dev project).

  Bij twijfel: push naar `dev`. De CF-preview op de dev-URL is genoeg voor visuele verificatie vóór de staging-push.
- `staging` — CI gate. Push naar staging triggert E2E + rsync-deploy naar main → productie.
- `main` — productie. Nooit direct op committen.

**Regels:**
- NOOIT direct op `staging` of `main` committen of pushen.
- Geen GitHub PRs aanmaken — de gebruiker reviewt via Cloudflare preview en geeft mondeling akkoord vóór staging-push.
- Risicovolle acties (force push, reset --hard, merge naar staging/main) altijd eerst vragen.

## Deploy
`.github/workflows/e2e.yml` runt op push naar `staging`: tests → merge staging→main → rsync naar Uberspace (kochab). De rsync-include is een allow-list: elk nieuw top-level bestand dat live moet gaan (bijv. een nieuwe `*.geojson`) moet handmatig aan `switches:` worden toegevoegd, anders wordt het stilzwijgend overgeslagen.

## Verplichte checks vóór commit/push
1. **`npm test`** moet groen zijn (unit + Playwright). Geen uitzonderingen, ook niet voor CSS-only fixes.
2. **Versie ophogen** bij elke feature of bugfix:
   - `<meta name="version" content="x.y.z">` (regel ~8 in `index.html`)
   - `const APP_VERSION = 'vx.y.z'` (regel ~1868 in `index.html`)
   - Semver: patch = bugfix, minor = feature.
3. **README bijwerken** als de feature nieuwe user-facing functionaliteit toevoegt.

## Na merge naar `dev`
1. GitHub issue sluiten met verwijzing naar de versie:
   `gh issue close <nr> --comment "Fixed in vX.Y.Z"`
2. GitHub release aanmaken:
   `gh release create vX.Y.Z --title "..." --notes "..."`
3. Issue-body **nooit** bewerken — alleen comments toevoegen.

## TDD
Test-first, zonder uitzonderingen:
1. Schrijf de falende test (unit in `test.mjs`, of E2E in `tests/*.spec.js`). Verifieer dat hij rood is.
2. Schrijf minimale implementatie tot groen.
3. Refactor met groene tests als vangnet.

Rode tests door ontbrekende toekomstige features zijn OK — niet met workarounds groen maken.

## Projectstructuur — snelkoppelingen
| Wat | Waar |
|---|---|
| Alle app-code | `index.html` (monoliet — HTML+CSS+JS) |
| Data (cities, sets, provincies, wateren, landen) | `cities.js` |
| Kaartdata | `provincie_2023.geojson`, `wateren.geojson`, `gewesten.geojson`, `landen-europa.geojson` |
| OSM fetch-pipelines | `data/fetch-*.js` (rate-limited Overpass) + `data/process-*.js` (chain + RDP) |
| Unit tests | `test.mjs` |
| E2E tests | `tests/*.spec.js` |
| Deploy-workflow | `.github/workflows/e2e.yml` |

## Links
- Productie: https://www.topoquiz.com/
- Repo: https://github.com/jelmerkk/topoquiz
- Issues: `gh api repos/jelmerkk/topoquiz/issues`

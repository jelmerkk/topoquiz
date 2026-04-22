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
- Geen Codeberg PRs aanmaken — de gebruiker reviewt via Cloudflare preview en geeft mondeling akkoord vóór staging-push.
- Risicovolle acties (force push, reset --hard, merge naar staging/main) altijd eerst vragen.

## Deploy
`.forgejo/workflows/e2e.yml` runt op push naar `staging` (via Forgejo Actions op Codeberg): tests → merge staging→main → rsync naar Uberspace (kochab) → `wrangler pages deploy` naar CF Pages main. De rsync-include is een allow-list: elk nieuw top-level bestand dat live moet gaan (bijv. een nieuwe `*.geojson`) moet handmatig aan de `--include=` regels worden toegevoegd, anders wordt het stilzwijgend overgeslagen. `.forgejo/workflows/dev-preview.yml` triggert op push naar `dev` en doet alleen een CF Pages preview-deploy.

## Verplichte checks vóór commit/push
1. **`npm test`** moet groen zijn (unit + Playwright). Geen uitzonderingen, ook niet voor CSS-only fixes.
2. **Versie ophogen** bij elke feature of bugfix:
   - `<meta name="version" content="x.y.z">` (regel ~8 in `index.html`)
   - `const APP_VERSION = 'vx.y.z'` (regel ~1868 in `index.html`)
   - Semver: patch = bugfix, minor = feature.
3. **README bijwerken** als de feature nieuwe user-facing functionaliteit toevoegt.

## Na merge naar `dev`
1. Codeberg issue sluiten met verwijzing naar de versie:
   `tea issue close <nr> --repo jelmerk/topoquiz --comment "Fixed in vX.Y.Z"`
2. Codeberg release aanmaken:
   `tea release create --repo jelmerk/topoquiz --tag vX.Y.Z --title "..." --note "..."`
3. Issue-body **nooit** bewerken — alleen comments toevoegen.

## Issue-hygiëne

Drie labels onderscheiden soort werk. Elke nieuwe issue krijgt er één toegewezen (of geen, bij concrete actionable tickets).

| Label | Betekenis | Voorbeeld |
|---|---|---|
| `tracker` | Umbrella/meta — geen directe code-actie, bundelt child-issues | #89 (design overhaul), #104 (features-umbrella) |
| `blocked` | Wacht op externe voorwaarde (lesmateriaal, scope-akkoord, ander issue) | #85, #107 |
| `future` | Memo/geparkeerd — geen commitment, niet oppakken tenzij user expliciet aftrapt | #108 |

**Regels:**
- Geen labels op concrete, direct-actionable tickets (bv. een bug of een feature die nu op de rol staat). Labels zijn er om *niet-actionable* werk te markeren.
- Parent/tracker-issues krijgen een comment met child-issues-status, **niet** een body-edit. Ververs die comment bij elke milestone.
- Blocked-issues krijgen een comment "Unblocked when: …" zodat de ontgrendel-voorwaarde expliciet in de timeline staat.
- Parent sluiten zodra alle children dicht zijn — ook als de parent tekstueel nog "algemener" is.
- Afgeronde refactor-takken sluiten met een verwijzing naar de versie + korte samenvatting van wat er leeft is gezet.

**Filter-queries die dit mogelijk maakt:**
- `tea issues --repo jelmerk/topoquiz --state open` → alle open issues (handmatig filteren op label/geen-label)
- `tea issues --repo jelmerk/topoquiz --labels tracker` → meta-overzicht
- `tea issues --repo jelmerk/topoquiz --labels blocked` → wat wacht waarop
- `tea issues --repo jelmerk/topoquiz --labels future` → ideeën-parkeerplaats

Voor "no:label"-filter (niet native in tea): gebruik de API direct:
```bash
curl -sH "Authorization: token $CODEBERG_TOKEN" \
  "https://codeberg.org/api/v1/repos/jelmerk/topoquiz/issues?state=open&type=issues" \
  | jq '.[] | select(.labels | length == 0) | {number, title}'
```

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
| Deploy-workflow | `.forgejo/workflows/e2e.yml` + `.forgejo/workflows/dev-preview.yml` |
| Pipeline-watcher | `scripts/forgejo-run-watch.sh` |

## Links
- Productie: https://www.topoquiz.com/
- Repo: https://codeberg.org/jelmerk/topoquiz
- Issues: `tea issues --repo jelmerk/topoquiz` of `curl -H "Authorization: token $CODEBERG_TOKEN" https://codeberg.org/api/v1/repos/jelmerk/topoquiz/issues`

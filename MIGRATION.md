# GitHub → Codeberg migratie (#83) — voortgang

Referentie: het volledige plan staat in
`~/.claude/plans/optimized-finding-taco.md`. Dit bestand is de
working-tracker: wat is af, wat staat open, hoe verder.

**Laatste update:** 2026-04-28 — Pre-cutover health-check uitgevoerd, alles aan Codeberg-zijde staat klaar voor cutover.

## Status per fase

| Fase | Status | Wat |
|---|---|---|
| 0 — Voorbereiding | ✅ klaar | Codeberg-account, PAT, CF API-token, repo aangemaakt |
| 1 — Forgejo runner | ✅ klaar | `argo-1` Idle op Codeberg via Ansible |
| 2 — Repo-import | ✅ klaar | 118 issues, 30 tags, nummers behouden |
| 3 — Workflow-rewrite | ✅ klaar | `.forgejo/workflows/e2e.yml` + `dev-preview.yml` (commit 8073536) |
| 4 — Skill + docs | ✅ klaar | `gh` → `tea`, `scripts/forgejo-run-watch.sh`, CLAUDE.md, README, package.json |
| 5 — Cutover | 🟡 prep groen | Pre-flight check OK; resterend: CF-disconnect + remote switch + push + GitHub-archive |
| 6 — Cleanup | ⏳ niet begonnen | Secrets opruimen, allowlist |

## Wat is werkend

- **Codeberg repo** bestaat: `https://codeberg.org/jelmerk/topoquiz` (leeg).
  Actions-unit enabled (`has_actions: true`).
- **Forgejo runner `argo-1`** draait op argo, status `Idle`. Image =
  `data.forgejo.org/forgejo/runner:12.9.0`, labels = `self-hosted`,
  `argo`, `docker`. Registreert via de v12 `server.connections`-flow
  (geen handmatige `register`-stap meer).
- **Ansible-config** voor de runner leeft in `~/Dev/ansible-docker`,
  uncommitted changes:
  - `compose/forgejo-runner/docker-compose.yml`
  - `compose/forgejo-runner/config.yml`
  - `ansible/inventory/group_vars/all.yml` (stack entry + stacks_config)
  - `ansible/inventory/group_vars/docker_hosts.yml` (vault: `FORGEJO_RUNNER_TOKEN`)
  - `ansible/roles/compose-stacks/tasks/main.yml` (token.txt-schrijftaak)
  - `docs/runbooks/forgejo-runner.md`

  **TODO vóór Fase 2:** deze bundelen in één commit op main, scope =
  "add forgejo-runner stack for Codeberg CI".

## Belangrijke leer-punten uit Fase 1

- Codeberg-username = **`jelmerk`** (één k), NIET `jelmerkk` zoals op
  GitHub. Alle plan-docs moeten hierop herschreven worden in Fase 2-4.
- Forgejo runner **v6 werkt niet** tegen Codeberg's huidige Forgejo —
  pin op v12.9.0 of nieuwer.
- `register` en `create-runner-file` subcommando's zijn **deprecated**
  in runner v12+. Enige werkende registratie-flow is
  config-based: `server.connections.codeberg` blok met UUID +
  `token_url` in `config.yml`, daemon zelf-registreert.
- Runner heeft `group_add: [${DOCKER_GID}]` in compose nodig om
  `/var/run/docker.sock` te kunnen lezen (runner draait non-root).
  Op argo = `988`.
- Label-syntax v12: `"self-hosted:host"` (geen args), `"docker:docker://node:20-bookworm"`.
  v5/v6 syntax (`host://-self-hosted`) gooit `malformed label` error.

## Fase 2 — Repo-import (volgende stap)

### 2.1 Install tea CLI lokaal

```bash
brew install tea
tea login add --name codeberg --url https://codeberg.org --token <CODEBERG_PAT>
```

PAT ophalen op `https://codeberg.org/user/settings/applications` —
scopes: `read:repository`, `write:repository`, `write:issue`,
`write:release`.

### 2.2 Migration via Codeberg UI

Op Codeberg: **+ → New Migration → Migrate From → GitHub**:
- Source URL: `https://github.com/jelmerkk/topoquiz`
- GitHub PAT (met `repo` read-scope)
- Aanvinken: Wiki, Issues, Pull Requests, Releases, Milestones, Labels
- Owner: `jelmerk`
- Repo name: `topoquiz` (repo bestaat al leeg — migration zou in
  dezelfde repo moeten landen; anders eerst verwijderen en opnieuw)

Wacht 1–5 min. Check:

```bash
tea issues --state all --repo jelmerk/topoquiz | wc -l   # verwacht ~120
tea releases --repo jelmerk/topoquiz                      # alle vX.Y.Z tags
```

### 2.3 Steekproef issue-nummers

Open `#80`, `#83`, `#95`, `#120` op Codeberg — moeten dezelfde nummers
hebben als op GitHub. Als niet: documenteer mapping onderaan dit
bestand, geen rollback.

### 2.4 Labels controleren

`tracker`, `blocked`, `future` — importer neemt ze meestal mee. Zo
niet, handmatig hercreëren via `tea labels create`.

### 2.5 Git remotes switchen

**LOKAAL NIET DOEN** tot cutover-weekend (Fase 5). Maak wel de
voorbereiding:

```bash
cd ~/Dev/topoquiz
git remote -v  # confirm origin = github
# LATER (Fase 5): rename + add codeberg
```

## Fase 3 — Workflow-rewrite (na Fase 2)

Bestanden nieuw op `dev`-branch (nog niet pushen naar main):

- `.forgejo/workflows/e2e.yml` — vervangt `.github/workflows/e2e.yml`.
  Base: `mcr.microsoft.com/playwright:v1.48.0-jammy` container.
  Steps: checkout (`https://code.forgejo.org/actions/checkout@v4`),
  node-setup, `npm ci`, tests, Playwright, ff-merge staging→main,
  rsync naar Uberspace, `wrangler pages deploy`.
- `.forgejo/workflows/dev-preview.yml` — vervangt CF-Pages
  git-integration. Triggert op push naar `dev`, draait enkel
  `wrangler pages deploy . --project-name=topoquiz --branch=dev`.

### Secrets om op Codeberg te zetten

Op `codeberg.org/jelmerk/topoquiz/settings/actions/secrets`:

- `UBERSPACE_SSH_KEY` — zelfde SSH private key als GitHub
- `CLOUDFLARE_API_TOKEN` — Fase 0 gegenereerd
- `CLOUDFLARE_ACCOUNT_ID` — uit CF dashboard

### Vars (repo-level, niet secrets)

- `UBERSPACE_SSH_HOST`, `UBERSPACE_SSH_USER`, `UBERSPACE_DEPLOY_PATH`

### Cloudflare Pages bootstrap

Eenmalig lokaal (eerste keer):

```bash
npx wrangler pages project create topoquiz --production-branch main
```

## Fase 4 — Skill + docs (✅ klaar)

Uitgevoerd op dev-branch (nog niet in productie tot cutover):

- ✅ `.claude/skills/release/SKILL.md` — `gh` → `tea`, `gh run watch` →
  `./scripts/forgejo-run-watch.sh staging`, workflow-pad `.github/` →
  `.forgejo/`, release/issue commands naar Codeberg-repo-slug `jelmerk/topoquiz`.
- ✅ `scripts/forgejo-run-watch.sh` — bash + curl + jq poller tegen
  `codeberg.org/api/v1/repos/jelmerk/topoquiz/actions/tasks`. Polt elke 15s,
  timeout 20 min, exit 0/1/2 voor success/failure/API-fout. Vereist
  `CODEBERG_TOKEN` env-var (PAT met `read:repository`).
- ✅ `CLAUDE.md` — alle `gh` commands → `tea` equivalenten, filter-queries
  met `tea issues --labels` + curl-fallback voor "no:label"-filter,
  repo-link → codeberg, workflow-pad + nieuwe watcher-script-regel in
  snelkoppelingen-tabel.
- ✅ `README.md` — "Issues op GitHub" → Codeberg, Deploy-sectie genoemd
  Forgejo Actions + `wrangler pages deploy`.
- ✅ `package.json` — `repository.url`, `bugs.url`, `homepage` → codeberg.

## Fase 5 — Cutover-weekend

### Pre-cutover health-check (2026-04-28, ✅ alles groen)

Geverifieerd vóór de cutover via `tea actions` + Codeberg API:

- **Repo-state:** `default_branch=dev`, `has_actions=true`, niet gearchiveerd, geen mirror, 10 open issues.
- **Secrets gezet** (4/4):
  `UBERSPACE_SSH_KEY`, `CODEBERG_PUSH_TOKEN`,
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- **Vars gezet** (3/3):
  `UBERSPACE_SSH_HOST=kochab.uberspace.de`,
  `UBERSPACE_SSH_USER=starbase`,
  `UBERSPACE_DEPLOY_PATH=/var/www/virtual/starbase/topoquiz.com`.
- **Runner argo-1:** status `idle`, image v12.9.0, labels `self-hosted, argo, docker`. User-scope.
- **Workflow-files:** `.forgejo/workflows/e2e.yml` + `dev-preview.yml` parsen, geen tabs.
- **`scripts/forgejo-run-watch.sh`:** `bash -n` OK, exit-bit gezet, dry-run polt elke 15s tegen Codeberg-API met tea-token.
- **Wrangler 4.86.0** lokaal geïnstalleerd (niet ingelogd — niet nodig, workflow gebruikt secret).
- **CF Pages-project `topoquiz`** bestaat al (huidige prod-host via GitHub git-integration). Cutover = git-integration loskoppelen, niet project recreaten.

### Volgorde

Strikt, elke stap blocker voor volgende:

1. ✅ Fase 0–4 af, Codeberg-secrets + vars staan, runner idle (geverifieerd).
2. CF-Pages git-integration **loskoppelen** in CF-dashboard (Settings →
   Builds & deployments → Disconnect). Project zelf blijft bestaan.
3. Lokale remote switchen:
   ```bash
   git remote rename origin github
   git remote add origin git@codeberg.org:jelmerk/topoquiz.git
   git fetch origin
   git branch --set-upstream-to=origin/dev dev
   git branch --set-upstream-to=origin/staging staging
   git branch --set-upstream-to=origin/main main
   ```
4. Push alle branches: `git push origin dev staging main` + `git push origin --tags`.
5. Push `dev` (no-op commit of bestaande HEAD) → eerste Forgejo pipeline-run, CF-preview werkt.
6. Push `staging` → full e2e + rsync + CF prod-deploy.
7. Groen? → GitHub-repo archiveren, README-forward committen.

## Fase 6 — Cleanup

- GitHub Actions secrets verwijderen.
- `.claude/settings.json` allowlist: `Bash(gh:*)` mag weg (optioneel).
- Sluit #83 met verwijzing naar de release die de migratie compleet
  maakte.

## Rollback-pad

Als cutover breekt en we terug moeten naar GitHub:

```bash
cd ~/Dev/topoquiz
git remote set-url origin git@github.com:jelmerkk/topoquiz.git
git checkout -- .github/workflows/e2e.yml  # terug uit history
# op GitHub: Settings → Archive this repository → ongedaan maken
# CF-Pages git-integration opnieuw koppelen
```

Runner op argo blijft staan — geen schade. Codeberg-repo blijft als
mirror.

## Issue-nummer-mapping

Nummers zijn **1-op-1 behouden** bij import (spot-check 2026-04-22):

- #83 "Refactor: migrate repo to Codeberg + Forgejo Actions runner" (open)
- #80 "Redesign: bonus + dagelijkse uitdaging voor Geobas 5–8" (closed)

Geen mapping-tabel nodig — alle cross-references in issue-bodies
blijven leesbaar.

## Bekende gaps na import

- **Release-bodies grotendeels niet overgekomen**: 30 tags aanwezig,
  maar slechts 3 van 30 release-objects met title/notes. Bekende Gitea
  GitHub-migration-gap. Geaccepteerd als kosmetisch — commit-history +
  tags zijn de echte truth, GitHub-archive blijft leesbaar voor wie
  oude release-notes wil zien. Toekomstige releases starten vers op
  Codeberg.

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  // CI: 2 retries tegen infra-flakiness (Cloudflare runner timeouts, resource
  // starvation). Lokaal 0 — dan zie je echte flakes meteen.
  retries: process.env.CI ? 2 : 0,
  // Parallelliseer binnen één spec-file; workers bepaalt cross-file parallelisme.
  fullyParallel: true,
  // Per-test default timeout. Geobas-8 bonus laadt soms polygons traag in CI.
  timeout: 60_000,
  webServer: {
    command: 'npx serve . -p 3000 -s',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000',
    serviceWorkers: 'block',
  },
});

import { defineConfig, devices } from '@playwright/test';

// Browser smoke tests: start the real game and check its state through the debug probe.
// Screenshots land in test-results/screens/ so a human can look at the result without the code.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npx vite --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});

// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: [['json', { outputFile: 'test-results/results.json' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:3000/api/tasks',
    reuseExistingServer: true,
    timeout: 15000,
  },
});

const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('homepage loads and main hero exists', async ({ page }) => {
  const logs = [];
  page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));

  const res = await page.goto('http://127.0.0.1:8000/', { waitUntil: 'domcontentloaded' });
  const status = res.status();
  console.log('HTTP status:', status);

  // Wait for hero title
  await expect(page.locator('.hero-title')).toHaveCount(1);

  // Save console logs
  fs.writeFileSync('test-results/playwright-console.log', logs.join('\n'));

  // Screenshot
  await page.screenshot({ path: 'test-results/homepage.png', fullPage: true });
});

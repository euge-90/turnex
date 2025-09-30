const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const fixturePath = path.join(__dirname, '..', 'fixtures', 'services.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

// Simple smoke tests for the main flows (static server required)
// Run: npx playwright test tests/playwright/services.spec.js

test.beforeEach(async ({ page }) => {
  // Intercept the services API and return a deterministic fixture so tests are stable
  await page.route('**/api/services', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(fixture)
  }));

  // Load the page (uses baseURL from playwright.config.js)
  await page.goto('/index.html');
  // Wait for the app to signal that services were rendered (deterministic)
  await page.evaluate(() => new Promise(resolve => {
    const done = () => { resolve(true); };
    window.addEventListener('turnex:services-rendered', done, { once: true });
    // fallback timeout in case event is missed
    setTimeout(done, 2000);
  }));
});

test('hero search and category interactions', async ({ page }) => {
  // Ensure hero inputs exist
  await expect(page.locator('#heroServiceQuery')).toBeVisible();
  await expect(page.locator('#btnHeroSearch')).toBeVisible();

  // Type a query and submit
  await page.fill('#heroServiceQuery', 'corte');
  await page.click('#btnHeroSearch');

  // Expect services section to be visible
  await expect(page.locator('#servicios')).toBeVisible();

  // Click first category card if exists
  const cat = page.locator('.cat-card').first();
  if(await cat.count() > 0){
    await cat.click();
    await expect(page.locator('#servicesList')).toBeVisible();
  }
});

test('booking CTA opens auth modal when not logged in', async ({ page }) => {
  // Wait for services list to be rendered (either real services or placeholder)
  await page.waitForSelector('#servicesList');
  // Try a few selectors in order: real book button, placeholder book button, any service-card button
  const selectors = [
    'button[data-action="book"]',
    '[data-service-placeholder] button[data-action="book"]',
    '.service-card button',
    'button' // last resort
  ];
  let btn = null;
  for(const s of selectors){
    const loc = page.locator(s).first();
    if(await loc.count() > 0){ btn = loc; break; }
  }
  if(!btn) throw new Error('No book button found on the page');
  await expect(btn).toBeVisible();
  await btn.click();

  // Auth modal should appear (Bootstrap adds the `show` class once visible)
  await page.waitForSelector('#authModal.show', { timeout: 5000 });
  await expect(page.locator('#authModal')).toBeVisible();
});

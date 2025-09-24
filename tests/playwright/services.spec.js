const { test, expect } = require('@playwright/test');

// Simple smoke tests for the main flows (static server required)
// Run: npx playwright test tests/playwright/services.spec.js

test.beforeEach(async ({ page }) => {
  // Adjust base URL if needed
  await page.goto('http://localhost:8000/index.html');
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
  // Click the first Reservar button
  const btn = page.locator('button[data-action="book"]').first();
  await expect(btn).toBeVisible();
  await btn.click();

  // Auth modal should appear
  await expect(page.locator('#authModal')).toBeVisible();
});

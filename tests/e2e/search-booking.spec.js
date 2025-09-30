const { test, expect } = require('@playwright/test');

test.describe('Search + Booking smoke', () => {
  test('hero search filters and booking creates localStorage entry', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080'); // adjust if your local server runs on a different port

    // Search for 'corte' in the hero
    await page.fill('#heroServiceQuery', 'corte');
    // wait for debounce + rendering
    await page.waitForTimeout(600);

    // Ensure at least one visible service contains 'Corte' in title
    const titles = await page.$$eval('#servicesList .service-title', els => els.map(e => e.textContent.trim().toLowerCase()));
    expect(titles.some(t => t.includes('corte'))).toBeTruthy();

    // Click the first visible "Reservar Turno" button
    const btn = await page.$('#servicesList [data-action="book"]');
    expect(btn).not.toBeNull();
    await btn.click();

    // Instead of waiting for a transient toast, open the bookings modal and assert the content
    await page.click('#turnexBookingsBtn');

    // Wait for the modal to be marked visible by the app (data-test-visible) or aria-hidden=false
    await page.waitForFunction(() => {
      const m = document.getElementById('turnexBookingsModal')
      return !!(m && (m.getAttribute('data-test-visible') === '1' || m.getAttribute('aria-hidden') === 'false'))
    }, { timeout: 3000 })

    // Additionally wait for the app to dispatch a bookings-updated event or poll the DOM
    const updated = await page.evaluate(() => new Promise(resolve => {
      let resolved = false
      function onUpdated() { resolved = true; resolve(true) }
      window.addEventListener('turnex:bookings-updated', onUpdated, { once: true })
      // fallback: if bookings list already has items, resolve immediately
      const el = document.getElementById('turnexBookingsList')
      if (el && el.querySelector && el.querySelector('.booking-item')) { if (!resolved) { window.removeEventListener('turnex:bookings-updated', onUpdated); resolve(true) } }
      // safety timeout
      setTimeout(() => { if (!resolved) { window.removeEventListener('turnex:bookings-updated', onUpdated); resolve(false) } }, 2500)
    }))

    let modalItems = [];
    if (updated) {
      modalItems = await page.$$eval('#turnexBookingsList .booking-item', els => els.map(e => ({ name: e.querySelector('.booking-name') && e.querySelector('.booking-name').textContent || '', date: e.querySelector('.booking-date') && e.querySelector('.booking-date').textContent || '' })));
    }

    // if booking widget wasn't filled synchronously, fallback to reading localStorage directly
    if (!modalItems || modalItems.length === 0) {
      const bookings = await page.evaluate(() => JSON.parse(localStorage.getItem('turnex:bookings') || '[]'));
      expect(Array.isArray(bookings)).toBeTruthy();
      expect(bookings.length).toBeGreaterThan(0);
      expect(bookings[0]).toHaveProperty('serviceId');
    } else {
      expect(modalItems.length).toBeGreaterThan(0);
      expect(modalItems[0].name.length).toBeGreaterThan(0);
    }
  });
});

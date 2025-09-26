import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    
    await expect(page).toHaveTitle(/Turnos de peluquería/)
    await expect(page.locator('text=Reservá online, fácil y rápido')).toBeVisible()
  })

  test('should open signup modal', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Crear cuenta")')
    await expect(page.locator('#signupForm')).toBeVisible()
  })

  test('should open login modal', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Ingresar")')
    await expect(page.locator('#loginForm')).toBeVisible()
  })

  test('should show business name field when selecting BUSINESS role', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Crear cuenta")')
    
    // Seleccionar rol BUSINESS
    await page.selectOption('#signupRole', 'BUSINESS')
    
    // Verificar que el campo aparece
    await expect(page.locator('#businessNameContainer')).toBeVisible()
  })

  test('should validate required fields in signup', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Crear cuenta")')
    
    // Intentar enviar sin llenar campos
    await page.click('#signupSubmitBtn')
    
    // Verificar validación HTML5
    const nameInput = page.locator('#signupName')
    const isInvalid = await nameInput.evaluate(el => !el.validity.valid)
    expect(isInvalid).toBe(true)
  })
})
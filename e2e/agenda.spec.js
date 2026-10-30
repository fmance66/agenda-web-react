import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// las personas salen de e2e/api-falsa.mjs y las áreas de e2e/areas.semilla.json (inventadas).
// Corren contra el server de producción: las rutas van sin "#"

test('buscar una persona y abrir su ficha', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Buscar contacto').fill('prueba')

  await page.getByRole('link', { name: /Prueba, Ana Maria/ }).click()
  await expect(page).toHaveURL(/\/contacto\/20111111112/)

  const ficha = page.locator('article.ficha')
  await expect(ficha.getByRole('heading', { level: 2 })).toHaveText('Ana Maria Prueba')
  // los teléfonos repetidos de la api se agrupan: un teléfono con su RPV
  await expect(ficha.getByText('(011) 4347-0001')).toHaveCount(1)
  await expect(ficha.getByText('20001', { exact: true })).toBeVisible()
  await expect(ficha.getByText('Compañeros de área (2)')).toBeVisible()
})

test('descargar la gente de un área en un solo .vcf', async ({ page }) => {
  // el área se conoce por la semilla; su gente llega recién al consultar a alguien de ella
  await page.goto('./contacto/20222222223')
  await expect(page.locator('article.ficha')).toBeVisible()
  await page.goto('./area/A0MF000000')

  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: /Descargar contactos \(3\)/ }).click()
  const archivo = await descarga
  expect(archivo.suggestedFilename()).toBe('GE SPRU.vcf')
  const texto = readFileSync(await archivo.path(), 'utf8')
  expect(texto.match(/BEGIN:VCARD/g)).toHaveLength(3)
  // el titular va primero
  expect(texto.indexOf('Prueba;Ana Maria')).toBeLessThan(texto.indexOf('Ejemplo;Juan Carlos'))
})

test('encontrar un área en el organigrama por su sigla', async ({ page }) => {
  await page.goto('./?vista=estructura')
  await expect(page.getByRole('tree', { name: 'Organigrama' })).toBeVisible()

  await page.getByLabel('Filtrar áreas').fill('ge spru')
  const primera = page.locator('.coincidencia').first()
  await expect(primera).toContainText('Gerencia de Sistemas de Pruebas')
  await primera.click()
  await expect(page).toHaveURL(/\/area\/A0MF000000/)
})

test('recorrer el organigrama con el teclado', async ({ page }) => {
  await page.goto('./?vista=estructura')
  const raiz = page.getByRole('treeitem', { name: /Empresa de Prueba/ })
  await raiz.focus()
  await expect(raiz).toHaveAttribute('aria-expanded', 'true')

  await page.keyboard.press('ArrowLeft')
  await expect(raiz).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('ArrowRight')
  await expect(raiz).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[role="treeitem"]:focus')).toHaveAttribute('aria-level', '2')
})

test('Ctrl+K busca personas y se maneja con el teclado', async ({ page }) => {
  await page.goto('./')
  await page.keyboard.press('Control+k')
  const buscador = page.getByRole('combobox', { name: /Buscar personas, áreas o acciones/ })
  await expect(buscador).toBeFocused()

  await buscador.fill('ejempl')
  await expect(page.getByRole('option', { name: /Ejemplar, Pedro/ })).toBeVisible()
  await expect(page.getByRole('option', { name: /Ejemplo, Juan Carlos/ })).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/contacto\/20222222223/)
  await expect(buscador).toBeHidden()
})

test('sin conexión con la agenda muestra lo guardado y avisa', async ({ page }) => {
  await page.goto('./contacto/27333333334')
  await expect(page.locator('article.ficha h2')).toHaveText('Laura Muestra')

  // el server de la agenda deja de responder
  await page.route('**/api/**', (ruta) => ruta.abort())
  await page.reload()

  await expect(page.locator('article.ficha h2')).toHaveText('Laura Muestra')
  await expect(page.getByRole('status')).toContainText('No hay conexión con el servidor de la agenda')
})

test.describe('accesibilidad (axe, WCAG 2.1 AA)', () => {
  const pantallas = {
    inicio: './',
    ficha: './contacto/20111111112',
    organigrama: './area/A0MF000000?vista=estructura',
    'paleta de comandos': './',
  }

  for (const [nombre, ruta] of Object.entries(pantallas)) {
    test(nombre, async ({ page }) => {
      await page.goto(ruta)
      await page.waitForLoadState('networkidle')
      if (nombre === 'paleta de comandos') {
        await page.keyboard.press('Control+k')
        await page.getByRole('combobox').fill('sis')
      }
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([])
    })
  }
})

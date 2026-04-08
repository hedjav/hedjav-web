import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = 'C:/Users/HP/Documents/hedjav-web/.shots'
mkdirSync(OUT, { recursive: true })

const pages = [
  { name: 'home',          url: 'http://localhost:3000/' },
  { name: 'ebooks',        url: 'http://localhost:3000/ebooks' },
  { name: 'ebook-vente',   url: 'http://localhost:3000/ebooks/propulser-ia' },
  { name: 'blog',          url: 'http://localhost:3000/blog' },
  { name: 'blog-article',  url: 'http://localhost:3000/blog/ouvrir-compte-titres-brvm-2026' },
  { name: 'a-propos',      url: 'http://localhost:3000/a-propos' },
  { name: 'login',         url: 'http://localhost:3000/login' },
  { name: 'register',      url: 'http://localhost:3000/register' },
  { name: 'merci',         url: 'http://localhost:3000/merci' },
]

const themes = ['light', 'dark']
const viewport = { width: 1440, height: 900 }

const browser = await chromium.launch()
for (const theme of themes) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()

  // Force le thème via cookie/localStorage avant le premier goto
  await ctx.addInitScript((t) => {
    try {
      window.localStorage.setItem('theme', t)
    } catch {}
  }, theme)

  for (const p of pages) {
    try {
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 })
      // Force le data-theme côté DOM (next-themes lit localStorage au mount)
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t)
      }, theme)
      await page.waitForTimeout(200)
      const filename = `${OUT}/${p.name}-${theme}.png`
      await page.screenshot({ path: filename, fullPage: true })
      console.log(`✓ ${p.name.padEnd(15)} [${theme}]`)
    } catch (e) {
      console.error(`✗ ${p.name} ${theme}: ${e.message}`)
    }
  }
  await ctx.close()
}
await browser.close()

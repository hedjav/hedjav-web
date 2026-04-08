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
]

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile',  width: 390,  height: 844 },
]

const browser = await chromium.launch()
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
  const page = await ctx.newPage()
  for (const p of pages) {
    await page.goto(p.url, { waitUntil: 'networkidle' })
    const path = `${OUT}/${p.name}-${vp.name}.png`
    await page.screenshot({ path, fullPage: true })
    console.log('✓', path)
  }
  await ctx.close()
}
await browser.close()

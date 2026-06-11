/**
 * Regenerates `src/data/fallbackCatalog.json` from a fresh Shopify pull.
 *
 * Run with `pnpm refresh-fallback`. Commit the result.
 *
 * The fallback catalog is the bootstrap snapshot the app uses when
 * `localStorage` is empty AND the live Shopify fetch fails on first paint.
 * It must be present in the repo for the build to succeed — the catalog
 * service imports it at module load time.
 */

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import controllerSpecsRaw from '../src/data/controllerSpecs.json' with { type: 'json' }
import { fetchControllerProducts } from '../src/services/shopify.ts'
import {
  curatedSpecsFromRaw,
  mergeCatalog,
} from '../src/services/catalog/merge.ts'

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url))
  const targetPath = resolve(here, '../src/data/fallbackCatalog.json')

  console.log('Fetching shop.8bitdo.com /products.json …')
  const shopifyProducts = await fetchControllerProducts()
  console.log(`  -> ${shopifyProducts.length} controllers in Shopify response`)

  const specs = curatedSpecsFromRaw(
    controllerSpecsRaw as Record<string, unknown>,
  )
  const controllers = mergeCatalog(shopifyProducts, specs)
  const fetchedAt = Date.now()

  const json = JSON.stringify({ fetchedAt, controllers }, null, 2) + '\n'
  await writeFile(targetPath, json, 'utf8')
  console.log(
    `Wrote ${controllers.length} controllers to ${targetPath} (fetchedAt ${new Date(fetchedAt).toISOString()})`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

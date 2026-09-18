/**
 * scripts/checkHouseImages.mjs
 *
 * Reports which houses have a sigil file in public/houses/sigils/ and
 * which are still missing, based on the naming convention in
 * houseImageSlugs.json. Checks for .jpg, .jpeg, .png, and .webp —
 * whichever extension you saved the file with is fine, just the slug
 * (base filename) has to match.
 *
 * Usage: node scripts/checkHouseImages.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const houses = JSON.parse(readFileSync(join(__dirname, 'houseImageSlugs.json'), 'utf-8'))
const imagesDir = join(__dirname, '..', 'public', 'houses', 'sigils')

const EXTENSIONS = ['.svg', '.jpg', '.jpeg', '.png', '.webp']

function findExistingFile(slug) {
  for (const ext of EXTENSIONS) {
    if (existsSync(join(imagesDir, `${slug}${ext}`))) {
      return `${slug}${ext}`
    }
  }
  return null
}

const present = []
const missing = []

for (const house of houses) {
  const file = findExistingFile(house.slug)
  if (file) {
    present.push({ ...house, file })
  } else {
    missing.push(house)
  }
}

console.log(`\n${present.length} / ${houses.length} house sigils found in public/houses/sigils/\n`)

if (missing.length > 0) {
  console.log(`Still missing (${missing.length}):`)
  missing.forEach((h) => console.log(`  ${h.slug.padEnd(36)} (${h.name})`))
} else {
  console.log('All sigils present. Run migration/xxx_set_house_image_urls.sql if you haven\'t yet.')
}

console.log('')

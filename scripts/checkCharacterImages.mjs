/**
 * scripts/checkCharacterImages.mjs
 *
 * Reports which characters have a portrait file in public/characters/ and
 * which are still missing, based on the naming convention in
 * characterImageSlugs.json. Checks for .jpg, .jpeg, .png, and .webp —
 * whichever extension you saved the file with is fine, just the slug
 * (base filename) has to match.
 *
 * Usage: node scripts/checkCharacterImages.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const characters = JSON.parse(readFileSync(join(__dirname, 'characterImageSlugs.json'), 'utf-8'))
const imagesDir = join(__dirname, '..', 'public', 'characters')

const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

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

for (const character of characters) {
  const file = findExistingFile(character.slug)
  if (file) {
    present.push({ ...character, file })
  } else {
    missing.push(character)
  }
}

console.log(`\n${present.length} / ${characters.length} character portraits found in public/characters/\n`)

if (missing.length > 0) {
  console.log(`Still missing (${missing.length}):`)
  missing.forEach((c) => console.log(`  ${c.slug.padEnd(28)} (${c.name})`))
} else {
  console.log('All portraits present. Run migration/005_set_image_urls.sql if you haven\'t yet.')
}

console.log('')

import { readFileSync, writeFileSync } from 'fs'

const file = 'src/site/content/articleIndex.ts'
let c = readFileSync(file, 'utf8')

const dates = [
  // [slug-fragment, datePublished, dateModified]
  ['comment-organiser-un-planning', '2026-03-15', '2026-04-03'],
  ['erp-transport-pourquoi-abandonner', '2026-03-20', '2026-04-03'],
  ['tms-transport-definition', '2026-03-25', '2026-04-03'],
  ['gestion-de-flotte-poids-lourd', '2026-03-28', '2026-04-03'],
  ['comment-ameliorer-la-rentabilite', '2026-04-01', '2026-04-05'],
  ['reduire-les-kilometres', '2026-04-01', '2026-04-05'],
  ['otif-transport', '2026-04-02', '2026-04-05'],
  ['transport-routier-systeme-coherent', '2026-04-03', '2026-04-05'],
]

for (const [slugFragment, pub, mod] of dates) {
  // Find the closing of this entry: after description line there's `  },`
  // We insert dates before the closing `  },` for each entry
  const slugPattern = new RegExp(
    `(slug: '${slugFragment}[^']*'[\\s\\S]*?description:[\\s\\S]*?',\\n)(  },)`,
    'm'
  )
  const replacement = `$1    datePublished: '${pub}',\n    dateModified: '${mod}',\n$2`
  const before = c
  c = c.replace(slugPattern, replacement)
  if (c === before) {
    console.warn(`WARNING: no match for slug fragment "${slugFragment}"`)
  } else {
    console.log(`✓ ${slugFragment}`)
  }
}

writeFileSync(file, c, 'utf8')
console.log('Done.')

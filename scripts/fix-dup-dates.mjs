import { readFileSync, writeFileSync } from 'fs'
const path = 'src/site/content/articleIndex.ts'
let c = readFileSync(path, 'utf8')
// Remove duplicate datePublished/dateModified lines (keep the first occurrence in each entry)
// Pattern: two consecutive datePublished lines
const nl = c.includes('\r\n') ? '\r\n' : '\n'
// Remove the duplicates by replacing double occurrences
c = c.replace(/(    datePublished: '[^']+',\n    dateModified: '[^']+',)\n    datePublished: '[^']+',\n    dateModified: '[^']+',/g, '$1')
writeFileSync(path, c, 'utf8')
console.log('done')

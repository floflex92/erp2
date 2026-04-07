import { readFileSync, writeFileSync } from 'fs'

let s = readFileSync('scripts/patch-hero-sections.mjs', 'utf8')
s = s.replace(/let c = readFileSync\(p, 'utf8'\)/g, "let c = readFileSync(p, 'utf8').replace(/\\r\\n/g, '\\n')")
writeFileSync('scripts/patch-hero-sections.mjs', s)
console.log('done, occurrences patched:', (s.match(/replace.*\\r\\n/g) || []).length)

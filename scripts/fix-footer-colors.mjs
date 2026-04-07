import { readFileSync, writeFileSync } from 'fs'

const p = 'src/site/components/SiteLayout.tsx'
let c = readFileSync(p, 'utf8')
c = c.replace(/#86868B/g, '#636369')
c = c.replace(/#6E6E73/g, '#4b4b51')
writeFileSync(p, c)
console.log('patched', p)

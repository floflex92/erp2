import { readFileSync, writeFileSync, readdirSync } from 'fs'

const dir = 'src/site/pages'
const f = readdirSync(dir).find(x => x.charCodeAt(3) === 0xe9 && x.includes('matique'))
if (!f) { console.error('file not found'); process.exit(1) }

const filePath = dir + '/' + f
let c = readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n')

const ogLine = `  ogImage: 'https://nexora-truck.fr/site/screenshots/map-live-vehicles.png',`
const startIdx = c.indexOf('useSiteMeta(')
const closeIdx = c.indexOf('\n  })', startIdx)
let before = c.slice(0, closeIdx)
if (!before.trimEnd().endsWith(',')) before = before.trimEnd() + ','
c = before + '\n' + ogLine + c.slice(closeIdx)
writeFileSync(filePath, c)
console.log('✓', f)

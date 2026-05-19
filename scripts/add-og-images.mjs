import { readFileSync, writeFileSync } from 'fs'

const BASE = 'https://nexora-truck.fr/site/screenshots/'

const pages = [
  ['src/site/pages/SeoErpTransportPage.tsx', 'accueil-proof.png'],
  ['src/site/pages/ErpTransportRoutierPage.tsx', 'camions.png'],
  ['src/site/pages/LogicielGestionFlotteCamionPage.tsx', 'map-live-vehicles.png'],
  ['src/site/pages/ChronotachygraphePage.tsx', 'chronotachygraphe.png'],
  ['src/site/pages/LogicielTransportPage.tsx', 'camions.png'],
  ['src/site/pages/SolutionPage.tsx', 'accueil-proof.png'],
  ['src/site/pages/RoiPage.tsx', 'accueil-proof.png'],
  ['src/site/pages/SecteurTransportPage.tsx', 'camions.png'],
  ['src/site/pages/AboutPage.tsx', 'camions.png'],
]

for (const [filePath, img] of pages) {
  let c = readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n')

  const ogLine = `  ogImage: '${BASE}${img}',`

  // Already patched?
  if (c.includes('ogImage:')) {
    console.log('skip (already has ogImage):', filePath)
    continue
  }

  // Strategy: insert ogImage line right before the closing  }) of useSiteMeta
  // The call ends with either:
  //   keywords: '...',\n  })
  // or (for FAQ pages):
  //   ],\n  })
  // We look for useSiteMeta block end = first `\n  })` after `useSiteMeta(`
  const startIdx = c.indexOf('useSiteMeta(')
  if (startIdx === -1) { console.error('useSiteMeta not found:', filePath); process.exit(1) }

  // Find the closing  })
  const closeStr = '\n  })'
  const closeIdx = c.indexOf(closeStr, startIdx)
  if (closeIdx === -1) { console.error('closing }) not found:', filePath); process.exit(1) }

  // Detect indentation of last property — grab text from after last \n before closeIdx
  const lastLineStart = c.lastIndexOf('\n', closeIdx - 1)
  const lastLine = c.slice(lastLineStart + 1, closeIdx)

  // Ensure last property ends with comma, then add ogImage
  let before = c.slice(0, closeIdx)
  if (!before.trimEnd().endsWith(',')) {
    before = before.trimEnd() + ','
  }

  c = before + '\n' + ogLine + c.slice(closeIdx)
  writeFileSync(filePath, c)
  console.log('✓', filePath.split('/').pop())
}

import { readFileSync, writeFileSync } from 'fs'

const p = 'src/site/pages/AllFeaturesPage.tsx'
let c = readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

const transforms = [
  [
    `className="relative flex min-h-[60vh] w-full flex-col items-center justify-center overflow-hidden text-center" style={{ ...sectionPx, ...sectionPy }}>`,
    `className="flex w-full flex-col items-center justify-center text-center" style={{ background: '#0f172a', ...sectionPx, ...sectionPy }}>`,
  ],
  [
    `        <img\n          src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1600"\n          alt="Equipe produit et exploitation en atelier de travail sur les fonctionnalites"\n          aria-hidden="true"\n          className="absolute inset-0 h-full w-full object-cover"\n          style={{ opacity: 0.35 }}\n        />\n        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 100%)' }} />\n        <div className="relative">`,
    ``,
  ],
  [
    `style={{ color: '#606065' }}>Roadmap produit</p>`,
    `style={{ color: '#94a3b8' }}>Roadmap produit</p>`,
  ],
  [
    `style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)', color: '#000000', letterSpacing: '-0.025em' }}>`,
    `style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)', color: '#ffffff', letterSpacing: '-0.025em' }}>`,
  ],
  [
    `style={{ color: '#1D1D1F', letterSpacing: '-0.01em' }}>`,
    `style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>`,
  ],
  [
    `style={{ color: '#606065', fontSize: '18px', lineHeight: 1.65 }}>`,
    `style={{ color: '#94a3b8', fontSize: '18px', lineHeight: 1.65 }}>`,
  ],
  [
    `style={{ color: '#2563EB' }}>Échanger avec l'équipe produit</Link>`,
    `style={{ color: '#93c5fd' }}>Échanger avec l'équipe produit</Link>`,
  ],
  [
    `borderColor: '#E5E7EB', background: 'rgba(255,255,255,0.92)' }}>\n              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>Développé</p>\n              <p className="mt-1 text-lg font-semibold" style={{ color: '#0F172A' }}>{developedFeatures.length}</p>`,
    `borderColor: '#334155', background: '#1e293b' }}>\n              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#94a3b8' }}>Développé</p>\n              <p className="mt-1 text-lg font-semibold" style={{ color: '#ffffff' }}>{developedFeatures.length}</p>`,
  ],
  [
    `borderColor: '#E5E7EB', background: 'rgba(255,255,255,0.92)' }}>\n              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>En cours</p>\n              <p className="mt-1 text-lg font-semibold" style={{ color: '#0F172A' }}>{inProgressFeatures.length}</p>`,
    `borderColor: '#334155', background: '#1e293b' }}>\n              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#94a3b8' }}>En cours</p>\n              <p className="mt-1 text-lg font-semibold" style={{ color: '#ffffff' }}>{inProgressFeatures.length}</p>`,
  ],
  [
    `borderColor: '#E5E7EB', background: 'rgba(255,255,255,0.92)' }}>\n              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>Features</p>\n              <p className="mt-1 text-lg font-semibold" style={{ color: '#0F172A' }}>{upcomingFeatures.length}</p>`,
    `borderColor: '#334155', background: '#1e293b' }}>\n              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#94a3b8' }}>Features</p>\n              <p className="mt-1 text-lg font-semibold" style={{ color: '#ffffff' }}>{upcomingFeatures.length}</p>`,
  ],
  [
    `{upcomingFeatures.length}</p>\n            </div>\n          </div>\n        </div>\n      </section>\n\n      <StatusSection`,
    `{upcomingFeatures.length}</p>\n            </div>\n          </div>\n      </section>\n\n      <StatusSection`,
  ],
]

for (const [from, to] of transforms) {
  if (!c.includes(from)) {
    console.error('NOT FOUND:', JSON.stringify(from).slice(0, 120))
    process.exit(1)
  }
  c = c.replace(from, to)
}

writeFileSync(p, c)
console.log('✓ AllFeaturesPage patched')

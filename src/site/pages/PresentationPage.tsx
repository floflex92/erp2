import { useState } from 'react'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const PDF_URL = '/presentation-erp-tms.pdf'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }

export default function PresentationPage() {
  const [pdfError, setPdfError] = useState(false)

  useSiteMeta({
    title: 'Présentation ERP TMS — NEXORA Truck',
    description: "Téléchargez et consultez la présentation complète de l'ERP TMS NEXORA Truck : modules, fonctionnalités, architecture et bénéfices pour les transporteurs routiers.",
    canonicalPath: '/presentation',
    keywords: 'présentation ERP transport, TMS brochure, logiciel transport routier PDF, NEXORA Truck',
  })

  return (
    <main style={{ background: 'var(--site-bg, #0f1117)', minHeight: '100vh' }}>
      {/* Hero */}
      <section
        style={{
          ...sectionPx,
          paddingBlock: 'clamp(60px, 10vw, 120px)',
          background: 'linear-gradient(135deg, #0f1117 0%, #1a2035 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 100,
              padding: '6px 16px',
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Document officiel
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 5vw, 52px)',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.15,
              margin: '0 0 20px',
            }}
          >
            Présentation ERP TMS
            <br />
            <span style={{ color: '#818cf8' }}>NEXORA Truck</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              color: 'rgba(255,255,255,0.65)',
              maxWidth: 620,
              margin: '0 auto 36px',
              lineHeight: 1.7,
            }}
          >
            Découvrez en détail notre solution ERP transport routier — modules, fonctionnalités, architecture technique et bénéfices métier.
          </p>

          <a
            href={PDF_URL}
            download="NEXORA-Truck-Presentation-ERP-TMS.pdf"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              padding: '14px 32px',
              borderRadius: 10,
              textDecoration: 'none',
              boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Télécharger le PDF
          </a>
        </div>
      </section>

      {/* Visionneuse PDF */}
      <section style={{ ...sectionPx, paddingBlock: 'clamp(40px, 6vw, 80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {pdfError ? (
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '60px 32px',
                textAlign: 'center',
              }}
            >
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24, fontSize: 16 }}>
                Votre navigateur ne prend pas en charge l'affichage inline du PDF.
              </p>
              <a
                href={PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  color: '#a5b4fc',
                  fontWeight: 600,
                  fontSize: 15,
                  padding: '12px 28px',
                  borderRadius: 10,
                  textDecoration: 'none',
                }}
              >
                Ouvrir dans un nouvel onglet
              </a>
            </div>
          ) : (
            <div
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              <object
                data={PDF_URL}
                type="application/pdf"
                width="100%"
                style={{ height: 'clamp(500px, 80vh, 900px)', display: 'block' }}
                onError={() => setPdfError(true)}
              >
                <embed
                  src={PDF_URL}
                  type="application/pdf"
                  width="100%"
                  style={{ height: 'clamp(500px, 80vh, 900px)' }}
                />
                <p style={{ color: 'rgba(255,255,255,0.6)', padding: 32, textAlign: 'center' }}>
                  Votre navigateur ne supporte pas l'affichage PDF.{' '}
                  <a href={PDF_URL} download style={{ color: '#818cf8' }}>
                    Téléchargez-le ici
                  </a>.
                </p>
              </object>
            </div>
          )}

          {/* Lien secondaire */}
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <a
              href={PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                color: 'rgba(255,255,255,0.45)',
                fontSize: 13,
                textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Ouvrir dans un nouvel onglet
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}

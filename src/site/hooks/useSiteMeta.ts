import { useEffect } from 'react'

export type BreadcrumbItem = {
  name: string
  path: string
}

export type FaqItem = {
  question: string
  answer: string
}

type SiteMetaInput = {
  title: string
  description: string
  canonicalPath?: string
  robots?: string
  keywords?: string
  ogType?: 'website' | 'article'
  ogImage?: string
  ogImageAlt?: string
  ogImageWidth?: string
  ogImageHeight?: string
  twitterImage?: string
  author?: string
  breadcrumbs?: BreadcrumbItem[]
  faqItems?: FaqItem[]
}

function setMetaByName(name: string, value: string) {
  let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!tag) {
    tag = document.createElement('meta')
    tag.name = name
    document.head.appendChild(tag)
  }
  tag.content = value
}

function setMetaByProperty(property: string, value: string) {
  let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('property', property)
    document.head.appendChild(tag)
  }
  tag.content = value
}

function upsertCanonical(canonicalUrl: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = canonicalUrl
}

function normalizeCanonicalPath(path: string) {
  if (path === '/') return path
  const cleanPath = path.split('#')[0]?.split('?')[0] ?? path
  return cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`
}

export default function useSiteMeta({
  title,
  description,
  canonicalPath,
  robots = 'index,follow',
  keywords,
  ogType = 'website',
  ogImage = 'https://nexora-truck.fr/site/logo/brand/nexora-logo-dark.png',
  ogImageAlt,
  ogImageWidth = '1200',
  ogImageHeight = '630',
  twitterImage,
  author,
  breadcrumbs,
  faqItems,
}: SiteMetaInput) {
  useEffect(() => {
    document.title = `${title} | NEXORA Truck`

    const baseUrl = 'https://nexora-truck.fr'
    const resolvedPath = normalizeCanonicalPath(canonicalPath ?? window.location.pathname)
    const canonicalUrl = new URL(resolvedPath, baseUrl).toString()

    setMetaByName('description', description)
    setMetaByName('robots', robots)
    if (keywords) {
      setMetaByName('keywords', keywords)
    }
    if (author) {
      setMetaByName('author', author)
    }
    upsertCanonical(canonicalUrl)

    setMetaByProperty('og:title', `${title} | NEXORA Truck`)
    setMetaByProperty('og:description', description)
    setMetaByProperty('og:type', ogType)
    setMetaByProperty('og:url', canonicalUrl)
    setMetaByProperty('og:locale', 'fr_FR')
    setMetaByProperty('og:site_name', 'NEXORA Truck')
    setMetaByProperty('og:image', ogImage)
    setMetaByProperty('og:image:width', ogImageWidth)
    setMetaByProperty('og:image:height', ogImageHeight)
    setMetaByProperty('og:image:alt', ogImageAlt ?? `${title} | NEXORA Truck`)

    setMetaByName('twitter:card', 'summary_large_image')
    setMetaByName('twitter:title', `${title} | NEXORA Truck`)
    setMetaByName('twitter:description', description)
    setMetaByName('twitter:url', canonicalUrl)
    setMetaByName('twitter:image', twitterImage ?? ogImage)
  }, [author, breadcrumbs, canonicalPath, description, faqItems, keywords, ogImage, ogImageAlt, ogImageHeight, ogImageWidth, ogType, robots, title, twitterImage])

  // BreadcrumbList LD+JSON
  useEffect(() => {
    if (!breadcrumbs?.length) return
    const BASE = 'https://nexora-truck.fr'
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: BASE + '/' },
        ...breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 2,
          name: b.name,
          item: BASE + b.path,
        })),
      ],
    }
    const id = `breadcrumb-jsonld-${canonicalPath ?? 'page'}`
    let script = document.getElementById(id) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.id = id
      document.head.appendChild(script)
    }
    script.text = JSON.stringify(jsonLd)
    return () => { document.getElementById(id)?.remove() }
  }, [breadcrumbs, canonicalPath])

  // FAQPage LD+JSON
  useEffect(() => {
    if (!faqItems?.length) return
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    }
    const id = `faq-jsonld-${canonicalPath ?? 'page'}`
    let script = document.getElementById(id) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.id = id
      document.head.appendChild(script)
    }
    script.text = JSON.stringify(jsonLd)
    return () => { document.getElementById(id)?.remove() }
  }, [canonicalPath, faqItems])
}

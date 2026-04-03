import { useEffect } from 'react'

type SiteMetaInput = {
  title: string
  description: string
  canonicalPath?: string
  robots?: string
  keywords?: string
  ogType?: 'website' | 'article'
  ogImage?: string
  twitterImage?: string
  author?: string
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

export default function useSiteMeta({
  title,
  description,
  canonicalPath,
  robots = 'index,follow',
  keywords,
  ogType = 'website',
  ogImage = 'https://nexora-truck.fr/site/screenshots/planning-dark.png',
  twitterImage,
  author,
}: SiteMetaInput) {
  useEffect(() => {
    document.title = `${title} | NEXORA Truck`

    const baseUrl = 'https://nexora-truck.fr'
    const resolvedPath = canonicalPath ?? window.location.pathname
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
    setMetaByProperty('og:image:alt', 'NEXORA Truck ERP transport')

    setMetaByName('twitter:card', 'summary_large_image')
    setMetaByName('twitter:title', `${title} | NEXORA Truck`)
    setMetaByName('twitter:description', description)
    setMetaByName('twitter:url', canonicalUrl)
    setMetaByName('twitter:image', twitterImage ?? ogImage)
  }, [author, canonicalPath, description, keywords, ogImage, ogType, robots, title, twitterImage])
}
import { useEffect } from 'react'

interface PageMeta {
  title: string
  description: string
  canonical: string
  ogImage?: string
}

export function usePageMeta({ title, description, canonical, ogImage }: PageMeta) {
  useEffect(() => {
    document.title = `${title} | NEXORA Truck`
    setMeta('description', description)
    setMeta('og:title', title)
    setMeta('og:description', description)
    setMeta('og:url', canonical)
    if (ogImage) setMeta('og:image', ogImage)
    setLink('canonical', canonical)
  }, [title, description, canonical, ogImage])
}

function setMeta(name: string, content: string) {
  const isOg = name.startsWith('og:')
  const selector = isOg ? `meta[property="${name}"]` : `meta[name="${name}"]`
  let el = document.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    if (isOg) el.setAttribute('property', name)
    else el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

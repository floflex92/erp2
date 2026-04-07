# Code Citations

## License: MIT
https://github.com/wackerservices/SitemapAutogenerator/blob/8c3abb9e66fb37086d83289c2faf3a27dec5fa8f/README.md

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/
```


## License: MIT
https://github.com/wackerservices/SitemapAutogenerator/blob/8c3abb9e66fb37086d83289c2faf3a27dec5fa8f/README.md

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/
```


## License: MIT
https://github.com/wackerservices/SitemapAutogenerator/blob/8c3abb9e66fb37086d83289c2faf3a27dec5fa8f/README.md

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/
```


## License: MIT
https://github.com/wackerservices/SitemapAutogenerator/blob/8c3abb9e66fb37086d83289c2faf3a27dec5fa8f/README.md

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/
```


## License: MIT
https://github.com/wackerservices/SitemapAutogenerator/blob/8c3abb9e66fb37086d83289c2faf3a27dec5fa8f/README.md

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/
```


## License: MIT
https://github.com/wackerservices/SitemapAutogenerator/blob/8c3abb9e66fb37086d83289c2faf3a27dec5fa8f/README.md

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/
```


## License: MIT
https://github.com/wackerservices/SitemapAutogenerator/blob/8c3abb9e66fb37086d83289c2faf3a27dec5fa8f/README.md

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/
```


## License: MIT
https://github.com/aqrun/aqrun.github.io/blob/4bdf46c310df8a741f88816c656529940eeb02da/themes/abridge/netlify.toml

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://nexora-truck.fr/demo</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Ajouter une entrée par page publique -->
</urlset>
```

### 3.2 `robots.txt`

```txt
# erp2/public/robots.txt
User-agent: *
Allow: /
Disallow: /login
Disallow: /admin
Disallow: /super-admin
Disallow: /.netlify/

Sitemap: https://nexora-truck.fr/sitemap.xml
```

### 3.3 Données structurées (JSON-LD) — page produit

```tsx
// src/components/SoftwareJsonLd.tsx
export function SoftwareJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NEXORA Truck",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://nexora-truck.fr",
    "description": "ERP transport routier avec TMS, planning chauffeurs, gestion flotte et facturation.",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EUR",
      "price": "0",
      "description": "Démo gratuite disponible"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NEXORA",
      "url": "https://nexora-truck.fr"
    }
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### 3.4 Balises meta par page (hook React)

```tsx
// src/hooks/usePageMeta.ts
import { useEffect } from 'react'

interface PageMeta {
  title: string           // ≤ 60 chars
  description: string     // 70-155 chars
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
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
    ?? Object.assign(document.createElement('meta'), {
        [name.startsWith('og:') ? 'property' : 'name']: name
       })
  el.setAttribute('content', content)
  if (!el.parentNode) document.head.appendChild(el)
}
function setLink(rel: string, href: string) {
  const el = document.querySelector(`link[rel="${rel}"]`)
    ?? Object.assign(document.createElement('link'), { rel })
  el.setAttribute('href', href)
  if (!el.parentNode) document.head.appendChild(el)
}
```

```tsx
// Usage dans une page
export default function DemoAccess() {
  usePageMeta({
    title: 'Demande de démo gratuite',
    description: 'Testez NEXORA Truck gratuitement — ERP transport routier avec planning, TMS et facturation. Accès démo immédiat, sans engagement.',
    canonical: 'https://nexora-truck.fr/demo',
  })
  // …
}
```

---

## 4. Sécurité

### 4.1 Checklist

| # | Point | Action |
|---|-------|--------|
| S1 | HTTPS | Netlify active TLS automatiquement ✅ |
| S2 | HSTS | Ajouter header dans `netlify.toml` |
| S3 | CSP | Définir via header Netlify (voir ci-dessous) |
| S4 | Secrets | Variables d'env dans l'UI Netlify, jamais dans le code |
| S5 | RLS Supabase | Activer sur toutes les tables (voir `supabase/migrations/`) |
| S6 | CSRF Supabase | Utiliser les sessions JWT Supabase (`supabase.auth.getSession()`) |
| S7 | Clés publiques | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en VITE_ uniquement |
| S8 | Clés secrètes | `SUPABASE_SERVICE_ROLE_KEY` **uniquement** côté Netlify Functions |
| S9 | Dépendances | `npm audit --audit-level=moderate` en CI |
| S10 | clickjacking | Header `X-Frame-Options: DENY` |

### 4.2 `netlify.toml` complet avec headers de sécurité et edge function

```toml
# netlify.toml (racine du dépôt)
[build]
  base    = "erp2"
  command = "npm run build"
  publish = "erp2/dist"

[dev]
  framework  = "#custom"
  command    = "npm run dev"
  targetPort = 5173
  port       = 8888

# ─── Variables d'environnement (surcharger dans l'UI Netlify) ──────────────
[build.environment]
  NODE_VERSION = "20"
  # Ne JAMAIS mettre les vraies valeurs ici — utiliser l'UI Netlify :
  # SUPABASE_SERVICE_ROLE_KEY = "..."
  # ANTHROPIC_API_KEY         = "..."
  # VITE_SUPABASE_URL         = "https://xxxx.supabase.co"
  # VITE_SUPABASE_ANON_KEY    = "eyJ..."

# ─── Headers de sécurité globaux ──────────────────────────────────────────
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options           = "DENY"
    X-Content-Type-Options    = "nosniff"
    X-XSS-Protection          = "1; mode=block"
    Referrer-Policy           = "strict-origin-when-cross-origin"
    Permissions
```


## License: MIT
https://github.com/aqrun/aqrun.github.io/blob/4bdf46c310df8a741f88816c656529940eeb02da/themes/abridge/netlify.toml

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://nexora-truck.fr/demo</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Ajouter une entrée par page publique -->
</urlset>
```

### 3.2 `robots.txt`

```txt
# erp2/public/robots.txt
User-agent: *
Allow: /
Disallow: /login
Disallow: /admin
Disallow: /super-admin
Disallow: /.netlify/

Sitemap: https://nexora-truck.fr/sitemap.xml
```

### 3.3 Données structurées (JSON-LD) — page produit

```tsx
// src/components/SoftwareJsonLd.tsx
export function SoftwareJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NEXORA Truck",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://nexora-truck.fr",
    "description": "ERP transport routier avec TMS, planning chauffeurs, gestion flotte et facturation.",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EUR",
      "price": "0",
      "description": "Démo gratuite disponible"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NEXORA",
      "url": "https://nexora-truck.fr"
    }
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### 3.4 Balises meta par page (hook React)

```tsx
// src/hooks/usePageMeta.ts
import { useEffect } from 'react'

interface PageMeta {
  title: string           // ≤ 60 chars
  description: string     // 70-155 chars
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
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
    ?? Object.assign(document.createElement('meta'), {
        [name.startsWith('og:') ? 'property' : 'name']: name
       })
  el.setAttribute('content', content)
  if (!el.parentNode) document.head.appendChild(el)
}
function setLink(rel: string, href: string) {
  const el = document.querySelector(`link[rel="${rel}"]`)
    ?? Object.assign(document.createElement('link'), { rel })
  el.setAttribute('href', href)
  if (!el.parentNode) document.head.appendChild(el)
}
```

```tsx
// Usage dans une page
export default function DemoAccess() {
  usePageMeta({
    title: 'Demande de démo gratuite',
    description: 'Testez NEXORA Truck gratuitement — ERP transport routier avec planning, TMS et facturation. Accès démo immédiat, sans engagement.',
    canonical: 'https://nexora-truck.fr/demo',
  })
  // …
}
```

---

## 4. Sécurité

### 4.1 Checklist

| # | Point | Action |
|---|-------|--------|
| S1 | HTTPS | Netlify active TLS automatiquement ✅ |
| S2 | HSTS | Ajouter header dans `netlify.toml` |
| S3 | CSP | Définir via header Netlify (voir ci-dessous) |
| S4 | Secrets | Variables d'env dans l'UI Netlify, jamais dans le code |
| S5 | RLS Supabase | Activer sur toutes les tables (voir `supabase/migrations/`) |
| S6 | CSRF Supabase | Utiliser les sessions JWT Supabase (`supabase.auth.getSession()`) |
| S7 | Clés publiques | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en VITE_ uniquement |
| S8 | Clés secrètes | `SUPABASE_SERVICE_ROLE_KEY` **uniquement** côté Netlify Functions |
| S9 | Dépendances | `npm audit --audit-level=moderate` en CI |
| S10 | clickjacking | Header `X-Frame-Options: DENY` |

### 4.2 `netlify.toml` complet avec headers de sécurité et edge function

```toml
# netlify.toml (racine du dépôt)
[build]
  base    = "erp2"
  command = "npm run build"
  publish = "erp2/dist"

[dev]
  framework  = "#custom"
  command    = "npm run dev"
  targetPort = 5173
  port       = 8888

# ─── Variables d'environnement (surcharger dans l'UI Netlify) ──────────────
[build.environment]
  NODE_VERSION = "20"
  # Ne JAMAIS mettre les vraies valeurs ici — utiliser l'UI Netlify :
  # SUPABASE_SERVICE_ROLE_KEY = "..."
  # ANTHROPIC_API_KEY         = "..."
  # VITE_SUPABASE_URL         = "https://xxxx.supabase.co"
  # VITE_SUPABASE_ANON_KEY    = "eyJ..."

# ─── Headers de sécurité globaux ──────────────────────────────────────────
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options           = "DENY"
    X-Content-Type-Options    = "nosniff"
    X-XSS-Protection          = "1; mode=block"
    Referrer-Policy           = "strict-origin-when-cross-origin"
    Permissions
```


## License: MIT
https://github.com/aqrun/aqrun.github.io/blob/4bdf46c310df8a741f88816c656529940eeb02da/themes/abridge/netlify.toml

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://nexora-truck.fr/demo</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Ajouter une entrée par page publique -->
</urlset>
```

### 3.2 `robots.txt`

```txt
# erp2/public/robots.txt
User-agent: *
Allow: /
Disallow: /login
Disallow: /admin
Disallow: /super-admin
Disallow: /.netlify/

Sitemap: https://nexora-truck.fr/sitemap.xml
```

### 3.3 Données structurées (JSON-LD) — page produit

```tsx
// src/components/SoftwareJsonLd.tsx
export function SoftwareJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NEXORA Truck",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://nexora-truck.fr",
    "description": "ERP transport routier avec TMS, planning chauffeurs, gestion flotte et facturation.",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EUR",
      "price": "0",
      "description": "Démo gratuite disponible"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NEXORA",
      "url": "https://nexora-truck.fr"
    }
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### 3.4 Balises meta par page (hook React)

```tsx
// src/hooks/usePageMeta.ts
import { useEffect } from 'react'

interface PageMeta {
  title: string           // ≤ 60 chars
  description: string     // 70-155 chars
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
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
    ?? Object.assign(document.createElement('meta'), {
        [name.startsWith('og:') ? 'property' : 'name']: name
       })
  el.setAttribute('content', content)
  if (!el.parentNode) document.head.appendChild(el)
}
function setLink(rel: string, href: string) {
  const el = document.querySelector(`link[rel="${rel}"]`)
    ?? Object.assign(document.createElement('link'), { rel })
  el.setAttribute('href', href)
  if (!el.parentNode) document.head.appendChild(el)
}
```

```tsx
// Usage dans une page
export default function DemoAccess() {
  usePageMeta({
    title: 'Demande de démo gratuite',
    description: 'Testez NEXORA Truck gratuitement — ERP transport routier avec planning, TMS et facturation. Accès démo immédiat, sans engagement.',
    canonical: 'https://nexora-truck.fr/demo',
  })
  // …
}
```

---

## 4. Sécurité

### 4.1 Checklist

| # | Point | Action |
|---|-------|--------|
| S1 | HTTPS | Netlify active TLS automatiquement ✅ |
| S2 | HSTS | Ajouter header dans `netlify.toml` |
| S3 | CSP | Définir via header Netlify (voir ci-dessous) |
| S4 | Secrets | Variables d'env dans l'UI Netlify, jamais dans le code |
| S5 | RLS Supabase | Activer sur toutes les tables (voir `supabase/migrations/`) |
| S6 | CSRF Supabase | Utiliser les sessions JWT Supabase (`supabase.auth.getSession()`) |
| S7 | Clés publiques | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en VITE_ uniquement |
| S8 | Clés secrètes | `SUPABASE_SERVICE_ROLE_KEY` **uniquement** côté Netlify Functions |
| S9 | Dépendances | `npm audit --audit-level=moderate` en CI |
| S10 | clickjacking | Header `X-Frame-Options: DENY` |

### 4.2 `netlify.toml` complet avec headers de sécurité et edge function

```toml
# netlify.toml (racine du dépôt)
[build]
  base    = "erp2"
  command = "npm run build"
  publish = "erp2/dist"

[dev]
  framework  = "#custom"
  command    = "npm run dev"
  targetPort = 5173
  port       = 8888

# ─── Variables d'environnement (surcharger dans l'UI Netlify) ──────────────
[build.environment]
  NODE_VERSION = "20"
  # Ne JAMAIS mettre les vraies valeurs ici — utiliser l'UI Netlify :
  # SUPABASE_SERVICE_ROLE_KEY = "..."
  # ANTHROPIC_API_KEY         = "..."
  # VITE_SUPABASE_URL         = "https://xxxx.supabase.co"
  # VITE_SUPABASE_ANON_KEY    = "eyJ..."

# ─── Headers de sécurité globaux ──────────────────────────────────────────
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options           = "DENY"
    X-Content-Type-Options    = "nosniff"
    X-XSS-Protection          = "1; mode=block"
    Referrer-Policy           = "strict-origin-when-cross-origin"
    Permissions
```


## License: MIT
https://github.com/aqrun/aqrun.github.io/blob/4bdf46c310df8a741f88816c656529940eeb02da/themes/abridge/netlify.toml

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://nexora-truck.fr/demo</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Ajouter une entrée par page publique -->
</urlset>
```

### 3.2 `robots.txt`

```txt
# erp2/public/robots.txt
User-agent: *
Allow: /
Disallow: /login
Disallow: /admin
Disallow: /super-admin
Disallow: /.netlify/

Sitemap: https://nexora-truck.fr/sitemap.xml
```

### 3.3 Données structurées (JSON-LD) — page produit

```tsx
// src/components/SoftwareJsonLd.tsx
export function SoftwareJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NEXORA Truck",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://nexora-truck.fr",
    "description": "ERP transport routier avec TMS, planning chauffeurs, gestion flotte et facturation.",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EUR",
      "price": "0",
      "description": "Démo gratuite disponible"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NEXORA",
      "url": "https://nexora-truck.fr"
    }
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### 3.4 Balises meta par page (hook React)

```tsx
// src/hooks/usePageMeta.ts
import { useEffect } from 'react'

interface PageMeta {
  title: string           // ≤ 60 chars
  description: string     // 70-155 chars
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
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
    ?? Object.assign(document.createElement('meta'), {
        [name.startsWith('og:') ? 'property' : 'name']: name
       })
  el.setAttribute('content', content)
  if (!el.parentNode) document.head.appendChild(el)
}
function setLink(rel: string, href: string) {
  const el = document.querySelector(`link[rel="${rel}"]`)
    ?? Object.assign(document.createElement('link'), { rel })
  el.setAttribute('href', href)
  if (!el.parentNode) document.head.appendChild(el)
}
```

```tsx
// Usage dans une page
export default function DemoAccess() {
  usePageMeta({
    title: 'Demande de démo gratuite',
    description: 'Testez NEXORA Truck gratuitement — ERP transport routier avec planning, TMS et facturation. Accès démo immédiat, sans engagement.',
    canonical: 'https://nexora-truck.fr/demo',
  })
  // …
}
```

---

## 4. Sécurité

### 4.1 Checklist

| # | Point | Action |
|---|-------|--------|
| S1 | HTTPS | Netlify active TLS automatiquement ✅ |
| S2 | HSTS | Ajouter header dans `netlify.toml` |
| S3 | CSP | Définir via header Netlify (voir ci-dessous) |
| S4 | Secrets | Variables d'env dans l'UI Netlify, jamais dans le code |
| S5 | RLS Supabase | Activer sur toutes les tables (voir `supabase/migrations/`) |
| S6 | CSRF Supabase | Utiliser les sessions JWT Supabase (`supabase.auth.getSession()`) |
| S7 | Clés publiques | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en VITE_ uniquement |
| S8 | Clés secrètes | `SUPABASE_SERVICE_ROLE_KEY` **uniquement** côté Netlify Functions |
| S9 | Dépendances | `npm audit --audit-level=moderate` en CI |
| S10 | clickjacking | Header `X-Frame-Options: DENY` |

### 4.2 `netlify.toml` complet avec headers de sécurité et edge function

```toml
# netlify.toml (racine du dépôt)
[build]
  base    = "erp2"
  command = "npm run build"
  publish = "erp2/dist"

[dev]
  framework  = "#custom"
  command    = "npm run dev"
  targetPort = 5173
  port       = 8888

# ─── Variables d'environnement (surcharger dans l'UI Netlify) ──────────────
[build.environment]
  NODE_VERSION = "20"
  # Ne JAMAIS mettre les vraies valeurs ici — utiliser l'UI Netlify :
  # SUPABASE_SERVICE_ROLE_KEY = "..."
  # ANTHROPIC_API_KEY         = "..."
  # VITE_SUPABASE_URL         = "https://xxxx.supabase.co"
  # VITE_SUPABASE_ANON_KEY    = "eyJ..."

# ─── Headers de sécurité globaux ──────────────────────────────────────────
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options           = "DENY"
    X-Content-Type-Options    = "nosniff"
    X-XSS-Protection          = "1; mode=block"
    Referrer-Policy           = "strict-origin-when-cross-origin"
    Permissions
```


## License: MIT
https://github.com/aqrun/aqrun.github.io/blob/4bdf46c310df8a741f88816c656529940eeb02da/themes/abridge/netlify.toml

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://nexora-truck.fr/demo</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Ajouter une entrée par page publique -->
</urlset>
```

### 3.2 `robots.txt`

```txt
# erp2/public/robots.txt
User-agent: *
Allow: /
Disallow: /login
Disallow: /admin
Disallow: /super-admin
Disallow: /.netlify/

Sitemap: https://nexora-truck.fr/sitemap.xml
```

### 3.3 Données structurées (JSON-LD) — page produit

```tsx
// src/components/SoftwareJsonLd.tsx
export function SoftwareJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NEXORA Truck",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://nexora-truck.fr",
    "description": "ERP transport routier avec TMS, planning chauffeurs, gestion flotte et facturation.",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EUR",
      "price": "0",
      "description": "Démo gratuite disponible"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NEXORA",
      "url": "https://nexora-truck.fr"
    }
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### 3.4 Balises meta par page (hook React)

```tsx
// src/hooks/usePageMeta.ts
import { useEffect } from 'react'

interface PageMeta {
  title: string           // ≤ 60 chars
  description: string     // 70-155 chars
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
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
    ?? Object.assign(document.createElement('meta'), {
        [name.startsWith('og:') ? 'property' : 'name']: name
       })
  el.setAttribute('content', content)
  if (!el.parentNode) document.head.appendChild(el)
}
function setLink(rel: string, href: string) {
  const el = document.querySelector(`link[rel="${rel}"]`)
    ?? Object.assign(document.createElement('link'), { rel })
  el.setAttribute('href', href)
  if (!el.parentNode) document.head.appendChild(el)
}
```

```tsx
// Usage dans une page
export default function DemoAccess() {
  usePageMeta({
    title: 'Demande de démo gratuite',
    description: 'Testez NEXORA Truck gratuitement — ERP transport routier avec planning, TMS et facturation. Accès démo immédiat, sans engagement.',
    canonical: 'https://nexora-truck.fr/demo',
  })
  // …
}
```

---

## 4. Sécurité

### 4.1 Checklist

| # | Point | Action |
|---|-------|--------|
| S1 | HTTPS | Netlify active TLS automatiquement ✅ |
| S2 | HSTS | Ajouter header dans `netlify.toml` |
| S3 | CSP | Définir via header Netlify (voir ci-dessous) |
| S4 | Secrets | Variables d'env dans l'UI Netlify, jamais dans le code |
| S5 | RLS Supabase | Activer sur toutes les tables (voir `supabase/migrations/`) |
| S6 | CSRF Supabase | Utiliser les sessions JWT Supabase (`supabase.auth.getSession()`) |
| S7 | Clés publiques | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en VITE_ uniquement |
| S8 | Clés secrètes | `SUPABASE_SERVICE_ROLE_KEY` **uniquement** côté Netlify Functions |
| S9 | Dépendances | `npm audit --audit-level=moderate` en CI |
| S10 | clickjacking | Header `X-Frame-Options: DENY` |

### 4.2 `netlify.toml` complet avec headers de sécurité et edge function

```toml
# netlify.toml (racine du dépôt)
[build]
  base    = "erp2"
  command = "npm run build"
  publish = "erp2/dist"

[dev]
  framework  = "#custom"
  command    = "npm run dev"
  targetPort = 5173
  port       = 8888

# ─── Variables d'environnement (surcharger dans l'UI Netlify) ──────────────
[build.environment]
  NODE_VERSION = "20"
  # Ne JAMAIS mettre les vraies valeurs ici — utiliser l'UI Netlify :
  # SUPABASE_SERVICE_ROLE_KEY = "..."
  # ANTHROPIC_API_KEY         = "..."
  # VITE_SUPABASE_URL         = "https://xxxx.supabase.co"
  # VITE_SUPABASE_ANON_KEY    = "eyJ..."

# ─── Headers de sécurité globaux ──────────────────────────────────────────
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options           = "DENY"
    X-Content-Type-Options    = "nosniff"
    X-XSS-Protection          = "1; mode=block"
    Referrer-Policy           = "strict-origin-when-cross-origin"
    Permissions
```


## License: MIT
https://github.com/aqrun/aqrun.github.io/blob/4bdf46c310df8a741f88816c656529940eeb02da/themes/abridge/netlify.toml

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://nexora-truck.fr/demo</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Ajouter une entrée par page publique -->
</urlset>
```

### 3.2 `robots.txt`

```txt
# erp2/public/robots.txt
User-agent: *
Allow: /
Disallow: /login
Disallow: /admin
Disallow: /super-admin
Disallow: /.netlify/

Sitemap: https://nexora-truck.fr/sitemap.xml
```

### 3.3 Données structurées (JSON-LD) — page produit

```tsx
// src/components/SoftwareJsonLd.tsx
export function SoftwareJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NEXORA Truck",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://nexora-truck.fr",
    "description": "ERP transport routier avec TMS, planning chauffeurs, gestion flotte et facturation.",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EUR",
      "price": "0",
      "description": "Démo gratuite disponible"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NEXORA",
      "url": "https://nexora-truck.fr"
    }
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### 3.4 Balises meta par page (hook React)

```tsx
// src/hooks/usePageMeta.ts
import { useEffect } from 'react'

interface PageMeta {
  title: string           // ≤ 60 chars
  description: string     // 70-155 chars
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
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
    ?? Object.assign(document.createElement('meta'), {
        [name.startsWith('og:') ? 'property' : 'name']: name
       })
  el.setAttribute('content', content)
  if (!el.parentNode) document.head.appendChild(el)
}
function setLink(rel: string, href: string) {
  const el = document.querySelector(`link[rel="${rel}"]`)
    ?? Object.assign(document.createElement('link'), { rel })
  el.setAttribute('href', href)
  if (!el.parentNode) document.head.appendChild(el)
}
```

```tsx
// Usage dans une page
export default function DemoAccess() {
  usePageMeta({
    title: 'Demande de démo gratuite',
    description: 'Testez NEXORA Truck gratuitement — ERP transport routier avec planning, TMS et facturation. Accès démo immédiat, sans engagement.',
    canonical: 'https://nexora-truck.fr/demo',
  })
  // …
}
```

---

## 4. Sécurité

### 4.1 Checklist

| # | Point | Action |
|---|-------|--------|
| S1 | HTTPS | Netlify active TLS automatiquement ✅ |
| S2 | HSTS | Ajouter header dans `netlify.toml` |
| S3 | CSP | Définir via header Netlify (voir ci-dessous) |
| S4 | Secrets | Variables d'env dans l'UI Netlify, jamais dans le code |
| S5 | RLS Supabase | Activer sur toutes les tables (voir `supabase/migrations/`) |
| S6 | CSRF Supabase | Utiliser les sessions JWT Supabase (`supabase.auth.getSession()`) |
| S7 | Clés publiques | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en VITE_ uniquement |
| S8 | Clés secrètes | `SUPABASE_SERVICE_ROLE_KEY` **uniquement** côté Netlify Functions |
| S9 | Dépendances | `npm audit --audit-level=moderate` en CI |
| S10 | clickjacking | Header `X-Frame-Options: DENY` |

### 4.2 `netlify.toml` complet avec headers de sécurité et edge function

```toml
# netlify.toml (racine du dépôt)
[build]
  base    = "erp2"
  command = "npm run build"
  publish = "erp2/dist"

[dev]
  framework  = "#custom"
  command    = "npm run dev"
  targetPort = 5173
  port       = 8888

# ─── Variables d'environnement (surcharger dans l'UI Netlify) ──────────────
[build.environment]
  NODE_VERSION = "20"
  # Ne JAMAIS mettre les vraies valeurs ici — utiliser l'UI Netlify :
  # SUPABASE_SERVICE_ROLE_KEY = "..."
  # ANTHROPIC_API_KEY         = "..."
  # VITE_SUPABASE_URL         = "https://xxxx.supabase.co"
  # VITE_SUPABASE_ANON_KEY    = "eyJ..."

# ─── Headers de sécurité globaux ──────────────────────────────────────────
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options           = "DENY"
    X-Content-Type-Options    = "nosniff"
    X-XSS-Protection          = "1; mode=block"
    Referrer-Policy           = "strict-origin-when-cross-origin"
    Permissions
```


## License: MIT
https://github.com/aqrun/aqrun.github.io/blob/4bdf46c310df8a741f88816c656529940eeb02da/themes/abridge/netlify.toml

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://nexora-truck.fr/demo</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Ajouter une entrée par page publique -->
</urlset>
```

### 3.2 `robots.txt`

```txt
# erp2/public/robots.txt
User-agent: *
Allow: /
Disallow: /login
Disallow: /admin
Disallow: /super-admin
Disallow: /.netlify/

Sitemap: https://nexora-truck.fr/sitemap.xml
```

### 3.3 Données structurées (JSON-LD) — page produit

```tsx
// src/components/SoftwareJsonLd.tsx
export function SoftwareJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NEXORA Truck",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://nexora-truck.fr",
    "description": "ERP transport routier avec TMS, planning chauffeurs, gestion flotte et facturation.",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EUR",
      "price": "0",
      "description": "Démo gratuite disponible"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NEXORA",
      "url": "https://nexora-truck.fr"
    }
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### 3.4 Balises meta par page (hook React)

```tsx
// src/hooks/usePageMeta.ts
import { useEffect } from 'react'

interface PageMeta {
  title: string           // ≤ 60 chars
  description: string     // 70-155 chars
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
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
    ?? Object.assign(document.createElement('meta'), {
        [name.startsWith('og:') ? 'property' : 'name']: name
       })
  el.setAttribute('content', content)
  if (!el.parentNode) document.head.appendChild(el)
}
function setLink(rel: string, href: string) {
  const el = document.querySelector(`link[rel="${rel}"]`)
    ?? Object.assign(document.createElement('link'), { rel })
  el.setAttribute('href', href)
  if (!el.parentNode) document.head.appendChild(el)
}
```

```tsx
// Usage dans une page
export default function DemoAccess() {
  usePageMeta({
    title: 'Demande de démo gratuite',
    description: 'Testez NEXORA Truck gratuitement — ERP transport routier avec planning, TMS et facturation. Accès démo immédiat, sans engagement.',
    canonical: 'https://nexora-truck.fr/demo',
  })
  // …
}
```

---

## 4. Sécurité

### 4.1 Checklist

| # | Point | Action |
|---|-------|--------|
| S1 | HTTPS | Netlify active TLS automatiquement ✅ |
| S2 | HSTS | Ajouter header dans `netlify.toml` |
| S3 | CSP | Définir via header Netlify (voir ci-dessous) |
| S4 | Secrets | Variables d'env dans l'UI Netlify, jamais dans le code |
| S5 | RLS Supabase | Activer sur toutes les tables (voir `supabase/migrations/`) |
| S6 | CSRF Supabase | Utiliser les sessions JWT Supabase (`supabase.auth.getSession()`) |
| S7 | Clés publiques | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en VITE_ uniquement |
| S8 | Clés secrètes | `SUPABASE_SERVICE_ROLE_KEY` **uniquement** côté Netlify Functions |
| S9 | Dépendances | `npm audit --audit-level=moderate` en CI |
| S10 | clickjacking | Header `X-Frame-Options: DENY` |

### 4.2 `netlify.toml` complet avec headers de sécurité et edge function

```toml
# netlify.toml (racine du dépôt)
[build]
  base    = "erp2"
  command = "npm run build"
  publish = "erp2/dist"

[dev]
  framework  = "#custom"
  command    = "npm run dev"
  targetPort = 5173
  port       = 8888

# ─── Variables d'environnement (surcharger dans l'UI Netlify) ──────────────
[build.environment]
  NODE_VERSION = "20"
  # Ne JAMAIS mettre les vraies valeurs ici — utiliser l'UI Netlify :
  # SUPABASE_SERVICE_ROLE_KEY = "..."
  # ANTHROPIC_API_KEY         = "..."
  # VITE_SUPABASE_URL         = "https://xxxx.supabase.co"
  # VITE_SUPABASE_ANON_KEY    = "eyJ..."

# ─── Headers de sécurité globaux ──────────────────────────────────────────
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options           = "DENY"
    X-Content-Type-Options    = "nosniff"
    X-XSS-Protection          = "1; mode=block"
    Referrer-Policy           = "strict-origin-when-cross-origin"
    Permissions
```


## License: MIT
https://github.com/aqrun/aqrun.github.io/blob/4bdf46c310df8a741f88816c656529940eeb02da/themes/abridge/netlify.toml

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://nexora-truck.fr/demo</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Ajouter une entrée par page publique -->
</urlset>
```

### 3.2 `robots.txt`

```txt
# erp2/public/robots.txt
User-agent: *
Allow: /
Disallow: /login
Disallow: /admin
Disallow: /super-admin
Disallow: /.netlify/

Sitemap: https://nexora-truck.fr/sitemap.xml
```

### 3.3 Données structurées (JSON-LD) — page produit

```tsx
// src/components/SoftwareJsonLd.tsx
export function SoftwareJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NEXORA Truck",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://nexora-truck.fr",
    "description": "ERP transport routier avec TMS, planning chauffeurs, gestion flotte et facturation.",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EUR",
      "price": "0",
      "description": "Démo gratuite disponible"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NEXORA",
      "url": "https://nexora-truck.fr"
    }
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### 3.4 Balises meta par page (hook React)

```tsx
// src/hooks/usePageMeta.ts
import { useEffect } from 'react'

interface PageMeta {
  title: string           // ≤ 60 chars
  description: string     // 70-155 chars
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
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
    ?? Object.assign(document.createElement('meta'), {
        [name.startsWith('og:') ? 'property' : 'name']: name
       })
  el.setAttribute('content', content)
  if (!el.parentNode) document.head.appendChild(el)
}
function setLink(rel: string, href: string) {
  const el = document.querySelector(`link[rel="${rel}"]`)
    ?? Object.assign(document.createElement('link'), { rel })
  el.setAttribute('href', href)
  if (!el.parentNode) document.head.appendChild(el)
}
```

```tsx
// Usage dans une page
export default function DemoAccess() {
  usePageMeta({
    title: 'Demande de démo gratuite',
    description: 'Testez NEXORA Truck gratuitement — ERP transport routier avec planning, TMS et facturation. Accès démo immédiat, sans engagement.',
    canonical: 'https://nexora-truck.fr/demo',
  })
  // …
}
```

---

## 4. Sécurité

### 4.1 Checklist

| # | Point | Action |
|---|-------|--------|
| S1 | HTTPS | Netlify active TLS automatiquement ✅ |
| S2 | HSTS | Ajouter header dans `netlify.toml` |
| S3 | CSP | Définir via header Netlify (voir ci-dessous) |
| S4 | Secrets | Variables d'env dans l'UI Netlify, jamais dans le code |
| S5 | RLS Supabase | Activer sur toutes les tables (voir `supabase/migrations/`) |
| S6 | CSRF Supabase | Utiliser les sessions JWT Supabase (`supabase.auth.getSession()`) |
| S7 | Clés publiques | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en VITE_ uniquement |
| S8 | Clés secrètes | `SUPABASE_SERVICE_ROLE_KEY` **uniquement** côté Netlify Functions |
| S9 | Dépendances | `npm audit --audit-level=moderate` en CI |
| S10 | clickjacking | Header `X-Frame-Options: DENY` |

### 4.2 `netlify.toml` complet avec headers de sécurité et edge function

```toml
# netlify.toml (racine du dépôt)
[build]
  base    = "erp2"
  command = "npm run build"
  publish = "erp2/dist"

[dev]
  framework  = "#custom"
  command    = "npm run dev"
  targetPort = 5173
  port       = 8888

# ─── Variables d'environnement (surcharger dans l'UI Netlify) ──────────────
[build.environment]
  NODE_VERSION = "20"
  # Ne JAMAIS mettre les vraies valeurs ici — utiliser l'UI Netlify :
  # SUPABASE_SERVICE_ROLE_KEY = "..."
  # ANTHROPIC_API_KEY         = "..."
  # VITE_SUPABASE_URL         = "https://xxxx.supabase.co"
  # VITE_SUPABASE_ANON_KEY    = "eyJ..."

# ─── Headers de sécurité globaux ──────────────────────────────────────────
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options           = "DENY"
    X-Content-Type-Options    = "nosniff"
    X-XSS-Protection          = "1; mode=block"
    Referrer-Policy           = "strict-origin-when-cross-origin"
    Permissions
```


## License: MIT
https://github.com/aqrun/aqrun.github.io/blob/4bdf46c310df8a741f88816c656529940eeb02da/themes/abridge/netlify.toml

```
Voici le plan complet, prêt à copier dans un README ou GitHub Issue.

---

# Plan d'amélioration — nexora-truck.fr

> Stack : React 19 · Vite 8 · TailwindCSS 4 · Supabase · Netlify  
> Date : 7 avril 2026

---

## 1. Performance (Lighthouse ≥ 90, bundle < 200 kB, FCP < 2 s, LCP < 2.5 s)

### 1.1 Vite — tree-shaking, chunking, preload

```ts
// erp2/vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), splitVendorChunkPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,   // alerte si chunk > 200 kB
    rollupOptions: {
      output: {
        // Préchargement automatique des chunks critiques
        experimentalMinChunkSize: 10_000,
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
            return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/'))
            return 'vendor-router'
          if (id.includes('node_modules/@supabase/'))
            return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/'))
            return 'vendor-leaflet'   // chargé dynamiquement sur /map
          if (id.includes('node_modules/jspdf/'))
            return 'vendor-pdf'       // chargé dynamiquement sur /facturation
          if (id.includes('node_modules/@anthropic-ai/'))
            return 'vendor-ai'        // gros SDK, lazy-load uniquement
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### 1.2 Code-splitting & dynamic imports

```tsx
// erp2/src/App.tsx  – pattern uniforme sur toutes les routes lourdes
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const MapLive      = lazy(() => import('@/pages/MapLive'))
const Facturation  = lazy(() => import('@/pages/Facturation'))
const Tachygraphe  = lazy(() => import('@/pages/Tachygraphe'))
const InterErp     = lazy(() => import('@/pages/InterErp'))
const OllamaChat   = lazy(() => import('@/components/OllamaChat'))

// Toutes les autres pages également en lazy :
const Planning     = lazy(() => import('@/pages/Planning'))
const Transports   = lazy(() => import('@/pages/Transports'))
// … etc.

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">
      <span className="sr-only">Chargement…</span>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
    </div>}>
      <Routes>
        <Route path="/map"         element={<MapLive />} />
        <Route path="/facturation" element={<Facturation />} />
        {/* … */}
      </Routes>
    </Suspense>
  )
}
```

### 1.3 Préchargement du hero (index.html)

```html
<!-- erp2/index.html – dans <head>, après les meta existantes -->
<!-- Précharge le hero LCP avant que le CSS soit parsé -->
<link rel="preload" as="image"
      href="/site/screenshots/planning-dark.webp"
      fetchpriority="high" />
<!-- Précharge la police si custom font utilisée -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/inter-var.woff2" crossorigin="anonymous" />
<!-- DNS prefetch Supabase & CDN -->
<link rel="dns-prefetch" href="https://xxxxxxxxxxxx.supabase.co" />
<link rel="preconnect" href="https://xxxxxxxxxxxx.supabase.co" crossorigin />
```

### 1.4 Lazy-load images React

```tsx
// src/components/ui/LazyImage.tsx
interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LazyImage({ src, alt, width, height, className, priority }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : 'auto'}
    />
  )
}
```

> **Conversion WebP** : `npx sharp-cli --input "public/site/screenshots/*.png" --output "public/site/screenshots/" --format webp --quality 80`

### 1.5 Mesure Lighthouse

```bash
# Installation une seule fois
npm install -g lighthouse

# Audit headless (production build)
cd erp2 && npm run build && npx serve dist &
lighthouse http://localhost:3000 \
  --output=html --output-path=lighthouse-report.html \
  --chrome-flags="--headless" \
  --preset=desktop

# Interprétation des scores :
# Performance  ≥ 90 → objectif atteint
# FCP          < 2 s  → First Contentful Paint
# LCP          < 2.5 s → Largest Contentful Paint
# TBT          < 200 ms → Total Blocking Time (proxy TTI)
# CLS          < 0.1   → Cumulative Layout Shift
# SI           < 3.4 s → Speed Index
```

---

## 2. Accessibilité (WCAG 2.1 AA, score ≥ 90)

### 2.1 Checklist de remédiation

| # | Critère | Remédiation |
|---|---------|-------------|
| A1 | `<img>` sans `alt` | Ajouter `alt` descriptif ou `alt=""` si décoratif |
| A2 | Contraste texte < 4.5:1 | Ajuster les tokens Tailwind (`text-slate-700` sur fond blanc) |
| A3 | Boutons icône sans label | Ajouter `aria-label="Fermer"` ou `<span class="sr-only">` |
| A4 | `<div>` cliquable | Remplacer par `<button type="button">` |
| A5 | Focus visible absent | `focus-visible:ring-2 focus-visible:ring-primary` via Tailwind |
| A6 | Formulaires sans `<label>` | Associer `for`/`id` ou `aria-labelledby` |
| A7 | Couleur seule comme information | Accompagner d'une icône ou d'un texte |
| A8 | Spinner sans texte SR | `<span class="sr-only">Chargement en cours</span>` |
| A9 | `<html lang="">` absent | `<html lang="fr">` ✅ déjà présent |
| A10 | Skip link manquant | Ajouter avant `<header>` |

```html
<!-- erp2/index.html – premier enfant de <body> -->
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
          focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2
          focus:text-primary focus:outline focus:outline-2">
  Aller au contenu principal
</a>
<div id="main-content"> … </div>
```

### 2.2 Audit automatique

```bash
npx axe-core-cli http://localhost:3000 --exit
# ou avec pa11y :
npx pa11y http://localhost:3000 --standard WCAG2AA --reporter cli
```

---

## 3. SEO

### 3.1 `sitemap.xml` (déjà présent — vérifier les URLs)

```xml
<!-- erp2/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nexora-truck.fr/</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://nexora-truck.fr/demo</loc>
    <lastmod>2026-04-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Ajouter une entrée par page publique -->
</urlset>
```

### 3.2 `robots.txt`

```txt
# erp2/public/robots.txt
User-agent: *
Allow: /
Disallow: /login
Disallow: /admin
Disallow: /super-admin
Disallow: /.netlify/

Sitemap: https://nexora-truck.fr/sitemap.xml
```

### 3.3 Données structurées (JSON-LD) — page produit

```tsx
// src/components/SoftwareJsonLd.tsx
export function SoftwareJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NEXORA Truck",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://nexora-truck.fr",
    "description": "ERP transport routier avec TMS, planning chauffeurs, gestion flotte et facturation.",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EUR",
      "price": "0",
      "description": "Démo gratuite disponible"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NEXORA",
      "url": "https://nexora-truck.fr"
    }
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### 3.4 Balises meta par page (hook React)

```tsx
// src/hooks/usePageMeta.ts
import { useEffect } from 'react'

interface PageMeta {
  title: string           // ≤ 60 chars
  description: string     // 70-155 chars
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
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
    ?? Object.assign(document.createElement('meta'), {
        [name.startsWith('og:') ? 'property' : 'name']: name
       })
  el.setAttribute('content', content)
  if (!el.parentNode) document.head.appendChild(el)
}
function setLink(rel: string, href: string) {
  const el = document.querySelector(`link[rel="${rel}"]`)
    ?? Object.assign(document.createElement('link'), { rel })
  el.setAttribute('href', href)
  if (!el.parentNode) document.head.appendChild(el)
}
```

```tsx
// Usage dans une page
export default function DemoAccess() {
  usePageMeta({
    title: 'Demande de démo gratuite',
    description: 'Testez NEXORA Truck gratuitement — ERP transport routier avec planning, TMS et facturation. Accès démo immédiat, sans engagement.',
    canonical: 'https://nexora-truck.fr/demo',
  })
  // …
}
```

---

## 4. Sécurité

### 4.1 Checklist

| # | Point | Action |
|---|-------|--------|
| S1 | HTTPS | Netlify active TLS automatiquement ✅ |
| S2 | HSTS | Ajouter header dans `netlify.toml` |
| S3 | CSP | Définir via header Netlify (voir ci-dessous) |
| S4 | Secrets | Variables d'env dans l'UI Netlify, jamais dans le code |
| S5 | RLS Supabase | Activer sur toutes les tables (voir `supabase/migrations/`) |
| S6 | CSRF Supabase | Utiliser les sessions JWT Supabase (`supabase.auth.getSession()`) |
| S7 | Clés publiques | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en VITE_ uniquement |
| S8 | Clés secrètes | `SUPABASE_SERVICE_ROLE_KEY` **uniquement** côté Netlify Functions |
| S9 | Dépendances | `npm audit --audit-level=moderate` en CI |
| S10 | clickjacking | Header `X-Frame-Options: DENY` |

### 4.2 `netlify.toml` complet avec headers de sécurité et edge function

```toml
# netlify.toml (racine du dépôt)
[build]
  base    = "erp2"
  command = "npm run build"
  publish = "erp2/dist"

[dev]
  framework  = "#custom"
  command    = "npm run dev"
  targetPort = 5173
  port       = 8888

# ─── Variables d'environnement (surcharger dans l'UI Netlify) ──────────────
[build.environment]
  NODE_VERSION = "20"
  # Ne JAMAIS mettre les vraies valeurs ici — utiliser l'UI Netlify :
  # SUPABASE_SERVICE_ROLE_KEY = "..."
  # ANTHROPIC_API_KEY         = "..."
  # VITE_SUPABASE_URL         = "https://xxxx.supabase.co"
  # VITE_SUPABASE_ANON_KEY    = "eyJ..."

# ─── Headers de sécurité globaux ──────────────────────────────────────────
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options           = "DENY"
    X-Content-Type-Options    = "nosniff"
    X-XSS-Protection          = "1; mode=block"
    Referrer-Policy           = "strict-origin-when-cross-origin"
    Permissions-Policy        = "camera=(), microphone=(), geolocation=(
```


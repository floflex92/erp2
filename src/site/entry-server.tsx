import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getPublicSiteRoutesSsr } from '@/site/publicRoutes.ssr'

export function render(url: string) {
  return renderToString(
    <StaticRouter location={url}>
      <Routes>
        {getPublicSiteRoutesSsr()}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StaticRouter>,
  )
}

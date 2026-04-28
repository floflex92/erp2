import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getPublicSiteRoutes } from '@/site/publicRoutes'

export function render(url: string) {
  return renderToString(
    <StaticRouter location={url}>
      <Routes>
        {getPublicSiteRoutes()}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StaticRouter>,
  )
}

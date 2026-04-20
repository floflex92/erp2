import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

type ScrollToTopProps = {
  behavior?: ScrollBehavior
  includeSearch?: boolean
  includeHash?: boolean
}

export default function ScrollToTop({
  behavior = 'auto',
  includeSearch = true,
  includeHash = false,
}: ScrollToTopProps) {
  const { pathname, search, hash } = useLocation()

  const routeKey = `${pathname}${includeSearch ? search : ''}${includeHash ? hash : ''}`

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior })
    } catch {
      window.scrollTo(0, 0)
    }
  }, [routeKey, behavior])

  return null
}

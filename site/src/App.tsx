import { useEffect, useState } from 'react'

import { ApiPage } from './pages/ApiPage'
import { OverviewDashboard } from './pages/OverviewDashboard'

type Route = 'overview' | 'api'

function readRoute(): Route {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/api') return 'api'
  return 'overview'
}

/** Push a clean (hash-free) path and re-render. */
export function navigate(path: string) {
  if (path === window.location.pathname) return
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const onPop = () => setRoute(readRoute())
    // Intercept same-origin link clicks so internal nav stays a client-side
    // push (clean URLs, no full reload). External / modified clicks pass through.
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      const anchor = (event.target as HTMLElement | null)?.closest('a')
      const href = anchor?.getAttribute('href')
      if (
        !anchor ||
        !href ||
        !href.startsWith('/') ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      ) {
        return
      }
      event.preventDefault()
      navigate(href)
    }

    window.addEventListener('popstate', onPop)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('popstate', onPop)
      document.removeEventListener('click', onClick)
    }
  }, [])

  return route
}

export default function App() {
  const route = useRoute()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  if (route === 'api') return <ApiPage />
  return <OverviewDashboard />
}

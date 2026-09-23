import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * lib/useScrollOnNavigate.js
 *
 * In a single-page app the browser never loads a new page — React Router
 * swaps the content inside the same document — so the scroll position
 * carries over from page to page. This puts it right:
 *
 *   - Clicking a link (or navigate()) opens the new page at the top.
 *   - Browser Back/Forward returns you to where you were on that page.
 *
 * Returns a callback for AnimatePresence's onExitComplete, so the scroll
 * happens once the old page has faded out, not while it's still visible.
 */
export function useScrollOnNavigate() {
  const location = useLocation()
  const navigationType = useNavigationType() // 'PUSH' | 'REPLACE' | 'POP'
  const positions = useRef({})

  // Take over from the browser's own restoration, which fights with page transitions.
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
  }, [])

  // Remember where you were on a page as you leave it. The cleanup runs on
  // navigation, before the old page has faded out, so scrollY is still its own.
  useLayoutEffect(() => {
    const key = location.key
    return () => {
      positions.current[key] = window.scrollY
    }
  }, [location.key])

  return useCallback(() => {
    const saved = navigationType === 'POP' ? positions.current[location.key] : undefined
    window.scrollTo(0, saved ?? 0)
  }, [navigationType, location.key])
}

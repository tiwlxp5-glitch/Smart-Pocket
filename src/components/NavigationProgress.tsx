'use client'

import React, { useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Custom event to start progress programmatically
const NAV_START_EVENT = 'smartpocket:nav:start'
const NAV_DONE_EVENT = 'smartpocket:nav:done'

export function startNavigationProgress() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NAV_START_EVENT))
  }
}

export function finishNavigationProgress() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NAV_DONE_EVENT))
  }
}

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [opacity, setOpacity] = useState(0)

  // Track active timers to prevent race conditions during rapid navigation
  const timersRef = useRef<{
    trickle: NodeJS.Timeout[]
    fade: NodeJS.Timeout | null
    reset: NodeJS.Timeout | null
    safety: NodeJS.Timeout | null
  }>({
    trickle: [],
    fade: null,
    reset: null,
    safety: null,
  })

  const isNavigatingRef = useRef(false)
  isNavigatingRef.current = isNavigating

  const clearAllTimers = () => {
    timersRef.current.trickle.forEach((t) => clearTimeout(t))
    timersRef.current.trickle = []
    if (timersRef.current.fade) {
      clearTimeout(timersRef.current.fade)
      timersRef.current.fade = null
    }
    if (timersRef.current.reset) {
      clearTimeout(timersRef.current.reset)
      timersRef.current.reset = null
    }
    if (timersRef.current.safety) {
      clearTimeout(timersRef.current.safety)
      timersRef.current.safety = null
    }
  }

  const startProgress = () => {
    clearAllTimers()
    setIsNavigating(true)
    setOpacity(1)
    setProgress(25)

    const t1 = setTimeout(() => {
      setProgress((prev) => (prev < 65 ? 65 : prev))
    }, 200)

    const t2 = setTimeout(() => {
      setProgress((prev) => (prev < 85 ? 85 : prev))
    }, 600)

    const t3 = setTimeout(() => {
      setProgress((prev) => (prev < 92 ? 92 : prev))
    }, 1200)

    // Safety timeout: auto-finish if navigation takes longer than 8s
    const safety = setTimeout(() => {
      completeProgress()
    }, 8000)

    timersRef.current.trickle = [t1, t2, t3]
    timersRef.current.safety = safety
  }

  const completeProgress = () => {
    timersRef.current.trickle.forEach((t) => clearTimeout(t))
    timersRef.current.trickle = []
    if (timersRef.current.safety) {
      clearTimeout(timersRef.current.safety)
      timersRef.current.safety = null
    }

    setProgress(100)

    // Fade out smoothly
    timersRef.current.fade = setTimeout(() => {
      setOpacity(0)
      // Reset state after opacity transition completes
      timersRef.current.reset = setTimeout(() => {
        setIsNavigating(false)
        setProgress(0)
      }, 250)
    }, 200)
  }

  // Complete progress whenever pathname or searchParams change
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (isNavigatingRef.current) {
      completeProgress()
    }
  }, [pathname, searchParams])

  useEffect(() => {
    const handleNavStart = () => {
      startProgress()
    }

    const handleNavDone = () => {
      completeProgress()
    }

    // Intercept clicks on same-origin anchors
    const handleClick = (e: MouseEvent) => {
      // Only primary mouse button without modifier keys
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return

      let target = e.target as HTMLElement | null
      while (target && target.tagName !== 'A') {
        target = target.parentElement
      }

      if (!target || !(target instanceof HTMLAnchorElement)) return

      const href = target.getAttribute('href')
      if (!href) return

      // Ignore hash links, tel, mailto, javascript, external links, downloads, disabled anchors
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        target.target === '_blank' ||
        target.hasAttribute('download') ||
        target.getAttribute('aria-disabled') === 'true'
      ) {
        return
      }

      try {
        const url = new URL(target.href, window.location.href)
        // Check if same origin
        if (url.origin === window.location.origin) {
          const currentUrl = new URL(window.location.href)
          // If navigating to the exact same URL (same pathname and same query string), ignore
          if (url.pathname === currentUrl.pathname && url.search === currentUrl.search) {
            return
          }
          // Start progress bar!
          startProgress()
        }
      } catch {
        // invalid URL
      }
    }

    // Intercept browser Back / Forward navigation
    const handlePopState = () => {
      startProgress()
    }

    window.addEventListener(NAV_START_EVENT, handleNavStart)
    window.addEventListener(NAV_DONE_EVENT, handleNavDone)
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleClick, true)

    return () => {
      clearAllTimers()
      window.removeEventListener(NAV_START_EVENT, handleNavStart)
      window.removeEventListener(NAV_DONE_EVENT, handleNavDone)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleClick, true)
    }
  }, [])

  if (!isNavigating && opacity === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 pointer-events-none z-[99999] transition-opacity duration-300"
      style={{ opacity }}
      aria-hidden="true"
    >
      {/* Glow effect behind the bar */}
      <div
        className="h-[3px] bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 shadow-[0_0_12px_rgba(37,99,235,0.9),0_0_6px_rgba(37,99,235,0.7)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? '150ms' : '300ms',
        }}
      />
      {/* Subtle pulsing indicator in top-right */}
      <div className="fixed top-2.5 right-3 w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  )
}

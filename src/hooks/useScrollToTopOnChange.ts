import { useEffect, useRef } from 'react'

type UseScrollToTopOnChangeOptions = {
  behavior?: ScrollBehavior
  skipFirstRun?: boolean
}

export function useScrollToTopOnChange<T>(
  value: T,
  { behavior = 'auto', skipFirstRun = true }: UseScrollToTopOnChangeOptions = {},
) {
  const firstRunRef = useRef(true)
  const previousValueRef = useRef(value)

  useEffect(() => {
    if (skipFirstRun && firstRunRef.current) {
      firstRunRef.current = false
      previousValueRef.current = value
      return
    }

    if (Object.is(previousValueRef.current, value)) return

    previousValueRef.current = value
    window.scrollTo({ top: 0, left: 0, behavior })
  }, [value, behavior, skipFirstRun])
}

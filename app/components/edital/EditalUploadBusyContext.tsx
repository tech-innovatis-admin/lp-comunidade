'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type EditalUploadBusyContextValue = {
  busy: boolean
  begin: () => void
  end: () => void
}

const EditalUploadBusyContext = createContext<EditalUploadBusyContextValue | null>(null)

export function EditalUploadBusyProvider({ children }: { children: ReactNode }) {
  const [activeCount, setActiveCount] = useState(0)

  const begin = useCallback(() => {
    setActiveCount((count) => count + 1)
  }, [])

  const end = useCallback(() => {
    setActiveCount((count) => Math.max(0, count - 1))
  }, [])

  const value = useMemo(
    () => ({
      busy: activeCount > 0,
      begin,
      end,
    }),
    [activeCount, begin, end]
  )

  return <EditalUploadBusyContext.Provider value={value}>{children}</EditalUploadBusyContext.Provider>
}

export function useEditalUploadBusy(): EditalUploadBusyContextValue {
  const context = useContext(EditalUploadBusyContext)
  if (!context) {
    return {
      busy: false,
      begin: () => undefined,
      end: () => undefined,
    }
  }
  return context
}

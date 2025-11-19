declare global {
  interface Window {
    grecaptcha: {
      reset: (widgetId?: number) => void
      execute: (siteKey: string, options?: { action: string }) => Promise<string>
      ready: (callback: () => void) => void
    }
  }
}

export {}


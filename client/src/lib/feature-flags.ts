/**
 * Feature flags for development and UI configuration
 */

export const featureFlags = {
  // New Chatwoot-style sidebar layout (default ON in development)
  chatwootLayout: import.meta.env.UI_CHATWOOT_LAYOUT !== 'false', // Default true, set to 'false' to disable
  
  // Legacy inbox-first UI (deprecated in favor of chatwootLayout)
  enableNewUI: import.meta.env.VITE_ENABLE_NEW_UI === 'true',
  
  // Performance optimizations
  softphoneStatusPollMs: parseInt(import.meta.env.VITE_SOFTPHONE_STATUS_POLL_MS) || 15000,
  wsDisabledWhenIdle: import.meta.env.VITE_WS_DISABLED_WHEN_IDLE === 'true',
  
  // Debug settings
  debug: import.meta.env.VITE_DEBUG === 'on',
} as const;

export type FeatureFlags = typeof featureFlags;
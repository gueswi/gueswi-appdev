/**
 * Feature flags for development and UI configuration
 */

export const featureFlags = {
  // New Inbox-first UI (Chatwoot/Quo style)
  enableNewUI: import.meta.env.VITE_ENABLE_NEW_UI === 'true',
  
  // Performance optimizations
  softphoneStatusPollMs: parseInt(import.meta.env.VITE_SOFTPHONE_STATUS_POLL_MS) || 8000,
  wsDisabledWhenIdle: import.meta.env.VITE_WS_DISABLED_WHEN_IDLE === 'true',
  
  // Debug settings
  debug: import.meta.env.VITE_DEBUG === 'on',
} as const;

export type FeatureFlags = typeof featureFlags;
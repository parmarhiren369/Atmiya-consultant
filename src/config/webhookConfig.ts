// Environment configuration for webhook URLs
// Set VITE_N8N_WEBHOOK_URL in your .env file
export const config = {
  // n8n Webhook URL - Configure in .env file
  WEBHOOK_URL: import.meta.env.VITE_N8N_WEBHOOK_URL || '',
  
  // Request timeout in milliseconds
  TIMEOUT_MS: 20000, // 20 seconds

  // Debug mode
  DEBUG: import.meta.env.DEV || false,
  
  // Supported file types
  SUPPORTED_FILE_TYPES: ['application/pdf'],
  
  // Maximum file size (in bytes)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};

if (!config.WEBHOOK_URL) {
  console.warn('⚠️ n8n Webhook URL not configured. AI PDF extraction will not work. Set VITE_N8N_WEBHOOK_URL in your .env file');
}

// Helper function to get the webhook URL
export const getWebhookUrl = (): string => {
  // Always use direct URL for now to avoid proxy issues with FormData
  return config.WEBHOOK_URL;
};

// Helper function for logging
export const debugLog = (...args: unknown[]) => {
  if (config.DEBUG) {
    console.log('[AI_DEBUG]', ...args);
  }
};

/**
 * Safe logging utility for external service integrations.
 * NEVER logs passwords, credentials, tokens, or sensitive payloads.
 */
export const integrationLogger = {
  requestStarted(service: string, method: string, endpoint: string) {
    console.log(`[API Integration] [${service}] Request started: ${method} ${endpoint}`);
  },

  requestSuccess(service: string, method: string, endpoint: string, status: number, durationMs: number) {
    console.log(`[API Integration] [${service}] Response: ${method} ${endpoint} -> ${status} (${durationMs}ms)`);
  },

  requestError(service: string, method: string, endpoint: string, errorCategory: string, durationMs: number) {
    console.warn(`[API Integration] [${service}] Error: ${method} ${endpoint} -> ${errorCategory} (${durationMs}ms)`);
  },
};

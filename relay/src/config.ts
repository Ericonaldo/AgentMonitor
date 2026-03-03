export const relayConfig = {
  port: parseInt(process.env.RELAY_PORT || '3457', 10),
  token: process.env.RELAY_TOKEN || '',
  /** Optional domain for nginx proxy mode (not required for direct IP access) */
  domain: process.env.RELAY_DOMAIN || '',
  /** Password for dashboard login (if empty, auth is disabled) */
  password: process.env.RELAY_PASSWORD || '',
};

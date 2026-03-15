require('dotenv').config();

const config = {
  server: {
    port: parseInt(process.env.PORT, 10) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  },

  zoom: {
    accountId: process.env.ZOOM_ACCOUNT_ID,
    clientId: process.env.ZOOM_CLIENT_ID,
    clientSecret: process.env.ZOOM_CLIENT_SECRET,
    tokenUrl: 'https://zoom.us/oauth/token',
    apiBase: 'https://api.zoom.us/v2',
  },

  cache: {
    meetingsTtl: parseInt(process.env.CACHE_TTL_MEETINGS, 10) || 60,
    tokenTtl: 3500, // Zoom tokens last 3600s, refresh 100s early
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
};

// Validate required env vars on startup
function validateConfig() {
  const required = [
    ['ZOOM_ACCOUNT_ID', config.zoom.accountId],
    ['ZOOM_CLIENT_ID', config.zoom.clientId],
    ['ZOOM_CLIENT_SECRET', config.zoom.clientSecret],
  ];

  const missing = required
    .filter(([, val]) => !val)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Copy .env.example to .env and fill in your Zoom credentials.'
    );
  }
}

module.exports = { config, validateConfig };

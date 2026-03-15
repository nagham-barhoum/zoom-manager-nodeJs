/**
 * Zoom Client
 *
 * مسؤول عن:
 * 1. الحصول على Access Token من Zoom
 * 2. توفير axios instance مع interceptors
 * 3. معالجة token انتهى تلقائياً
 * 4. معالجة network timeout
 */

const axios = require('axios');
const { config } = require('../../config');
const cache = require('../cache/memoryCache');
const logger = require('../../utils/logger');
const { ExternalServiceError } = require('../../utils/errors');

const TOKEN_CACHE_KEY = 'zoom:access_token';
const HEALTH_CACHE_KEY = 'zoom:health';
const HEALTH_CACHE_TTL = 15;

const zoomAuthState = {
  ok: true,
  lastChecked: null,
  error: null,
};

// ─── Token Management ─────────────────────────────────────────────────────────

async function fetchAccessToken() {
  const credentials = Buffer.from(
    `${config.zoom.clientId}:${config.zoom.clientSecret}`
  ).toString('base64');

  try {
    const response = await axios.post(
      config.zoom.tokenUrl,
      new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: config.zoom.accountId,
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    if (!response.data?.access_token) {
      throw new ExternalServiceError('Zoom returned invalid token response', {
        service: 'zoom-auth',
      });
    }

    return response.data.access_token;

  } catch (err) {
    // لو هو بالفعل ExternalServiceError — ارميه كما هو
    if (err instanceof ExternalServiceError) throw err;

    // Network / timeout عند جلب التوكن
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      throw new ExternalServiceError('Zoom auth service timeout', {
        service:        'zoom-auth',
        upstreamStatus: null,
        cause:          err,
      });
    }

    const status = err.response?.status;
    const upstreamCode = err.response?.data?.error;
    const message =
      status === 400 || status === 401
        ? 'Invalid Zoom credentials or account configuration'
        : 'Failed to fetch Zoom access token';

    throw new ExternalServiceError(message, {
      service:        'zoom-auth',
      upstreamStatus: status,
      upstreamCode,
      details:        err.response?.data,
      cause:          err,
    });
  }
}

async function getAccessToken() {
  const cached = cache.get(TOKEN_CACHE_KEY);
  if (cached) return cached;

  logger.info('Zoom: Fetching new access token');
  try {
    const token = await fetchAccessToken();
    cache.set(TOKEN_CACHE_KEY, token, config.cache.tokenTtl);
    zoomAuthState.ok = true;
    zoomAuthState.error = null;
    zoomAuthState.lastChecked = Date.now();
    return token;
  } catch (err) {
    zoomAuthState.ok = false;
    zoomAuthState.error = err;
    zoomAuthState.lastChecked = Date.now();
    throw err;
  }
}

// ─── Axios Instance ───────────────────────────────────────────────────────────

const zoomAxios = axios.create({
  baseURL: config.zoom.apiBase,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor — حط التوكن قبل كل request ─────────────────────────

zoomAxios.interceptors.request.use(async (cfg) => {
  const token = await getAccessToken();
  cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ─── Response Interceptor — عالج الأخطاء الشائعة ────────────────────────────

zoomAxios.interceptors.response.use(
  (response) => response, // نجاح — ارجعه كما هو

  async (err) => {
    const status   = err.response?.status;
    const zoomCode = err.response?.data?.code;

    // ── 1: Token انتهى (124) — امسح الكاش وحاول مرة وحدة ──────────────────
    if (status === 401 || zoomCode === 124) {
      logger.warn('Zoom: Token expired — refreshing and retrying');
      cache.invalidate(TOKEN_CACHE_KEY);

      // لو هاد بالفعل retry — ما نكرر للأبد
      if (err.config._retry) {
        throw new ExternalServiceError('Zoom token refresh failed', {
          service:        'zoom',
          upstreamStatus: status,
          upstreamCode:   zoomCode,
          cause:          err,
        });
      }

      // حاول مرة ثانية بتوكن جديد
      err.config._retry = true;
      const newToken = await getAccessToken();
      err.config.headers.Authorization = `Bearer ${newToken}`;
      return zoomAxios(err.config);
    }

    // ── 2: Rate limit من Zoom (429) ────────────────────────────────────────
    if (status === 429) {
      logger.warn('Zoom: Rate limit exceeded');
      throw new ExternalServiceError('Zoom API rate limit exceeded', {
        service:        'zoom',
        upstreamStatus: 429,
        cause:          err,
      });
    }

    // ── 3: Network timeout ─────────────────────────────────────────────────
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      logger.warn('Zoom: Request timeout');
      throw new ExternalServiceError('Zoom API request timed out', {
        service:        'zoom',
        upstreamStatus: null,
        cause:          err,
      });
    }

    // ── 4: Network غير متاح ────────────────────────────────────────────────
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      logger.error('Zoom: Network unreachable');
      throw new ExternalServiceError('Cannot reach Zoom API', {
        service:        'zoom',
        upstreamStatus: null,
        cause:          err,
      });
    }

    // أي خطأ ثاني — ارميه للـ zoomMeetingRepo يتعامل معه
    throw err;
  }
);



// ─── Verify Credentials on Startup ───────────────────────────────────────────
//
// بنستدعيها مرة وحدة عند تشغيل السيرفر
// لو الـ credentials غلط — السيرفر ما يشتغل وبيعطي رسالة واضحة
//
async function verifyZoomCredentials() {
  try {
    logger.info('Zoom: Verifying credentials...');
    await fetchAccessToken();
    logger.info('Zoom: Credentials verified ✅');
    zoomAuthState.ok = true;
    zoomAuthState.error = null;
    zoomAuthState.lastChecked = Date.now();
  } catch (err) {
    logger.error('Zoom: Invalid credentials — check your .env file');
    logger.error('Required: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET');
    zoomAuthState.ok = false;
    zoomAuthState.error = err;
    zoomAuthState.lastChecked = Date.now();
    throw err;
  }
}

// نصدّر الاثنين
function getZoomAuthState() {
  return { ...zoomAuthState };
}

async function checkZoomHealth() {
  const cached = cache.get(HEALTH_CACHE_KEY);
  if (cached) return cached;

  const checkedAt = Date.now();
  try {
    await zoomAxios.get('/users/me/meetings', {
      params: { type: 'upcoming', page_size: 1 },
    });

    const result = { ok: true, checkedAt };
    cache.set(HEALTH_CACHE_KEY, result, HEALTH_CACHE_TTL);
    return result;
  } catch (err) {
    const result = { ok: false, checkedAt, error: err };
    cache.set(HEALTH_CACHE_KEY, result, HEALTH_CACHE_TTL);
    return result;
  }
}

module.exports = { zoomAxios, verifyZoomCredentials, getZoomAuthState, checkZoomHealth };

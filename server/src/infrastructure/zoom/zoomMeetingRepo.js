/**
 * ZoomMeetingRepository
 *
 * بيطبق MeetingRepository Interface باستخدام Zoom API.
 * مسؤول عن:
 * - التحقق من صحة الـ response قبل الاستخدام
 * - معالجة حدود Zoom API
 * - حماية من بيانات غير متوقعة
 */

const MeetingRepository = require('../../interfaces/meetingRepository');
const Meeting           = require('../../entities/meeting');
const { zoomAxios }     = require('./zoomClient');
const cache             = require('../cache/memoryCache');
const logger            = require('../../utils/logger');
const { NotFoundError, ExternalServiceError } = require('../../utils/errors');

const MEETINGS_CACHE_KEY = 'zoom:meetings:list';
const MEETINGS_CACHE_TTL = 30;

// ─── Zoom Limits ──────────────────────────────────────────────────────────────
// حدود Zoom على الحسابات المجانية والمدفوعة
const ZOOM_ERROR_CODES = {
  3161: 'Zoom account has reached the meeting limit',
  300:  'Invalid request to Zoom API',
  3000: 'Zoom API error — check credentials',
};

// ─── Helper — تحويل Zoom response لـ Meeting entity ──────────────────────────
function toMeetingEntity(m) {
  // تحقق إن البيانات الأساسية موجودة
  if (!m?.id || !m?.topic) {
    throw new ExternalServiceError('Zoom returned unexpected meeting format', {
      service: 'zoom',
    });
  }

  return new Meeting({
    id:        m.id,
    topic:     m.topic,
    startTime: m.start_time,
    duration:  m.duration,
    timezone:  m.timezone,
    joinUrl:   m.join_url,
    createdAt: m.created_at,
  });
}

// ─── Helper — معالجة أخطاء Zoom المعروفة ─────────────────────────────────────
function handleZoomError(err) {
  // لو هو بالفعل ExternalServiceError من الـ interceptor — ارميه كما هو
  if (err instanceof ExternalServiceError) throw err;

  const status   = err.response?.status;
  const zoomCode = err.response?.data?.code;

  // حدود Zoom API
  if (ZOOM_ERROR_CODES[zoomCode]) {
    throw new ExternalServiceError(ZOOM_ERROR_CODES[zoomCode], {
      service:        'zoom',
      upstreamStatus: status,
      upstreamCode:   zoomCode,
      cause:          err,
    });
  }

  // أي خطأ ثاني
  throw new ExternalServiceError('Zoom API error', {
    service:        'zoom',
    upstreamStatus: status,
    upstreamCode:   zoomCode,
    cause:          err,
  });
}

// ─── Repository ───────────────────────────────────────────────────────────────

class ZoomMeetingRepository extends MeetingRepository {

  // ── List ──────────────────────────────────────────────────────────────────

  async findAll() {
    const cached = cache.get(MEETINGS_CACHE_KEY);
    if (cached) return cached;

    logger.info('Zoom: Fetching meetings list');

    let response;
    try {
      response = await zoomAxios.get('/users/me/meetings', {
        params: { type: 'upcoming', page_size: 50 },
      });
    } catch (err) {
      handleZoomError(err);
    }

    // تحقق إن الـ response على الشكل المتوقع
    if (!response?.data || typeof response.data !== 'object') {
      throw new ExternalServiceError('Zoom returned unexpected response format', {
        service: 'zoom',
      });
    }

    const meetings = (response.data.meetings || []).map(toMeetingEntity);

    cache.set(MEETINGS_CACHE_KEY, meetings, MEETINGS_CACHE_TTL);
    logger.info(`Zoom: Got ${meetings.length} meetings`);
    return meetings;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create({ topic, startTime, duration, timezone }) {
    logger.info(`Zoom: Creating meeting "${topic}" at ${startTime}`);

    let response;
    try {
      response = await zoomAxios.post('/users/me/meetings', {
        topic,
        type:       2,
        start_time: startTime,
        duration,
        timezone,
        settings: {
          host_video:        true,
          participant_video: true,
          join_before_host:  false,
          waiting_room:      true,
          auto_recording:    'none',
        },
      });
    } catch (err) {
      handleZoomError(err);
    }

    // تحقق إن الـ response رجع بـ id
    if (!response?.data?.id) {
      throw new ExternalServiceError('Zoom did not return meeting ID after creation', {
        service: 'zoom',
      });
    }

    cache.invalidate(MEETINGS_CACHE_KEY);
    return toMeetingEntity(response.data);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async delete(id) {
    logger.info(`Zoom: Deleting meeting ${id}`);

    try {
      await zoomAxios.delete(`/meetings/${id}`);
    } catch (err) {
      const status   = err.response?.status;
      const zoomCode = err.response?.data?.code;

      // 404 أو 3001 = محذوف مسبقاً من Zoom
      if (status === 404 || zoomCode === 3001) {
        logger.warn(`Zoom: Meeting ${id} not found — already deleted externally`);
        cache.invalidate(MEETINGS_CACHE_KEY);
        return { alreadyDeleted: true };
      }

      handleZoomError(err);
    }

    cache.invalidate(MEETINGS_CACHE_KEY);
    return { alreadyDeleted: false };
  }
}

module.exports = ZoomMeetingRepository;

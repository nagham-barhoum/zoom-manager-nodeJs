require('dotenv').config();
const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const compression = require('compression');

const { config, validateConfig } = require('./config');
const logger = require('./utils/logger');

// ─── Validate env on startup ──────────────────────────────────────────────────
try {
  validateConfig();
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}

// ─── Infrastructure ───────────────────────────────────────────────────────────
const ZoomMeetingRepository = require('./infrastructure/zoom/zoomMeetingRepo');
const { verifyZoomCredentials, getZoomAuthState, checkZoomHealth } = require('./infrastructure/zoom/zoomClient');
const { mapError } = require('./utils/errors');

// ─── Use Cases ────────────────────────────────────────────────────────────────
const ListMeetingsUseCase  = require('./use-cases/listMeetings');
const CreateMeetingUseCase = require('./use-cases/createMeeting');
const DeleteMeetingUseCase = require('./use-cases/deleteMeeting');

// ─── Presentation ─────────────────────────────────────────────────────────────
const MeetingController = require('./presentation/controllers/meetingController');
const meetingsRouter    = require('./presentation/routes/meetings');
const errorHandler      = require('./presentation/middleware/errorHandler');
const zoomAuthGuard    = require('./presentation/middleware/zoomAuthGuard');

// ─── Dependency Injection — نربط كل شي ──────────────────────────────────────

const meetingRepository = new ZoomMeetingRepository();

const listMeetingsUseCase  = new ListMeetingsUseCase(meetingRepository);
const createMeetingUseCase = new CreateMeetingUseCase(meetingRepository);
const deleteMeetingUseCase = new DeleteMeetingUseCase(meetingRepository);

const meetingController = new MeetingController({
  listMeetingsUseCase,
  createMeetingUseCase,
  deleteMeetingUseCase,
});

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();

app.use(helmet());
app.use(cors({
  origin: config.server.clientUrl,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

app.use(compression());
app.use(express.json({ limit: '10kb' }));

if (config.server.nodeEnv !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res, next) => {
  try {
    const auth = getZoomAuthState();
    const zoomHealth = await checkZoomHealth();

    let zoomError = null;
    if (!zoomHealth.ok) {
      zoomError = mapError(zoomHealth.error);
    }

    res.json({
      success: true,
      data: {
        status: 'ok',
        env: config.server.nodeEnv,
        timestamp: new Date().toISOString(),
        zoom: {
          authOk: auth.ok,
          authCheckedAt: auth.lastChecked,
          apiOk: zoomHealth.ok,
          apiCheckedAt: zoomHealth.checkedAt,
          error: zoomError,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

app.use('/api/meetings', zoomAuthGuard, meetingsRouter(meetingController));

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(config.server.port, () => {
  logger.info(`Server running on http://localhost:${config.server.port}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
});

verifyZoomCredentials()
  .catch((err) => {
    logger.error(`Startup check failed: ${err.message}`);
  });

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => { process.exit(0); });
});

module.exports = app;

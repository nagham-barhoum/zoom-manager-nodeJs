const Joi = require('joi');
const { ValidationError } = require('../../utils/errors');

// ─── Schema تعريف قواعد الـ validation ────────────────────────────────────────
//
// هون بنحدد شو مسموح وشو لأ — مرة وحدة بس
// Joi بيتكفل بكل التحقق تلقائياً
//
const createMeetingSchema = Joi.object({

  topic: Joi.string()
    .trim()          // شيل الفراغات من الأطراف تلقائياً
    .max(200)        // ما يتجاوز 200 حرف
    .required()      // إجباري
    .messages({
      'string.empty': 'topic is required',
      'string.max':   'topic must not exceed 200 characters',
      'any.required': 'topic is required',
    }),

  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)   // format: YYYY-MM-DD
    .required()
    .messages({
      'string.pattern.base': 'date must be in YYYY-MM-DD format',
      'any.required':        'date is required',
    }),

  time: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)          // format: HH:MM
    .required()
    .messages({
      'string.pattern.base': 'time must be in HH:MM format',
      'any.required':        'time is required',
    }),

  duration: Joi.number()
    .min(15)         // 15 دقيقة كحد أدنى
    .max(480)        // 8 ساعات كحد أقصى
    .default(60)     // لو ما حددوا → 60 دقيقة تلقائياً
    .messages({
      'number.min': 'duration must be at least 15 minutes',
      'number.max': 'duration must not exceed 480 minutes',
    }),

  timezone: Joi.string()
    .default('UTC'), // لو ما حددوا → UTC تلقائياً

});

// ─── Middleware ────────────────────────────────────────────────────────────────
//
// هاد بيتحول لـ middleware عادي — نفس الشكل اللي Express يفهمه
// req, res, next — نفس الموضوع
//
function validateCreateMeeting(req, res, next) {

  const { error, value } = createMeetingSchema.validate(req.body, {
    abortEarly: false, // لا توقف عند أول خطأ — جمّع كل الأخطاء
  });

  if (error) {
    const details = error.details.map(d => d.message);
    return next(new ValidationError('Validation failed', details));
  }

  // كل شي تمام — حضّر البيانات وحطها على الـ request
  // value هون هو الـ body بعد ما Joi نظّفه وحط الـ defaults
  req.parsedMeeting = {
    topic:     value.topic,
    startTime: `${value.date}T${value.time}:00`,
    duration:  value.duration,
    timezone:  value.timezone,
  };

  next();
}

// ─── Delete Validation ────────────────────────────────────────────────────────

const deleteMeetingSchema = Joi.object({
  id: Joi.string()
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid meeting ID — must be numeric',
      'any.required':        'Meeting ID is required',
    }),
});

function validateDeleteMeeting(req, res, next) {
  const { error } = deleteMeetingSchema.validate(req.params);
  if (error) {
    return next(new ValidationError(error.details[0].message));
  }
  next();
}

module.exports = { validateCreateMeeting, validateDeleteMeeting };
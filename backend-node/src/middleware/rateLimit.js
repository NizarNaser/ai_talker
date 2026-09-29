const rateLimit = require('express-rate-limit');

// نفس حدود المعدّل (throttle scopes) التي كانت مضبوطة في DRF سابقاً
// (core/settings.py: DEFAULT_THROTTLE_RATES)، محسوبة هنا لكل ساعة.
const SCOPES = {
  upload: 10,
  contact: 5,
  auth: 20,
  stt: 60,
};

function scopedLimiter(scope) {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    max: SCOPES[scope],
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'عدد الطلبات كبير جداً، حاول مرة أخرى لاحقاً.' },
  });
}

module.exports = { scopedLimiter };

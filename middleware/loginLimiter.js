// Per-instance protection. Use a shared edge limit when scaling to multiple instances.
const attempts = new Map();
const windowMs = 15 * 60 * 1000;
module.exports = (req, res, next) => {
  const now = Date.now();
  for (const [key, value] of attempts) {
    if (value.reset <= now) attempts.delete(key);
  }
  const key = req.ip;
  const record = attempts.get(key) || { count: 0, reset: now + windowMs };
  if (record.count >= 30 || (!attempts.has(key) && attempts.size >= 10000)) {
    res.set('Retry-After', String(Math.max(1, Math.ceil((record.reset - now) / 1000))));
    return res.status(429).json({ message: 'Too many login attempts. Please try again later' });
  }
  record.count++;
  attempts.set(key, record);
  next();
};

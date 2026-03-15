/**
 * Memory Cache
 *
 * كاش بسيط بالـ RAM.
 * انتقل من utils/ لـ infrastructure/cache/
 * لأنو هو أداة خارجية — مش منطق عمل.
 */

const logger = require('../../utils/logger');

class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttlSeconds = 60) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
    logger.debug(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      logger.debug(`Cache EXPIRED: ${key}`);
      return null;
    }

    logger.debug(`Cache HIT: ${key}`);
    return entry.value;
  }

  invalidate(key) {
    this.store.delete(key);
    logger.debug(`Cache INVALIDATED: ${key}`);
  }

  flush() {
    this.store.clear();
    logger.debug('Cache FLUSHED');
  }
}

module.exports = new MemoryCache();
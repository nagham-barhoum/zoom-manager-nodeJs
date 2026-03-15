/**
 * Meeting Entity
 */

class Meeting {
  constructor({ id, topic, startTime, duration, timezone, joinUrl, createdAt }) {
    this.id        = id;
    this.topic     = topic;
    this.startTime = startTime;
    this.duration  = duration;
    this.timezone  = timezone  || 'UTC';
    this.joinUrl   = joinUrl   || null;
    this.createdAt = createdAt || null;
  }
}

module.exports = Meeting;
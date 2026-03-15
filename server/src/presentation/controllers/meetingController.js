/**
 * Meeting Controller
 *
 * مسؤول عن شيئين بس:
 * 1. يستقبل الـ HTTP request
 * 2. يرد بالـ HTTP response
 *
 * ما عنده أي منطق — كل شي بالـ Use Cases.
 * ما يعرف شي عن Zoom أو Cache.
 */

const logger = require('../../utils/logger');

class MeetingController {

  /**
   * بناخد الـ use cases عن طريق الـ constructor
   * هاد هو Dependency Injection
   */
  constructor({ listMeetingsUseCase, createMeetingUseCase, deleteMeetingUseCase }) {
    this.listMeetingsUseCase   = listMeetingsUseCase;
    this.createMeetingUseCase  = createMeetingUseCase;
    this.deleteMeetingUseCase  = deleteMeetingUseCase;
  }

  // ─── List ───────────────────────────────────────────────────────────────────

  async list(req, res) {
    const meetings = await this.listMeetingsUseCase.execute();
    logger.info(`Meetings fetched: ${meetings.length} results`);
    res.json({ success: true, data: meetings, count: meetings.length });
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(req, res) {
    const meeting = await this.createMeetingUseCase.execute(req.parsedMeeting);
    logger.info(`Meeting created: ID ${meeting.id}`);
    res.status(201).json({ success: true, data: meeting });
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async remove(req, res) {
    const { id } = req.params;
    const result = await this.deleteMeetingUseCase.execute(id);
    logger.info(`Meeting deleted: ID ${id} (alreadyDeleted=${result.alreadyDeleted})`);
    res.json({
      success: true,
      message: result.alreadyDeleted
        ? `Meeting ${id} was already deleted externally — UI synced`
        : `Meeting ${id} deleted successfully`,
      alreadyDeleted: result.alreadyDeleted,
    });
  }
}

module.exports = MeetingController;
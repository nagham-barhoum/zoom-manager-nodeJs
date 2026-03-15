/**
 * CreateMeeting Use Case
 *
 * مسؤول عن إنشاء اجتماع جديد.
 * ما يعرف شي عن Zoom أو Express.
 * المنطق الوحيد هون: التحقق إن الوقت مش بالماضي.
 */

const { ValidationError } = require('../utils/errors');

class CreateMeetingUseCase {

  constructor(meetingRepository) {
    this.meetingRepository = meetingRepository;
  }

  async execute(meetingData) {
    const startTime = new Date(meetingData.startTime);
    if (startTime < new Date()) {
      throw new ValidationError('Meeting start time cannot be in the past');
    }

    return await this.meetingRepository.create(meetingData);
  }
}

module.exports = CreateMeetingUseCase;
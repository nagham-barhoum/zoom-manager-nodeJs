/**
 * DeleteMeeting Use Case
 */

class DeleteMeetingUseCase {

  constructor(meetingRepository) {
    this.meetingRepository = meetingRepository;
  }

  async execute(id) {
    return await this.meetingRepository.delete(id);
  }
}

module.exports = DeleteMeetingUseCase;
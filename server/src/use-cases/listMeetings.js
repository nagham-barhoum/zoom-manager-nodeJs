/**
 * ListMeetings Use Case
 */

class ListMeetingsUseCase {

  constructor(meetingRepository) {
    this.meetingRepository = meetingRepository;
  }

  async execute() {
    return await this.meetingRepository.findAll();
  }
}

module.exports = ListMeetingsUseCase;
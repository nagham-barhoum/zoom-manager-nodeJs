/**
 * MeetingRepository Interface
 */

class MeetingRepository {

  /**
   * جيب كل الاجتماعات القادمة
   * @returns {Promise<Meeting[]>}
   */
  async findAll() {
    throw new Error('findAll() must be implemented');
  }

  /**
   * أنشئ اجتماع جديد
   * @param {{ topic, startTime, duration, timezone }} meetingData
   * @returns {Promise<Meeting>}
   */
  async create(meetingData) {
    throw new Error('create() must be implemented');
  }

  /**
   * احذف اجتماع بالـ ID
   * @param {string} id
   * @returns {Promise<{ alreadyDeleted: boolean }>}
   */
  async delete(id) {
    throw new Error('delete() must be implemented');
  }
}

module.exports = MeetingRepository;
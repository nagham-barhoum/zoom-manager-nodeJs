const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.ZOOM_ACCOUNT_ID = 'test-account';
process.env.ZOOM_CLIENT_ID = 'test-client';
process.env.ZOOM_CLIENT_SECRET = 'test-secret';

jest.mock('../src/services/zoom.service', () => ({
  listMeetings: jest.fn(),
  createMeeting: jest.fn(),
  deleteMeeting: jest.fn(),
}));

const zoomService = require('../src/services/zoom.service');
const app = require('../src/app');

function futureDateTime(minutesAhead = 60) {
  const d = new Date(Date.now() + minutesAhead * 60 * 1000);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
}

describe('Meetings validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects meetings scheduled in the past', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .send({
        topic: 'Past meeting',
        date: '2000-01-01',
        time: '10:00',
        duration: 30,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/future/i);
    expect(zoomService.createMeeting).not.toHaveBeenCalled();
  });

  test('strips unknown fields and accepts valid input', async () => {
    const { date, time } = futureDateTime(90);
    zoomService.createMeeting.mockResolvedValue({ id: 123, topic: 'Team Sync' });

    const res = await request(app)
      .post('/api/meetings')
      .send({
        topic: 'Team Sync',
        date,
        time,
        duration: 60,
        timezone: 'Local',
        extraField: 'should be removed',
      });

    expect(res.status).toBe(201);
    expect(zoomService.createMeeting).toHaveBeenCalledTimes(1);

    const payload = zoomService.createMeeting.mock.calls[0][0];
    expect(payload).toEqual({
      topic: 'Team Sync',
      startTime: `${date}T${time}:00`,
      duration: 60,
      timezone: 'Local',
    });
    expect(payload.extraField).toBeUndefined();
  });
});

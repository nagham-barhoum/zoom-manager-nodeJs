const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const raw = await res.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (err) {
      // Non-JSON response (proxy error or server crash)
      const message = `Unexpected response (HTTP ${res.status})`;
      throw new Error(message);
    }
  }

  if (!res.ok || (data && data.success === false)) {
    const message =
      data?.message
      || data?.error
      || data?.errorCode
      || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data || { success: true };
}

export const api = {
  health: () => request('/health'),
  getMeetings: () => request('/meetings'),

  createMeeting: (body) =>
    request('/meetings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteMeeting: (id) =>
    request(`/meetings/${id}`, { method: 'DELETE' }),
};

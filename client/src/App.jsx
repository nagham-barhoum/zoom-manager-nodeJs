import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 9999 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? 'var(--danger)' : t.type === 'success' ? 'var(--success)' : 'var(--accent)',
          color: '#fff', padding: '12px 20px', borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14,
          boxShadow: 'var(--shadow)', animation: 'fadeUp .25s ease',
          maxWidth: 320,
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 20 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, minWidth: size,
      border: `2px solid var(--border-bright)`,
      borderTopColor: 'var(--accent)',
      borderRadius: '50%',
      animation: 'spin .7s linear infinite',
    }} />
  );
}

// ─── Create Meeting Modal ─────────────────────────────────────────────────────

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ topic: '', date: today(), time: nowTime(), duration: 60 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.createMeeting(form);
      onCreated(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 460,
        animation: 'fadeUp .2s ease', boxShadow: 'var(--shadow)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>New Meeting</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Schedule</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Topic */}
          <label style={labelStyle}>
            <span style={labelText}>Meeting Title</span>
            <input
              value={form.topic}
              onChange={set('topic')}
              placeholder="e.g. Sprint Planning"
              required
              style={inputStyle}
            />
          </label>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>
              <span style={labelText}>Date</span>
              <input type="date" value={form.date} onChange={set('date')} required style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Time</span>
              <input type="time" value={form.time} onChange={set('time')} required style={inputStyle} />
            </label>
          </div>

          {/* Duration */}
          <label style={labelStyle}>
            <span style={labelText}>Duration (minutes)</span>
            <select value={form.duration} onChange={set('duration')} style={inputStyle}>
              {[15, 30, 45, 60, 90, 120].map(d => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </label>

          {error && (
            <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? <><Spinner size={16} /> Scheduling…</> : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({ meeting, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    await onDelete(meeting.id);
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '22px 24px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 16, transition: 'border-color .2s',
      animation: 'fadeUp .3s ease',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {meeting.topic}
        </div>
        <div style={{ color: 'var(--text-2)', fontSize: 13, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
          📅 {formatDate(meeting.startTime)}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={tagStyle}>⏱ {meeting.duration} min</span>
          <span style={{ ...tagStyle, fontFamily: 'var(--font-mono)', fontSize: 11 }}>ID: {meeting.id}</span>
          {meeting.joinUrl && (
            <a href={meeting.joinUrl} target="_blank" rel="noreferrer"
              style={{ ...tagStyle, color: 'var(--accent)', textDecoration: 'none', background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)' }}>
              🔗 Join
            </a>
          )}
        </div>
      </div>

      <button
        onClick={handleDelete}
        disabled={deleting}
        onMouseLeave={() => setConfirm(false)}
        style={{
          background: confirm ? 'var(--danger)' : 'var(--danger-soft)',
          border: `1px solid ${confirm ? 'var(--danger)' : 'transparent'}`,
          color: confirm ? '#fff' : 'var(--danger)',
          padding: '8px 14px', borderRadius: 8,
          cursor: deleting ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13,
          transition: 'all .15s', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 6,
          opacity: deleting ? .6 : 1,
        }}
      >
        {deleting ? <Spinner size={14} /> : confirm ? '⚠ Confirm' : '🗑 Delete'}
      </button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [zoomOk, setZoomOk] = useState(true);
  const lastZoomOkRef = useRef(true);

  function toast(message, type = 'success') {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const health = await api.health();
      const zoom = health?.data?.zoom;
      const zoomHealthy = zoom?.authOk !== false && zoom?.apiOk !== false;
      setZoomOk(zoomHealthy);

      if (!zoomHealthy) {
        const message = zoom?.error?.message || 'يرجى التأكد من معلومات تسجيل الدخول لحساب Zoom';
        if (lastZoomOkRef.current !== false) {
          toast(message, 'error');
        }
        lastZoomOkRef.current = false;
        setMeetings([]);
        return;
      }

      lastZoomOkRef.current = true;

      const res = await api.getMeetings();
      setMeetings(res.data);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  // Auto-sync every 30 seconds to catch external changes (deleted from Zoom dashboard etc.)
  useEffect(() => {
    const interval = setInterval(() => {
      loadMeetings();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadMeetings]);

  async function handleDelete(id) {
    try {
      const res = await api.deleteMeeting(id);
      setMeetings(m => m.filter(x => x.id !== id));
      toast(res.alreadyDeleted ? 'Meeting was deleted externally — list synced ✓' : 'Meeting deleted ✓');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function handleCreated(newMeeting) {
    setShowCreate(false);
    setMeetings(m => [newMeeting, ...m]);
    toast('Meeting scheduled! 🎉');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 80px' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, boxShadow: '0 0 16px var(--accent-glow)',
            }}>📹</div>
            <span style={{ fontWeight: 800, fontSize: 18 }}>Zoom Manager</span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ ...btnPrimary, padding: '9px 18px', fontSize: 14 }}
          >
            + New Meeting
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Upcoming</div>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>Meetings</h1>
          </div>
          <button onClick={loadMeetings} disabled={loading} style={{ ...btnSecondary, padding: '8px 14px', fontSize: 13 }}>
            {loading ? <Spinner size={14} /> : '↻ Refresh'}
          </button>
        </div>

        {/* States */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <Spinner size={36} />
          </div>
        ) : meetings.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)',
            color: 'var(--text-2)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>No upcoming meetings</div>
            <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Click "New Meeting" to schedule one</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {meetings.map(m => (
              <MeetingCard key={m.id} meeting={m} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      <Toast toasts={toasts} />
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const btnPrimary = {
  background: 'var(--accent)', color: '#fff',
  border: '1px solid transparent', borderRadius: 8,
  padding: '11px 22px', fontFamily: 'var(--font-sans)',
  fontWeight: 700, fontSize: 15, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 8,
  transition: 'opacity .15s',
};

const btnSecondary = {
  background: 'var(--surface2)', color: 'var(--text-2)',
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '11px 22px', fontFamily: 'var(--font-sans)',
  fontWeight: 600, fontSize: 15, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 8,
  transition: 'border-color .15s',
};

const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6 };

const labelText = { fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: .5, textTransform: 'uppercase' };

const inputStyle = {
  background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px 14px',
  color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 15,
  outline: 'none', width: '100%',
  colorScheme: 'dark',
};

const tagStyle = {
  background: 'var(--surface2)', border: '1px solid var(--border)',
  color: 'var(--text-2)', padding: '3px 10px', borderRadius: 20,
  fontSize: 12, fontWeight: 500,
};

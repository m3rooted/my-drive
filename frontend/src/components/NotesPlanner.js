import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, Clock3, Plus, StickyNote, Trash2 } from 'lucide-react';
import { getNotesStreamUrl, notesAPI } from '../services/api';

const toIsoDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const formatDateTime = (value) => {
  if (!value) return 'No time';
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCountdown = (target, nowMs) => {
  const targetMs = new Date(target).getTime();
  if (Number.isNaN(targetMs)) return 'Invalid time';

  const diff = targetMs - nowMs;
  if (diff <= 0) return 'Started';

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
};

const NotesPlanner = () => {
  const [items, setItems] = useState([]);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [scheduleSort, setScheduleSort] = useState('soon');
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: ''
  });
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    content: '',
    startAt: '',
    endAt: '',
    reminderMinutesBefore: 10
  });

  const syncedNowMs = useMemo(() => nowMs + serverOffsetMs, [nowMs, serverOffsetMs]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const response = await notesAPI.getNotes();
      setItems(response.data.notes || []);
      if (response.data.serverTime) {
        setServerOffsetMs(new Date(response.data.serverTime).getTime() - Date.now());
      }
    } catch (error) {
      toast.error('Failed to load notes and schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const stream = new EventSource(getNotesStreamUrl(token));

    const onConnected = () => setStreamConnected(true);
    const onUpdate = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setItems(payload.notes || []);
        if (payload.serverTime) {
          setServerOffsetMs(new Date(payload.serverTime).getTime() - Date.now());
        }
      } catch (error) {
        toast.error('Realtime data error');
      }
    };

    stream.addEventListener('connected', onConnected);
    stream.addEventListener('notes:update', onUpdate);
    stream.onerror = () => setStreamConnected(false);

    return () => {
      stream.removeEventListener('connected', onConnected);
      stream.removeEventListener('notes:update', onUpdate);
      stream.close();
    };
  }, []);

  const noteItems = useMemo(
    () => items.filter((item) => item.category === 'note'),
    [items]
  );

  const scheduleItems = useMemo(() => {
    const filtered = items.filter((item) => item.category === 'schedule');
    const sorted = [...filtered].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    return scheduleSort === 'late' ? sorted.reverse() : sorted;
  }, [items, scheduleSort]);

  const handleCreateNote = async (event) => {
    event.preventDefault();

    if (!noteForm.title.trim()) {
      toast.error('Please enter a note title');
      return;
    }

    setSavingNote(true);
    try {
      await notesAPI.createNote({
        title: noteForm.title,
        content: noteForm.content,
        category: 'note'
      });
      setNoteForm({ title: '', content: '' });
      toast.success('Note added successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleCreateSchedule = async (event) => {
    event.preventDefault();

    if (!scheduleForm.title.trim()) {
      toast.error('Please enter a schedule title');
      return;
    }

    if (!scheduleForm.startAt) {
      toast.error('Please select a start time');
      return;
    }

    const payload = {
      title: scheduleForm.title,
      content: scheduleForm.content,
      category: 'schedule',
      startAt: toIsoDateTime(scheduleForm.startAt),
      endAt: toIsoDateTime(scheduleForm.endAt),
      reminderMinutesBefore: Number(scheduleForm.reminderMinutesBefore)
    };

    setSavingSchedule(true);
    try {
      await notesAPI.createNote(payload);
      setScheduleForm({ title: '', content: '', startAt: '', endAt: '', reminderMinutesBefore: 10 });
      toast.success('Schedule added successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await notesAPI.deleteNote(id);
      toast.success('Deleted successfully');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <StickyNote className="w-6 h-6 text-blue-600" />
            <h2 className="text-4 font-bold text-gray-900">Notes</h2>
          </div>

          <form onSubmit={handleCreateNote} className="space-y-3">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl"
              placeholder="Note title"
              value={noteForm.title}
              onChange={(e) => setNoteForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-xl"
              rows={5}
              placeholder="Content"
              value={noteForm.content}
              onChange={(e) => setNoteForm((prev) => ({ ...prev, content: e.target.value }))}
            />
            <button
              type="submit"
              disabled={savingNote}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60"
            >
              <Plus size={16} />
              {savingNote ? 'Adding...' : 'Add note'}
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : noteItems.length === 0 ? (
              <p className="text-sm text-gray-500">No notes yet.</p>
            ) : (
              noteItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.title}</p>
                      {item.content && <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{item.content}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-green-600" />
              <h2 className="text-4 font-bold text-gray-900">Schedule</h2>
            </div>
            <select
              className="px-3 py-2 border border-gray-300 rounded-xl"
              value={scheduleSort}
              onChange={(e) => setScheduleSort(e.target.value)}
            >
              <option value="soon">Soon to late</option>
              <option value="late">Late to soon</option>
            </select>
          </div>

          <form onSubmit={handleCreateSchedule} className="space-y-3">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl"
              placeholder="Task title"
              value={scheduleForm.title}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-xl"
              rows={4}
              placeholder="Description (optional)"
              value={scheduleForm.content}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, content: e.target.value }))}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                value={scheduleForm.startAt}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, startAt: e.target.value }))}
              />
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                value={scheduleForm.endAt}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, endAt: e.target.value }))}
              />
            </div>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl"
              placeholder="Reminder minutes before due time"
              value={scheduleForm.reminderMinutesBefore}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, reminderMinutesBefore: e.target.value }))}
            />
            <button
              type="submit"
              disabled={savingSchedule}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-60"
            >
              <Plus size={16} />
              {savingSchedule ? 'Adding...' : 'Add event'}
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : scheduleItems.length === 0 ? (
              <p className="text-sm text-gray-500">No events yet.</p>
            ) : (
              scheduleItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock3 className="w-4 h-4 text-green-700" />
                        <p className="font-medium text-gray-900">{item.title}</p>
                      </div>
                      {item.content && <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{item.content}</p>}
                      <p className="text-xs text-gray-500 mt-1">Start: {formatDateTime(item.startAt)}</p>
                      {item.endAt && <p className="text-xs text-gray-500">End: {formatDateTime(item.endAt)}</p>}
                      <p className="text-xs text-gray-500">Email reminder: {item.reminderMinutesBefore ?? 10} minutes before due time</p>
                      <p className="text-xs text-green-700 mt-1">Remaining: {formatCountdown(item.endAt || item.startAt, syncedNowMs)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Server time: {new Date(syncedNowMs).toLocaleTimeString('en-US')} | {streamConnected ? 'Realtime connected' : 'Connecting to realtime...'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesPlanner;

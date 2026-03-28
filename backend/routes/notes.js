const express = require('express');
const auth = require('../middleware/auth');
const NoteModel = require('../models/Note');
const { sendScheduleReminderEmail, isEmailConfigured } = require('../services/mailer');

const router = express.Router();
const subscribers = new Map();
const reminderTimeouts = new Map();
const defaultReminderMinutesBefore = Number(process.env.REMINDER_MINUTES_BEFORE || 10);

const getReminderLeadMinutes = (note) => {
  const value = Number(note.reminderMinutesBefore);
  if (!Number.isFinite(value) || value < 0) {
    return defaultReminderMinutesBefore;
  }
  return Math.floor(value);
};

const sendSseEvent = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const broadcastNotes = async (userId) => {
  const userSubscribers = subscribers.get(userId);
  if (!userSubscribers || userSubscribers.size === 0) {
    return;
  }

  const notes = await NoteModel.getNotesByUserId(userId);
  const payload = { notes, serverTime: new Date().toISOString() };

  for (const res of userSubscribers) {
    sendSseEvent(res, 'notes:update', payload);
  }
};

const clearReminder = (noteId) => {
  const existingTimeout = reminderTimeouts.get(noteId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    reminderTimeouts.delete(noteId);
  }
};

const scheduleReminder = async (note, userEmail) => {
  clearReminder(note.id);

  const noteCategory = note.category || 'schedule';
  if (noteCategory !== 'schedule' || note.done || note.reminderSent) {
    return;
  }

  if (!userEmail || !isEmailConfigured()) {
    return;
  }

  const dueAt = note.endAt || note.startAt;
  const dueTimestamp = new Date(dueAt).getTime();
  if (Number.isNaN(dueTimestamp)) {
    return;
  }

  const reminderMinutesBefore = getReminderLeadMinutes(note);
  const reminderTimestamp = dueTimestamp - (reminderMinutesBefore * 60 * 1000);
  const delay = reminderTimestamp - Date.now();

  const triggerReminder = async () => {
    reminderTimeouts.delete(note.id);

    const latestNote = await NoteModel.getNoteById(note.id, note.userId);
    if (!latestNote) {
      return;
    }

    const latestCategory = latestNote.category || 'schedule';
    if (latestNote.done || latestCategory !== 'schedule' || latestNote.reminderSent) {
      return;
    }

    const latestDueAt = latestNote.endAt || latestNote.startAt;
    const latestReminderMinutes = getReminderLeadMinutes(latestNote);

    const result = await sendScheduleReminderEmail(
      userEmail,
      latestNote,
      latestReminderMinutes,
      latestDueAt
    );
    if (!result.sent) {
      return;
    }

    await NoteModel.updateNote(latestNote.id, latestNote.userId, { reminderSent: true });
    await broadcastNotes(latestNote.userId);
  };

  // If the reminder window already started but the event is still upcoming, send immediately.
  if (delay <= 0) {
    if (dueTimestamp > Date.now()) {
      setTimeout(triggerReminder, 0);
    }
    return;
  }

  const timeoutId = setTimeout(triggerReminder, delay);
  reminderTimeouts.set(note.id, timeoutId);
};

router.get('/stream', auth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const userId = req.user.id;
  if (!subscribers.has(userId)) {
    subscribers.set(userId, new Set());
  }
  subscribers.get(userId).add(res);

  sendSseEvent(res, 'connected', { message: 'Notes stream connected' });
  await broadcastNotes(userId);

  const keepAlive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    const userSubscribers = subscribers.get(userId);
    if (userSubscribers) {
      userSubscribers.delete(res);
      if (userSubscribers.size === 0) {
        subscribers.delete(userId);
      }
    }
  });
});

router.get('/', auth, async (req, res) => {
  try {
    const notes = await NoteModel.getNotesByUserId(req.user.id);
    res.json({ notes, serverTime: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, content, startAt, endAt, category, reminderMinutesBefore } = req.body;
    const normalizedCategory = category === 'note' ? 'note' : 'schedule';
    const normalizedStartAt = startAt || null;
    const normalizedEndAt = endAt || null;
    const normalizedReminderMinutesBefore = reminderMinutesBefore === undefined
      ? defaultReminderMinutesBefore
      : Number(reminderMinutesBefore);

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (normalizedCategory === 'schedule' && !normalizedStartAt) {
      return res.status(400).json({ error: 'Start time is required for schedule items' });
    }

    if (normalizedStartAt && normalizedEndAt && new Date(normalizedEndAt) < new Date(normalizedStartAt)) {
      return res.status(400).json({ error: 'End time must be later than start time' });
    }

    if (!Number.isFinite(normalizedReminderMinutesBefore) || normalizedReminderMinutesBefore < 0) {
      return res.status(400).json({ error: 'Reminder minutes must be a non-negative number' });
    }

    const effectiveStartAt = normalizedStartAt || new Date().toISOString();

    const note = await NoteModel.createNote({
      userId: req.user.id,
      title: title.trim(),
      content: (content || '').trim(),
      category: normalizedCategory,
      startAt: effectiveStartAt,
      endAt: normalizedEndAt,
      reminderMinutesBefore: Math.floor(normalizedReminderMinutesBefore)
    });

    await scheduleReminder(note, req.user.email);

    await broadcastNotes(req.user.id);
    res.status(201).json({ message: 'Note created successfully', note });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const { title, content, startAt, endAt, done, category, reminderMinutesBefore } = req.body;
    const normalizedCategory = category === 'note' ? 'note' : category === 'schedule' ? 'schedule' : undefined;

    const existingNote = await NoteModel.getNoteById(req.params.id, req.user.id);
    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const nextCategory = normalizedCategory || existingNote.category || 'schedule';
    const nextStartAt = startAt !== undefined ? (startAt || null) : existingNote.startAt;
    const nextEndAt = endAt !== undefined ? (endAt || null) : existingNote.endAt;

    if (nextCategory === 'schedule' && !nextStartAt) {
      return res.status(400).json({ error: 'Start time is required for schedule items' });
    }

    if (nextStartAt && nextEndAt && new Date(nextEndAt) < new Date(nextStartAt)) {
      return res.status(400).json({ error: 'End time must be later than start time' });
    }

    if (reminderMinutesBefore !== undefined) {
      const nextReminderMinutes = Number(reminderMinutesBefore);
      if (!Number.isFinite(nextReminderMinutes) || nextReminderMinutes < 0) {
        return res.status(400).json({ error: 'Reminder minutes must be a non-negative number' });
      }
    }

    const shouldResetReminder =
      startAt !== undefined ||
      endAt !== undefined ||
      reminderMinutesBefore !== undefined ||
      normalizedCategory !== undefined ||
      (done !== undefined && Boolean(done) === false);

    const note = await NoteModel.updateNote(req.params.id, req.user.id, {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(content !== undefined ? { content: content.trim() } : {}),
      ...(startAt !== undefined ? { startAt } : {}),
      ...(endAt !== undefined ? { endAt: endAt || null } : {}),
      ...(done !== undefined ? { done: Boolean(done) } : {}),
      ...(normalizedCategory !== undefined ? { category: normalizedCategory } : {}),
      ...(reminderMinutesBefore !== undefined
        ? { reminderMinutesBefore: Math.floor(Number(reminderMinutesBefore)) }
        : {}),
      ...(shouldResetReminder ? { reminderSent: false } : {})
    });

    await scheduleReminder(note, req.user.email);

    await broadcastNotes(req.user.id);
    res.json({ message: 'Note updated successfully', note });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    clearReminder(req.params.id);

    const deleted = await NoteModel.deleteNote(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await broadcastNotes(req.user.id);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
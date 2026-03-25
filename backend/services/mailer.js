const nodemailer = require('nodemailer');

let cachedTransporter = null;

const isEmailConfigured = () => {
  return Boolean(process.env.MAIL_USER && process.env.MAIL_APP_PASSWORD);
};

const getTransporter = () => {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: process.env.MAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_APP_PASSWORD
      }
    });
  }

  return cachedTransporter;
};

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const sendScheduleReminderEmail = async (email, schedule, minutesBefore) => {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'Mail is not configured' };
  }

  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || process.env.MAIL_USER;

  const startAt = formatDateTime(schedule.startAt);
  const endAt = schedule.endAt ? formatDateTime(schedule.endAt) : 'Not set';

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: `Reminder: ${schedule.title} starts soon`,
      text: [
        `Your schedule item will start in about ${minutesBefore} minutes.`,
        `Title: ${schedule.title}`,
        `Start time: ${startAt}`,
        `End time: ${endAt}`,
        schedule.content ? `Details: ${schedule.content}` : null
      ].filter(Boolean).join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2 style="margin-bottom: 8px;">Schedule Reminder</h2>
          <p>Your schedule item will start in about <strong>${minutesBefore} minutes</strong>.</p>
          <p><strong>Title:</strong> ${schedule.title}</p>
          <p><strong>Start time:</strong> ${startAt}</p>
          <p><strong>End time:</strong> ${endAt}</p>
          ${schedule.content ? `<p><strong>Details:</strong> ${schedule.content}</p>` : ''}
        </div>
      `
    });

    return { sent: true };
  } catch (error) {
    console.error('Failed to send reminder email:', error.message);
    return { sent: false, reason: error.message };
  }
};

module.exports = {
  isEmailConfigured,
  sendScheduleReminderEmail
};
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST  || 'smtp.ethereal.email',
  port:   parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
});

const sendNotification = async (toEmail, subject, message) => {
  try {
    await transporter.sendMail({
      from:    process.env.EMAIL_USER || 'noreply@catrental.com',
      to:      toEmail,
      subject,
      text:    message,
    });
  } catch (err) {
    console.error(`[emailService] Failed to send to ${toEmail}:`, err.message);
  }
};

module.exports = { sendNotification };

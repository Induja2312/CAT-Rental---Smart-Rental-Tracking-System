const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER || process.env.EMAIL_USER;
  const pass = process.env.GMAIL_PASS || process.env.EMAIL_PASS;

  if (user && pass) {
    // Configured with real Gmail SMTP / Custom SMTP
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user, pass },
    });
    console.log(`[emailService] Nodemailer initialized with Gmail/SMTP user: ${user}`);
  } else {
    // Fallback: create auto Ethereal test account for dev mode
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[emailService] Initialized Ethereal test mail account: ${testAccount.user}`);
    } catch (err) {
      // Direct JSON fallback transport if network fails
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      console.log('[emailService] Initialized JSON fallback mail transport');
    }
  }

  return transporter;
};

const sendNotification = async (toEmail, subject, message) => {
  try {
    const mailer = await getTransporter();
    const fromUser = process.env.GMAIL_USER || process.env.EMAIL_USER || 'catrental.alerts@gmail.com';

    const info = await mailer.sendMail({
      from: `"CAT Rental Telematics" <${fromUser}>`,
      to: toEmail,
      subject: subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f5; color: #18181b;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 24px; border: 1px solid #e4e4e7;">
            <div style="background: #FFC500; padding: 12px 20px; border-radius: 4px; display: inline-block; font-weight: 900; font-size: 18px; color: #000000; margin-bottom: 20px;">
              CAT RENTALS TELEMATICS ALERT
            </div>
            <h2 style="font-size: 20px; font-weight: 800; color: #18181b; margin-top: 0;">${subject}</h2>
            <div style="font-size: 14px; line-height: 1.6; color: #27272a; white-space: pre-wrap; background: #fafafa; padding: 16px; border-radius: 6px; border: 1px solid #f4f4f5;">${message}</div>
            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
            <p style="font-size: 12px; color: #71717a; margin: 0;">
              This is an automated notification from CAT Rental Telematics Platform.
            </p>
          </div>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[emailService] Test Email Sent! Preview URL: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error(`[emailService] Failed to send email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendNotification };

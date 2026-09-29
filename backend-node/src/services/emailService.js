const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.EMAIL_HOST_USER;
  const pass = process.env.EMAIL_HOST_PASSWORD;
  if (!user || !pass) {
    // بدون بيانات SMTP: نطبع الرسالة في الطرفية فقط (يوازي console backend في Django)
    transporter = { sendMail: async (opts) => console.log('[email:console]', opts) };
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false, // TLS عبر STARTTLS على المنفذ 587
    auth: { user, pass },
  });
  return transporter;
}

async function sendContactEmail({ fromVisitorEmail, message }) {
  const user = process.env.EMAIL_HOST_USER;
  const contactEmail = process.env.CONTACT_EMAIL || user;
  await getTransporter().sendMail({
    from: user || fromVisitorEmail,
    to: contactEmail,
    replyTo: fromVisitorEmail,
    subject: `رسالة تواصل من: ${fromVisitorEmail}`,
    text: message,
  });
}

module.exports = { sendContactEmail };

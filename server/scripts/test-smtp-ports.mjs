import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const to = process.argv[2] || 'm.talha2703@gmail.com';

async function trySend(label, options) {
  const transporter = nodemailer.createTransport(options);
  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from: `"Exhibit Graphic Sign" <${process.env.EMAIL_SMTP_USER}>`,
      to,
      subject: `EGS ${label} test ${Date.now()}`,
      text: `Port/config test: ${label}`,
      envelope: { from: process.env.EMAIL_SMTP_USER, to },
    });
    console.log(label, 'OK', info.response, info.messageId);
  } catch (err) {
    console.log(label, 'FAIL', err.message);
  }
}

await trySend('465-ssl', {
  host: process.env.EMAIL_SMTP_HOST,
  port: 465,
  secure: true,
  auth: { user: process.env.EMAIL_SMTP_USER, pass: process.env.EMAIL_SMTP_PASS },
  tls: { rejectUnauthorized: false },
});

await trySend('587-starttls', {
  host: process.env.EMAIL_SMTP_HOST,
  port: 587,
  secure: false,
  requireTLS: true,
  auth: { user: process.env.EMAIL_SMTP_USER, pass: process.env.EMAIL_SMTP_PASS },
  tls: { rejectUnauthorized: false },
});

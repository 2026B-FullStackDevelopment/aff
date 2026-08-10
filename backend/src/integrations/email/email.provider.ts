// Sends transactional email over SMTP via Nodemailer, using credentials from env.
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.emailHost,
      port: env.emailPort,
      auth: { user: env.emailUser, pass: env.emailPass },
    });
  }
  return transporter;
}

async function sendEmail(message: { to: string; subject: string; text?: string; html?: string }) {
  if (!message.to) {
    throw new Error('sendEmail requires a "to" address');
  }

  const info = await getTransporter().sendMail({
    from: env.emailUser,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  return {
    provider: 'nodemailer',
    accepted: info.accepted,
    messageId: info.messageId,
  };
}

export { sendEmail };

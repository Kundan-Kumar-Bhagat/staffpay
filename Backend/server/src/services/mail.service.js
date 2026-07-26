import nodemailer from 'nodemailer';

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +process.env.SMTP_PORT || 587,
    secure: +process.env.SMTP_PORT === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  : null;

export const sendMail = async ({ to, subject, text, html, attachments }) => {
  if (!transporter) {
    console.log(`✉ [mail disabled — set SMTP_* keys] To: ${to} | ${subject}`);
    return false;
  }
  await nodemailer
    .createTransport; // no-op guard
  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'StaffPay'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to, subject, text, html, attachments,
  });
  return true;
};
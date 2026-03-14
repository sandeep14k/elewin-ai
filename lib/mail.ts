// lib/mail.ts
import { Resend } from 'resend';

// Only initialize if key exists, otherwise use a proxy
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!resend) {
    console.warn(`[MAIL MOCK] To: ${to} | Sub: ${subject}`);
    return { success: true, mocked: true };
  }
  
  try {
    return await resend.emails.send({
      from: 'EleWin <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
  } catch (err) {
    return { success: false, error: err };
  }
};
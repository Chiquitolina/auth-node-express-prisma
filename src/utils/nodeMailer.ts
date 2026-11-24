import nodemailer from 'nodemailer';

export async function sendVerificationEmail(email: string, verificationCode: string): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;
  if (!user || !pass) {
    throw new Error('Gmail SMTP credentials not configured');
  }
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  await transporter.sendMail({
    from: user,
    to: email,
    subject: 'Verificacion de correo electronico',
    text: `Tu codigo de verificacion es: ${verificationCode}. Expira en 5 minutos.`,
  });
}

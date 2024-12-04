import nodemailer from "nodemailer";

// Crea el transportador con la configuración de Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // Tu correo de Gmail (usa una variable de entorno)
    pass: process.env.GMAIL_PASS, // Tu contraseña de Gmail (o App Password, si tienes 2FA activado)
  },
});

// Función para enviar correos electrónicos
export const sendEmail = async (mailOptions: {
  from: string;
  to: string;
  subject: string;
  text: string;
}) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Correo enviado: ", info.response);
  } catch (error) {
    console.error("Error al enviar el correo:", error);
  }
};

export const sendVerificationEmail = async (
  email: string,
  verificationCode: string
) => {
  const gmailUser = process.env.GMAIL_USER as string; // Asegura que es un string

  const mailOptions = {
    from: gmailUser, // El correo desde el que se enviará el mensaje
    to: email,
    subject: "Verificación de correo electrónico",
    text: `Tu código de verificación es: ${verificationCode}`,
  };

  await sendEmail(mailOptions); // Llamar al servicio para enviar el correo
};

// Envío de emails transaccionales vía Brevo (https://brevo.com) por SMTP.
// Plan gratis: 300 emails/día, a CUALQUIER destinatario y sin dominio propio.
//
// Se usa SMTP (nodemailer) y no la API REST a propósito: la API bloquea las
// IPs no reconocidas y el servidor (Railway) cambia de IP; el SMTP no tiene
// esa restricción. El remitente debe estar verificado en Brevo (el email de
// la cuenta lo está automáticamente).

import nodemailer from "nodemailer";

const FROM_NAME = "QueComo";
const FROM_EMAIL = "daniel.martos@hotmail.com";

// Transporte SMTP de Brevo (perezoso: se crea en el primer envío)
let cachedTransporter: nodemailer.Transporter | null = null;
const getTransporter = (): nodemailer.Transporter | null => {
  const login = process.env.BREVO_SMTP_LOGIN;
  const key = process.env.BREVO_SMTP_KEY;
  if (!login || !key) {
    console.warn("⚠️  BREVO_SMTP_LOGIN/KEY no configurados: no se envía email");
    return null;
  }
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: { user: login, pass: key },
    });
  }
  return cachedTransporter;
};

// Plantilla del email de verificación: código grande y claro, sin florituras.
const verificationHtml = (code: string) => `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h1 style="color: #F97316; margin-bottom: 4px;">QueComo 🥘</h1>
    <h2 style="margin-top: 0;">Verifica tu correo</h2>
    <p>Usa este código en la app para confirmar tu dirección de correo:</p>
    <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; background: #FFF7ED; padding: 16px 24px; border-radius: 12px; text-align: center;">
      ${code}
    </p>
    <p style="color: #6B7280; font-size: 13px;">
      El código caduca en 15 minutos. Si no has creado una cuenta en QueComo,
      puedes ignorar este mensaje.
    </p>
  </div>`;

const passwordResetHtml = (code: string) => `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h1 style="color: #F97316; margin-bottom: 4px;">QueComo 🥘</h1>
    <h2 style="margin-top: 0;">Restablecer contraseña</h2>
    <p>Alguien (esperamos que tú) ha pedido cambiar la contraseña de tu cuenta.
    Usa este código en la app:</p>
    <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; background: #FFF7ED; padding: 16px 24px; border-radius: 12px; text-align: center;">
      ${code}
    </p>
    <p style="color: #6B7280; font-size: 13px;">
      El código caduca en 15 minutos. Si no has sido tú, ignora este mensaje:
      tu contraseña seguirá igual.
    </p>
  </div>`;

// Envío genérico a Resend. Nunca lanza: un fallo de email no debe tumbar nada.
const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  const transporter = getTransporter();
  if (!transporter) return false;
  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (e) {
    console.warn("⚠️  Error enviando email:", (e as Error).message);
    return false;
  }
};

// Código de verificación de correo (registro)
export const sendVerificationEmail = (to: string, code: string) =>
  sendEmail(to, `${code} es tu código de QueComo`, verificationHtml(code));

// Código para restablecer la contraseña
export const sendPasswordResetEmail = (to: string, code: string) =>
  sendEmail(
    to,
    `${code} — restablece tu contraseña de QueComo`,
    passwordResetHtml(code)
  );

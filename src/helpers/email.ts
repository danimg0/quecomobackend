// Envío de emails transaccionales vía Resend (https://resend.com).
//
// MODO PRUEBA: sin un dominio propio verificado, Resend solo permite enviar
// al correo del dueño de la cuenta (los demás devuelven 403). Cuando haya
// dominio, basta con verificarlo en Resend y cambiar el remitente de abajo.

const RESEND_URL = "https://api.resend.com/emails";
const FROM = "QueComo <onboarding@resend.dev>";

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

// Envía el código de verificación. Devuelve true si Resend lo aceptó.
// Nunca lanza: un fallo de email no debe tumbar el registro.
export const sendVerificationEmail = async (
  to: string,
  code: string
): Promise<boolean> => {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("⚠️  RESEND_API_KEY no configurada: no se envía email");
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: `${code} es tu código de QueComo`,
        html: verificationHtml(code),
      }),
    });
    if (!res.ok) {
      console.warn(
        `⚠️  Resend ${res.status}: ${(await res.text()).slice(0, 200)}`
      );
      return false;
    }
    return true;
  } catch (e) {
    console.warn("⚠️  Error enviando email:", (e as Error).message);
    return false;
  }
};

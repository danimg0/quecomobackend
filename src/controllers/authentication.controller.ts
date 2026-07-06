import {
  createUser,
  getUserByEmail,
  getUserByGoogleId,
} from "../db/user.model";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import { authentication, random } from "../helpers";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../helpers/email";

// Cliente OAuth para verificar los ID tokens que manda la app.
// GOOGLE_WEB_CLIENT_ID = Client ID de tipo "Web" de Google Cloud Console.
const googleClient = new OAuth2Client();

// Devuelve un objeto de usuario limpio (sin datos sensibles) para mandarlo al frontend
const toPublicUser = (user: any) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  imageUrl: user.imageUrl ?? null,
  favorites: user.favorites ?? [],
  emailVerified: !!user.emailVerified,
});

// Código de verificación de 6 dígitos (100000-999999)
const generateVerificationCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const VERIFICATION_TTL_MS = 15 * 60 * 1000; // el código caduca en 15 minutos
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minuto mínimo entre reenvíos

export const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await getUserByEmail(email).select(
      "+authentication.salt +authentication.password"
    );

    if (!user) {
      return res.status(400).json({ message: "User not founded" });
    }

    // Cuentas creadas con Google: no tienen contraseña propia
    if (!user.authentication?.password || !user.authentication?.salt) {
      return res.status(400).json({
        message: "Esta cuenta se creó con Google. Usa 'Continuar con Google'.",
      });
    }

    const expectedHash = authentication(user.authentication.salt, password);

    if (expectedHash !== user.authentication.password) {
      return res.status(403).json({ message: "Incorrect password" });
    }

    // Login correcto. Generamos el token de sesión (Bearer token opaco).
    const salt = random();
    user.authentication.sessionToken = authentication(salt, user.id.toString());

    await user.save();

    // En vez de una cookie, devolvemos el token en el body para que el cliente
    // (React Native) lo guarde y lo mande en el header Authorization.
    return res.status(200).json({
      token: user.authentication.sessionToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const register = async (req: express.Request, res: express.Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      // Al usar el json, el front recibe los mensajes con lo que pasa
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userExist = await getUserByEmail(email);
    if (userExist) {
      // el sendStatus cierra la conexion!!
      return res.status(400).json({ message: "User already exists" });
    }

    // Generamos el salt unico para el usuario
    const salt = random();
    // Generamos también el token de sesión para que quede logueado tras registrarse
    const sessionToken = authentication(random(), email);

    // Código de verificación de correo (el usuario entra igualmente; la app
    // le muestra un aviso hasta que verifique)
    const code = generateVerificationCode();

    const user = await createUser({
      email,
      username,
      emailVerified: false,
      verification: {
        code,
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
        sentAt: new Date(),
      },
      authentication: {
        salt,
        //guardamos la mezcla del salt y la contrasena
        password: authentication(salt, password),
        sessionToken,
      },
    });

    // El envío puede fallar (p. ej. Resend en modo prueba): no rompe el registro,
    // el usuario puede pedir un reenvío desde la app.
    await sendVerificationEmail(email, code);

    return res.status(200).json({
      token: sessionToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

// POST /auth/google { idToken } -> login/registro con Google.
// Verifica el ID token con Google, busca o crea el usuario (enlazando por
// email si ya existía una cuenta con ese correo) y emite NUESTRO token de
// sesión, igual que el login normal.
export const googleLogin = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Falta el token de Google" });
    }
    const webClientId = process.env.GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) {
      console.error("❌ GOOGLE_WEB_CLIENT_ID no configurado");
      return res
        .status(500)
        .json({ message: "Login con Google no disponible" });
    }

    // Verificación criptográfica del token contra Google (firma + audiencia)
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: webClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      return res.status(400).json({ message: "Token de Google inválido" });
    }

    const { sub: googleId, email, name, picture } = payload;

    // 1º por googleId (ya inició sesión con Google antes);
    // 2º por email (tenía cuenta de email: la enlazamos con Google)
    let user = await getUserByGoogleId(googleId);
    if (!user) {
      user = await getUserByEmail(email);
      if (user) {
        user.googleId = googleId;
      }
    }

    if (!user) {
      // Usuario nuevo: lo creamos sin contraseña. Google ya verificó su email.
      const created = await createUser({
        email,
        username: name || email.split("@")[0],
        googleId,
        emailVerified: true,
        imageUrl: picture ?? null,
        authentication: {},
      });
      user = await getUserByEmail(email);
      if (!user) {
        console.error("❌ Usuario de Google creado pero no encontrado", created);
        return res.sendStatus(500);
      }
    }

    // El email de Google viene verificado: lo reflejamos siempre
    user.emailVerified = true;

    // Emitimos nuestro token de sesión (igual que el login normal)
    const salt = random();
    user.set(
      "authentication.sessionToken",
      authentication(salt, user.id.toString())
    );
    await user.save();

    return res.status(200).json({
      token: user.get("authentication.sessionToken"),
      user: toPublicUser(user),
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "No se pudo validar con Google" });
  }
};

// POST /auth/verify { email, code } -> marca el correo como verificado
export const verifyEmail = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const user = await getUserByEmail(email).select(
      "+verification.code +verification.expiresAt +verification.attempts"
    );
    // Respuesta genérica: no revelamos si el email existe o no
    if (!user) {
      return res.status(400).json({ message: "Código incorrecto" });
    }
    if (user.emailVerified) {
      return res
        .status(200)
        .json({ message: "El correo ya estaba verificado", user: toPublicUser(user) });
    }

    const v: any = user.verification;
    // Anti fuerza bruta: a los 5 fallos el código queda invalidado
    if ((v?.attempts ?? 0) >= 5) {
      return res.status(429).json({
        message: "Demasiados intentos. Pide un código nuevo.",
      });
    }
    if (!v?.code || v.code !== String(code).trim()) {
      user.set("verification.attempts", (v?.attempts ?? 0) + 1);
      await user.save();
      return res.status(400).json({ message: "Código incorrecto" });
    }
    if (v.expiresAt && new Date(v.expiresAt).getTime() < Date.now()) {
      return res
        .status(400)
        .json({ message: "El código ha caducado. Pide uno nuevo." });
    }

    user.emailVerified = true;
    user.set("verification", undefined); // limpiamos el código usado
    await user.save();

    return res
      .status(200)
      .json({ message: "Correo verificado", user: toPublicUser(user) });
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

// POST /auth/resend-verification { email } -> genera y envía un código nuevo
export const resendVerification = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const user = await getUserByEmail(email).select("+verification.sentAt");
    // Respuesta genérica aunque el email no exista o ya esté verificado
    if (!user || user.emailVerified) {
      return res
        .status(200)
        .json({ message: "Si la cuenta existe, hemos enviado un código" });
    }

    // Cooldown para no permitir spam de reenvíos
    const lastSent = (user.verification as any)?.sentAt
      ? new Date((user.verification as any).sentAt).getTime()
      : 0;
    if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
      return res
        .status(429)
        .json({ message: "Espera un minuto antes de pedir otro código" });
    }

    const code = generateVerificationCode();
    user.set("verification", {
      code,
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      sentAt: new Date(),
    });
    await user.save();
    await sendVerificationEmail(email, code);

    return res
      .status(200)
      .json({ message: "Si la cuenta existe, hemos enviado un código" });
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

// POST /auth/forgot-password { email } -> envía código para restablecer la
// contraseña. Respuesta siempre genérica (no revela si el email existe).
export const forgotPassword = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Faltan datos" });
    }
    const generic = {
      message: "Si la cuenta existe, hemos enviado un código a ese correo",
    };

    const user = await getUserByEmail(email).select("+passwordReset.sentAt");
    if (!user) return res.status(200).json(generic);

    // Cooldown de reenvío
    const lastSent = (user.passwordReset as any)?.sentAt
      ? new Date((user.passwordReset as any).sentAt).getTime()
      : 0;
    if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
      return res
        .status(429)
        .json({ message: "Espera un minuto antes de pedir otro código" });
    }

    const code = generateVerificationCode();
    user.set("passwordReset", {
      code,
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      sentAt: new Date(),
    });
    await user.save();
    await sendPasswordResetEmail(email, code);

    return res.status(200).json(generic);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

// POST /auth/reset-password { email, code, newPassword } -> cambia la
// contraseña si el código es válido e invalida las sesiones abiertas.
export const resetPassword = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Faltan datos" });
    }
    if (String(newPassword).length < 4) {
      return res
        .status(400)
        .json({ message: "La contraseña debe tener al menos 4 caracteres" });
    }

    const user = await getUserByEmail(email).select(
      "+passwordReset.code +passwordReset.expiresAt +passwordReset.attempts"
    );
    if (!user) {
      return res.status(400).json({ message: "Código incorrecto" });
    }

    const v: any = user.passwordReset;
    if ((v?.attempts ?? 0) >= 5) {
      return res
        .status(429)
        .json({ message: "Demasiados intentos. Pide un código nuevo." });
    }
    if (!v?.code || v.code !== String(code).trim()) {
      user.set("passwordReset.attempts", (v?.attempts ?? 0) + 1);
      await user.save();
      return res.status(400).json({ message: "Código incorrecto" });
    }
    if (v.expiresAt && new Date(v.expiresAt).getTime() < Date.now()) {
      return res
        .status(400)
        .json({ message: "El código ha caducado. Pide uno nuevo." });
    }

    // Guardamos la contraseña nueva y cerramos las sesiones existentes
    const salt = random();
    user.set("authentication.salt", salt);
    user.set("authentication.password", authentication(salt, newPassword));
    user.set("authentication.sessionToken", undefined);
    user.set("passwordReset", undefined);
    await user.save();

    return res.status(200).json({
      message: "Contraseña actualizada. Ya puedes iniciar sesión.",
    });
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

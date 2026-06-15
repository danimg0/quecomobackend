import { PushTokenModel } from "../db/push-token.model";

// Envío de notificaciones push a través del servicio de Expo (gratis, sin clave).
// https://docs.expo.dev/push-notifications/sending-notifications/

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  data?: Record<string, unknown>;
};

// Envía un mismo mensaje a una lista de tokens, troceando en lotes de 100
// (límite recomendado por Expo).
export const sendExpoPush = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> => {
  const valid = tokens.filter((t) => t?.startsWith("ExponentPushToken"));
  if (valid.length === 0) return;

  for (let i = 0; i < valid.length; i += 100) {
    const batch = valid.slice(i, i + 100);
    const messages: ExpoMessage[] = batch.map((to) => ({
      to,
      title,
      body,
      sound: "default",
      data,
    }));
    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
    } catch (e) {
      console.warn("⚠️  Error enviando push:", (e as Error).message);
    }
  }
};

// Aviso de recetas nuevas a TODOS los dispositivos registrados.
export const notifyNewRecipes = async (count: number): Promise<void> => {
  if (count <= 0) return;
  const tokens = (await PushTokenModel.find({}, "token")).map(
    (d) => d.token as string
  );
  if (tokens.length === 0) return;

  const title = "¡Recetas nuevas en QueComo! 🥘";
  const body =
    count === 1
      ? "Hemos añadido una receta nueva. ¿La vemos?"
      : `Hemos añadido ${count} recetas nuevas. ¿Las vemos?`;

  await sendExpoPush(tokens, title, body, { url: "quecomo://home" });
  console.log(`📣 Push de recetas nuevas enviado a ${tokens.length} dispositivos.`);
};

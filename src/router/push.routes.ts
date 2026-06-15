import express from "express";
import { PushTokenModel } from "../db/push-token.model";

export default (router: express.Router) => {
  // Registra (o actualiza) el token push de un dispositivo. Anónimo.
  router.post("/push-token", async (req, res) => {
    // #swagger.tags = ['Push']
    // #swagger.summary = 'Registrar token de notificaciones push'
    try {
      const { token, platform } = req.body as {
        token?: string;
        platform?: string;
      };
      if (!token || !token.startsWith("ExponentPushToken")) {
        return res.status(400).json({ error: "Token inválido" });
      }
      await PushTokenModel.updateOne(
        { token },
        { $set: { token, platform } },
        { upsert: true }
      );
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: (e as Error).message });
    }
  });
};

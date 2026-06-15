import mongoose from "mongoose";

// Tokens de notificación push (Expo) de los dispositivos. Anónimos: no van
// ligados a una cuenta, solo sirven para enviar avisos (recetas nuevas, etc.).
const PushTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    platform: { type: String }, // "android" | "ios" (informativo)
  },
  { timestamps: true }
);

export const PushTokenModel = mongoose.model("PushToken", PushTokenSchema);

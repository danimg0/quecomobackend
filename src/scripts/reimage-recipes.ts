import "dotenv/config";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { RecipeModel } from "../db/recipe.model";

// Regenera la imagen de las recetas que todavía tienen foto de stock (Pexels)
// o placeholder, usando Vertex AI Imagen -> ImgBB. NO toca el texto.
// Uso: npm run reimage-recipes
// Solo procesa las que hagan falta: las ya re-imagenadas no se vuelven a tocar.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const generateDishImage = async (
  title: string,
  imageQuery: string
): Promise<string | null> => {
  const prompt = `Professional food photography, top-down view, of "${title}" (${imageQuery}), traditional Spanish home cooking, served on a plate on a rustic table, warm natural light, appetizing, realistic, high detail. No text, no watermark.`;
  try {
    const imageAi = new GoogleGenAI({
      vertexai: true,
      project: process.env.VERTEX_PROJECT_ID!,
      location: "us-central1",
    });
    const response = await imageAi.models.generateImages({
      model: "imagen-3.0-generate-001",
      prompt,
      config: { numberOfImages: 1, aspectRatio: "4:3" },
    });
    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) throw new Error("sin bytes de imagen");
    return imageBytes;
  } catch (e) {
    console.warn(`   ⚠️  Imagen: ${(e as Error).message}`);
    return null;
  }
};

const uploadToImgBB = async (
  base64: string,
  apiKey: string,
  name: string
): Promise<string | null> => {
  try {
    const form = new URLSearchParams();
    form.append("image", base64);
    form.append("name", name);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: form,
    });
    const json = (await res.json()) as { success?: boolean; data?: { url: string } };
    if (!json.success || !json.data?.url) throw new Error(JSON.stringify(json).slice(0, 140));
    return json.data.url;
  } catch (e) {
    console.warn(`   ⚠️  ImgBB: ${(e as Error).message}`);
    return null;
  }
};

const run = async () => {
  const IMGBB_API_KEY = process.env.IMGBB_API_KEY!;
  await mongoose.connect(process.env.MONGO_URL!);

  // Recetas sin imagen alojada en ImgBB (placehold, pexels, null, etc.)
  const pending = await RecipeModel.find({
    imageUrl: { $not: { $regex: "ibb\\.co|imgbb", $options: "i" } },
  });
  console.log(`🖼️  Recetas a re-imagenar: ${pending.length}\n`);

  let ok = 0;
  for (let i = 0; i < pending.length; i++) {
    const r = pending[i];
    console.log(`(${i + 1}/${pending.length}) ${r.title}`);
    const base64 = await generateDishImage(r.title as string, r.title as string);
    if (!base64) continue;
    const url = await uploadToImgBB(base64, IMGBB_API_KEY, r.title as string);
    if (!url) continue;
    await RecipeModel.updateOne({ _id: r._id }, { $set: { imageUrl: url } });
    ok++;
    console.log(`   ✅ Nueva imagen`);
    await sleep(1500);
  }
  console.log(`\n✅ Listo. ${ok}/${pending.length} re-imagenadas.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});

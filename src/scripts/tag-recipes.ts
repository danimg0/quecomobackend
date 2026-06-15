import "dotenv/config";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { RecipeModel } from "../db/recipe.model";
import "../db/ingredient.model"; // registra el schema Ingredient para el populate

// Etiqueta las recetas existentes con mainType + isVegetarian usando Gemini
// (Vertex AI). Solo procesa las que aún no tienen mainType, así que se puede
// relanzar sin reprocesar. Uso: npm run tag-recipes

const TEXT_MODEL = "gemini-2.5-flash-lite";

const TYPES = [
  "carne",
  "pollo",
  "pescado",
  "verdura",
  "legumbre",
  "pasta",
  "arroz",
  "huevo",
  "sopa",
  "postre",
  "otro",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const withRetry = async <T>(fn: () => Promise<T>, n = 5): Promise<T> => {
  let last: unknown;
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const w = 4000 * 2 ** i; // 4s, 8s, 16s, 32s, 64s
      console.warn(`   ⏳ reintento ${i + 1}/${n} en ${w / 1000}s (rate limit)`);
      await sleep(w);
    }
  }
  throw last;
};

type Tag = { mainType: string; isVegetarian: boolean };

const classify = async (
  ai: GoogleGenAI,
  title: string,
  ingredientNames: string[]
): Promise<Tag> => {
  const prompt = `Clasifica este plato español.
Título: "${title}"
Ingredientes: ${ingredientNames.join(", ") || "(desconocidos)"}

Devuelve SOLO un JSON válido con esta forma exacta:
{ "mainType": "uno de: ${TYPES.join(", ")}", "isVegetarian": true o false }

Reglas:
- "mainType": el ingrediente o naturaleza PRINCIPAL del plato. Si lleva carne roja o cerdo -> "carne"; pollo/pavo -> "pollo"; pescado o marisco -> "pescado"; si el protagonista son legumbres -> "legumbre"; pasta -> "pasta"; arroz -> "arroz"; huevo -> "huevo"; una sopa/crema/caldo -> "sopa"; un dulce -> "postre"; un plato principalmente de verduras -> "verdura"; si no encaja nada -> "otro".
- "isVegetarian": true SOLO si no lleva carne, pollo, pescado ni marisco. El jamón, chorizo, bacon y caldos de carne/pescado NO son vegetarianos.`;

  const resp = await withRetry(() =>
    ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    })
  );
  if (!resp.text) throw new Error("sin texto");
  const parsed = JSON.parse(resp.text) as Tag;
  const mainType = TYPES.includes(parsed.mainType) ? parsed.mainType : "otro";
  return { mainType, isVegetarian: !!parsed.isVegetarian };
};

const run = async () => {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.VERTEX_PROJECT_ID!,
    location: "global",
  });
  await mongoose.connect(process.env.MONGO_URL!);

  // Solo las que no tienen mainType todavía
  const pending = await RecipeModel.find({
    $or: [{ mainType: { $exists: false } }, { mainType: null }],
  }).populate("ingredients.ingredient", "name");

  console.log(`🏷️  Recetas a etiquetar: ${pending.length}\n`);

  let ok = 0;
  for (let i = 0; i < pending.length; i++) {
    const r = pending[i];
    const ingNames = (r.ingredients as any[])
      .map((it) => it.ingredient?.name)
      .filter(Boolean);
    console.log(`(${i + 1}/${pending.length}) ${r.title}`);
    try {
      const tag = await classify(ai, r.title as string, ingNames);
      await RecipeModel.updateOne(
        { _id: r._id },
        { $set: { mainType: tag.mainType, isVegetarian: tag.isVegetarian } }
      );
      ok++;
      console.log(
        `   ✅ ${tag.mainType}${tag.isVegetarian ? " · vegetariano" : ""}`
      );
      await sleep(2500);
    } catch (e) {
      console.error(`   ❌ ${(e as Error).message}`);
    }
  }

  console.log(`\n✅ Listo. ${ok}/${pending.length} etiquetadas.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});

import "dotenv/config";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { RecipeModel } from "../db/recipe.model";
import { IngredientModel } from "../db/ingredient.model";
import { CategoryModel } from "../db/category.model";

// Regenera texto + imagen de recetas concretas con Vertex AI (Gemini + Imagen 3).
// Uso: npm run reimage-specific

const TEXT_MODEL = "gemini-2.5-flash-lite";

const TITLES = [
  "Lentejas Estofadas",
  "Tortilla de Patatas",
  "Arroz a la Cubana",
  "Arroz con Tomate y Chorizo",
  "Gazpacho Andaluz Casero",
  "Pisto Manchego",
  "Pollo Guisado a lo Pobre",
  "Patatas Guisadas con Chorizo",
  "Arroz Blanco con Tomate Casero",
  "Sardinas a la Plancha con Ajo y Perejil",
  "Patatas Bravas Caseras",
  "Sopa de Ajo Castellana",
  "Bacalao a la Vizcaína",
  "Huevos Rotos con Patatas y Jamón",
  "Gambas al Ajillo",
  "Salmorejo Cordobés",
  "Crema de Calabacín Casera",
  "Pimientos Rellenos de Carne",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const withRetry = async <T>(fn: () => Promise<T>, label: string, n = 4): Promise<T> => {
  let last: unknown;
  for (let i = 0; i < n; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      const w = 2000 * 2 ** i;
      console.warn(`   ⏳ ${label} reintento ${i + 1}/${n} en ${w / 1000}s`);
      await sleep(w);
    }
  }
  throw last;
};

type Gen = {
  description: string;
  duration: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  categories: string[];
  ingredients: { name: string; quantity: number; unit: string }[];
  steps: string[];
  imageQuery: string;
};

const genText = async (ai: GoogleGenAI, dish: string, categoryNames: string[], existingIngredients: string[]): Promise<Gen> => {
  const prompt = `Eres un chef español. Escribe la receta casera y tradicional de "${dish}".

Devuelve SOLO un JSON válido con esta forma exacta:
{
  "description": "1-2 frases apetitosas",
  "duration": number (minutos),
  "difficulty": "EASY" | "MEDIUM" | "HARD",
  "categories": ["una o más EXACTAS de: ${categoryNames.join(", ")}"],
  "ingredients": [{ "name": "string", "quantity": number, "unit": "gr|ml|unidades|dientes|..." }],
  "steps": ["paso 1", "paso 2", "..."],
  "imageQuery": "descripción EN INGLÉS del plato ya emplatado para generar su foto"
}

Reglas:
- Entre 4 y 8 ingredientes, cantidades para 2-4 personas.
- Entre 3 y 6 pasos. Cada paso es UNA frase corta, UNA acción, máx 18 palabras. Nada de parrafadas.
- Lenguaje sencillo para cualquiera de 18 a 80 años.
- Reutiliza el nombre EXACTO de estos ingredientes cuando exista: ${existingIngredients.join(", ")}. Solo crea uno nuevo si no encaja ninguno.`;

  const resp = await withRetry(
    () => ai.models.generateContent({ model: TEXT_MODEL, contents: prompt, config: { responseMimeType: "application/json" } }),
    "Gemini"
  );
  if (!resp.text) throw new Error("sin texto");
  return JSON.parse(resp.text) as Gen;
};

const genImage = async (title: string, query: string): Promise<string | null> => {
  const prompt = `Professional food photography, top-down view, of "${title}" (${query}), traditional Spanish home cooking, served on a plate on a rustic wooden table, warm natural light, appetizing, realistic, high detail. No text, no watermark.`;
  try {
    const ai = new GoogleGenAI({ vertexai: true, project: process.env.VERTEX_PROJECT_ID!, location: "us-central1" });
    const response = await withRetry(
      () => ai.models.generateImages({ model: "imagen-3.0-generate-001", prompt, config: { numberOfImages: 1, aspectRatio: "4:3" } }),
      "Vertex Imagen"
    );
    const bytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!bytes) throw new Error("sin bytes");
    return bytes;
  } catch (e) {
    console.warn(`   ⚠️  Imagen: ${(e as Error).message}`);
    return null;
  }
};

const uploadToImgBB = async (base64: string, name: string): Promise<string | null> => {
  try {
    const form = new URLSearchParams();
    form.append("image", base64);
    form.append("name", name);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, { method: "POST", body: form });
    const json = (await res.json()) as { success?: boolean; data?: { url: string } };
    return json.success && json.data?.url ? json.data.url : null;
  } catch { return null; }
};

const resolveIng = async (name: string): Promise<mongoose.Types.ObjectId> => {
  const clean = name.trim();
  const ex = await IngredientModel.findOne({ name: { $regex: `^${clean}$`, $options: "i" }, owner: null });
  if (ex) return ex._id as mongoose.Types.ObjectId;
  const c = await IngredientModel.create({ name: clean, owner: null });
  console.log(`   🆕 ${clean}`);
  return c._id as mongoose.Types.ObjectId;
};

const run = async () => {
  const ai = new GoogleGenAI({ vertexai: true, project: process.env.VERTEX_PROJECT_ID!, location: "global" });
  await mongoose.connect(process.env.MONGO_URL!);

  const cats = await CategoryModel.find();
  const catByName = new Map(cats.map((c) => [(c.name as string).toLowerCase(), c._id]));
  const catNames = cats.map((c) => c.name as string);
  const existingIngredients = (await IngredientModel.find({ owner: null }, "name")).map((i) => i.name as string);

  let ok = 0;
  for (let i = 0; i < TITLES.length; i++) {
    const title = TITLES[i];
    console.log(`\n(${i + 1}/${TITLES.length}) ${title}`);

    const recipe = await RecipeModel.findOne({ title: { $regex: `^${title}$`, $options: "i" } });
    if (!recipe) { console.log("   ⚠️  No encontrada, saltando."); continue; }

    try {
      const g = await genText(ai, title, catNames, existingIngredients);
      const categoryIds = g.categories.map((n) => catByName.get(n.trim().toLowerCase())).filter(Boolean);
      if (categoryIds.length === 0) categoryIds.push(cats[0]._id);

      const ingredients = [];
      for (const ing of g.ingredients) {
        if (!ing?.name?.trim()) continue;
        ingredients.push({
          ingredient: await resolveIng(ing.name),
          quantity: typeof ing.quantity === "number" && ing.quantity > 0 ? ing.quantity : 1,
          unit: ing.unit?.trim() || "al gusto",
        });
        if (!existingIngredients.some((n) => n.toLowerCase() === ing.name.trim().toLowerCase()))
          existingIngredients.push(ing.name.trim());
      }

      const base64 = await genImage(title, g.imageQuery || title);
      const imageUrl = base64 ? await uploadToImgBB(base64, title) : null;

      await RecipeModel.updateOne({ _id: recipe._id }, {
        $set: {
          description: g.description,
          duration: g.duration,
          difficulty: g.difficulty,
          categories: categoryIds,
          ingredients,
          steps: g.steps,
          ...(imageUrl ? { imageUrl } : {}),
        },
      });

      ok++;
      console.log(`   ✅ Actualizada${imageUrl ? " + foto" : " (sin foto nueva)"}`);
      if (i < TITLES.length - 1) await sleep(32000);
    } catch (e) {
      console.error(`   ❌ ${(e as Error).message}`);
    }
  }

  console.log(`\n✅ Listo. ${ok}/${TITLES.length} actualizadas.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => { console.error("❌", e); process.exit(1); });

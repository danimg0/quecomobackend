import "dotenv/config";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { RecipeModel } from "../db/recipe.model";
import { IngredientModel } from "../db/ingredient.model";
import { CategoryModel } from "../db/category.model";

// Regenera EN SU SITIO las 10 recetas del seed (que estaban muy escuetas):
// mismo plato y mismo _id, pero con pasos cortos, ingredientes limpios y foto
// IA (FLUX). Actualiza el documento, no lo borra. Relanzable sin duplicar.
// Uso: npm run regen-seed

const TEXT_MODEL = "gemini-2.5-flash-lite";

// match = título EXACTO actual en la BD (para localizar el doc sin tocar otras
// recetas); dish = nombre con el que se regenera/guarda.
const SEED_TITLES: { match: string; dish: string }[] = [
  { match: "Lentejas Estofadas", dish: "Lentejas Estofadas" },
  { match: "Tortilla de Patatas", dish: "Tortilla de Patatas" },
  { match: "Macarrones con Tomate y Chorizo", dish: "Macarrones con Tomate y Chorizo" },
  { match: "Pechuga de Pollo al Ajillo", dish: "Pechuga de Pollo al Ajillo" },
  { match: "Arroz a la Cubana", dish: "Arroz a la Cubana" },
  { match: "Ensalada Mixta Completa", dish: "Ensalada Mixta Completa" },
  { match: "Garbanzos con Espinacas (Potaje)", dish: "Garbanzos con Espinacas" },
  { match: "Revuelto de Huevos con Jamón", dish: "Revuelto de Huevos con Jamón" },
  { match: "Pastel de Carne y Patata", dish: "Pastel de Carne y Patata" },
  { match: "Merluza (o Pescado) en Salsa Verde", dish: "Merluza en Salsa Verde" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const withRetry = async <T>(fn: () => Promise<T>, label: string, n = 4): Promise<T> => {
  let last: unknown;
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch (e) {
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

const genRecipe = async (
  ai: GoogleGenAI,
  dish: string,
  categoryNames: string[],
  existingIngredients: string[]
): Promise<Gen> => {
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
  const text = resp.text;
  if (!text) throw new Error("sin texto");
  return JSON.parse(text) as Gen;
};

const genImage = async (title: string, q: string): Promise<string | null> => {
  const prompt = `Professional food photography, top-down view, of "${title}" (${q}), traditional Spanish home cooking, served on a plate on a rustic table, warm natural light, appetizing, realistic, high detail. No text, no watermark.`;
  try {
    const imageAi = new GoogleGenAI({
      vertexai: true,
      project: process.env.VERTEX_PROJECT_ID!,
      location: "global",
    });
    const response = await withRetry(
      () => imageAi.models.generateImages({
        model: "imagen-3.0-generate-001",
        prompt,
        config: { numberOfImages: 1, aspectRatio: "4:3" },
      }),
      "Vertex Imagen"
    );
    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) throw new Error("sin bytes");
    return imageBytes;
  } catch (e) {
    console.warn(`   ⚠️  Imagen: ${(e as Error).message}`);
    return null;
  }
};

const upload = async (b64: string, key: string, name: string): Promise<string | null> => {
  try {
    const form = new URLSearchParams();
    form.append("image", b64);
    form.append("name", name);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, { method: "POST", body: form });
    const j = (await res.json()) as { success?: boolean; data?: { url: string } };
    return j.success && j.data?.url ? j.data.url : null;
  } catch {
    return null;
  }
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
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.VERTEX_PROJECT_ID!,
    location: "global",
  });
  const IMGBB = process.env.IMGBB_API_KEY!;
  await mongoose.connect(process.env.MONGO_URL!);

  const cats = await CategoryModel.find();
  const catByName = new Map(cats.map((c) => [(c.name as string).toLowerCase(), c._id]));
  const catNames = cats.map((c) => c.name as string);
  const existingIngredients = (await IngredientModel.find({ owner: null }, "name")).map((i) => i.name as string);

  let ok = 0;
  for (let i = 0; i < SEED_TITLES.length; i++) {
    const { match, dish } = SEED_TITLES[i];
    console.log(`\n(${i + 1}/${SEED_TITLES.length}) ${dish}`);
    // Localiza la receta existente por título EXACTO (no toca otras recetas)
    const existing = await RecipeModel.findOne({ title: match });

    // Idempotencia: si ya tiene pasos cortos y foto subida (imgbb), está hecha.
    if (existing) {
      const longest = Math.max(...(existing.steps as string[]).map((s) => s.length));
      const hostedImg = (existing.imageUrl as string)?.includes("ibb.co") ||
        (existing.imageUrl as string)?.includes("imgbb");
      if (longest <= 90 && hostedImg) {
        console.log("   ⏭️  Ya regenerada, salto.");
        continue;
      }
    }
    try {
      const g = await genRecipe(ai, dish, catNames, existingIngredients);
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

      const b64 = await genImage(dish, g.imageQuery || dish);
      const imageUrl = b64 ? await upload(b64, IMGBB, dish) : null;

      const update: any = {
        title: dish,
        description: g.description,
        duration: g.duration,
        difficulty: g.difficulty,
        categories: categoryIds,
        ingredients,
        steps: g.steps,
      };
      if (imageUrl) update.imageUrl = imageUrl;

      if (existing) {
        await RecipeModel.updateOne({ _id: existing._id }, { $set: update });
        console.log(`   ✅ Actualizada${imageUrl ? " + foto" : " (sin foto nueva)"}`);
      } else {
        await RecipeModel.create({ ...update, imageUrl: imageUrl || "https://placehold.co/600x400/F97316/white?text=QueComo" });
        console.log(`   ✅ Creada${imageUrl ? " + foto" : ""}`);
      }
      ok++;
      await sleep(imageUrl ? 32000 : 1500);
    } catch (e) {
      console.error(`   ❌ ${(e as Error).message}`);
    }
  }
  console.log(`\n✅ Listo. ${ok}/${SEED_TITLES.length} regeneradas.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});

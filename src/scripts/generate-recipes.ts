import "dotenv/config";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { RecipeModel } from "../db/recipe.model";
import { IngredientModel } from "../db/ingredient.model";
import { CategoryModel } from "../db/category.model";
import { notifyNewRecipes } from "../helpers/push";
import { deriveTags } from "./lib/derive-tags";

// =============================================================================
// Generación automática de recetas con IA (Gemini) + imagen + subida a Mongo.
//
//   1. Gemini (texto)         -> receta en JSON validado contra el esquema de la BD
//   2. Vertex AI Imagen       -> foto del plato (base64) -> ImgBB -> URL pública
//   3. Mongo                  -> inserta la receta (ingredientes y categorías reales)
//
// Uso local:   npm run generate-recipes        (2 recetas, valor por defecto)
//              RECIPES_PER_RUN=3 npm run generate-recipes
//
// En CI lo lanza GitHub Actions (.github/workflows/generate-recipes.yml).
// NO borra nada. No duplica: si el título ya existe, salta a otra receta.
// =============================================================================

const TEXT_MODEL = "gemini-2.5-flash-lite";
const RECIPES_PER_RUN = Number(process.env.RECIPES_PER_RUN) || 2;
const PLACEHOLDER_IMAGE = "https://placehold.co/600x400/F97316/white?text=QueComo";

type GeneratedRecipe = {
  title: string;
  description: string;
  duration: number;
  servings: number; // nº de comensales al que corresponden las cantidades
  difficulty: "EASY" | "MEDIUM" | "HARD";
  categories: string[]; // nombres de categorías existentes
  ingredients: { name: string; quantity: number; unit: string }[];
  steps: string[];
  imageQuery: string; // 2-3 palabras clave en inglés para buscar la foto
  mainType: string; // tipo principal (carne, pescado, pasta...) para personalizar
  isVegetarian: boolean; // sin carne ni pescado
};

// --- Helpers ----------------------------------------------------------------

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Falta ${key} en el entorno (.env o GitHub Secret)`);
    process.exit(1);
  }
  return value;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Reintenta una operación con backoff exponencial. Útil porque Gemini devuelve
// 503 (sobrecarga) o 429 (rate limit) de forma intermitente.
const withRetry = async <T>(
  fn: () => Promise<T>,
  label: string,
  attempts = 4
): Promise<T> => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const wait = 2000 * Math.pow(2, i); // 2s, 4s, 8s, 16s
      console.warn(
        `   ⏳ ${label} falló (intento ${i + 1}/${attempts}), reintento en ${wait / 1000}s...`
      );
      await sleep(wait);
    }
  }
  throw lastError;
};

// Pide a Gemini una receta en JSON, dándole las categorías y los títulos que
// ya existen para que elija categoría válida y no repita platos.
const generateRecipeJson = async (
  ai: GoogleGenAI,
  categoryNames: string[],
  existingTitles: string[],
  existingIngredients: string[]
): Promise<GeneratedRecipe> => {
  const prompt = `Eres un chef español. Crea UNA receta casera, sencilla y tradicional.

Devuelve SOLO un objeto JSON válido (sin markdown, sin texto extra) con esta forma exacta:
{
  "title": "string (en español, conciso)",
  "description": "string (1-2 frases apetitosas)",
  "duration": number (minutos totales),
  "servings": number (nº de comensales al que corresponden las cantidades, normalmente 4),
  "difficulty": "EASY" | "MEDIUM" | "HARD",
  "categories": ["una o más de estas EXACTAS: ${categoryNames.join(", ")}"],
  "ingredients": [{ "name": "string", "quantity": number, "unit": "string (gr, ml, unidades, dientes, etc.)" }],
  "steps": ["paso 1 bien explicado", "paso 2", "..."],
  "imageQuery": "descripción EN INGLÉS del plato YA terminado y emplatado, para generar su foto (ej. 'spanish potato omelette, golden, sliced', 'red gazpacho soup in a bowl', 'grilled sardines with lemon'). Describe aspecto, color y presentación, no el proceso.",
  "mainType": "tipo principal, UNO de: carne, pollo, pescado, verdura, legumbre, pasta, arroz, huevo, sopa, postre, otro",
  "isVegetarian": true o false (true SOLO si no lleva carne, pollo, pescado ni marisco; jamón/chorizo/bacon NO son vegetarianos)
}

Reglas:
- Entre 4 y 8 ingredientes con cantidades realistas para 2-4 personas.
- PASOS: los que la receta necesite DE VERDAD según su complejidad. Para platos SIN cocción real (ensaladas, tostadas, montar un plato, batidos): 3-5 pasos COMO MUCHO. Un plato normal: 5-7. Un guiso o algo elaborado: 7-9. NO inventes pasos de relleno ni alargues una receta sencilla, ni juntes varias fases distintas en un mismo paso. Cada paso cubre UNA fase y explica el CÓMO para que salga bien: el fuego (suave/medio/fuerte), el tiempo aproximado ("unos 5 min") y una pista visual o sensorial para saber cuándo está ("hasta que la cebolla esté transparente", "hasta que se dore", "hasta que espese"). 1-2 frases, máximo unas 30 palabras por paso. Detallado y realista, pero NUNCA un párrafo largo. Empieza cada paso por la acción (verbo).
- Que los pasos tengan sentido tanto para alguien que NO ha cocinado nunca como para quien ya sabe: no des nada por supuesto, pero sin ser condescendiente. Si usas un término de cocina ("pochar", "rehogar", "punto de nieve", "desglasar"), explícalo en pocas palabras la primera vez.
- Lenguaje sencillo y cercano, pensado para cualquiera de 18 a 80 años (incluida gente mayor).
- "categories" debe contener SOLO valores de la lista dada.
- VARIEDAD: cambia el ingrediente principal y el tipo de plato respecto a lo ya existente. Alterna entre carne, pollo, pescado, huevos, legumbres, pasta, arroz, verduras y sopas frías o calientes. NO abuses de las patatas ni repitas el mismo concepto de plato.
- "imageQuery" SIEMPRE en inglés, describiendo la comida (no la cocina ni utensilios).
- INGREDIENTES: reutiliza SIEMPRE el nombre EXACTO de esta lista cuando el ingrediente exista en ella (no inventes variantes como "Huevo" si ya existe "Huevos", ni "Dientes de ajo" si ya existe "Ajo"). Usa nombres genéricos y en singular/plural tal cual aparecen. Lista de ingredientes existentes: ${existingIngredients.join(", ")}. Solo crea un nombre nuevo si de verdad no encaja ninguno.
- NO repitas ninguno de estos platos ya existentes: ${existingTitles.join(", ") || "(ninguno)"}.`;

  const response = await withRetry(
    () =>
      ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      }),
    "Gemini texto"
  );

  const text = response.text;
  if (!text) throw new Error("Gemini no devolvió texto para la receta");

  const recipe = JSON.parse(text) as GeneratedRecipe;
  if (!recipe.title || !recipe.ingredients?.length || !recipe.steps?.length) {
    throw new Error(`Receta incompleta: ${JSON.stringify(recipe)}`);
  }
  return recipe;
};

// Genera una foto IA del plato con Vertex AI Imagen 3.
// Devuelve los bytes en base64. Devuelve null si falla.
const generateDishImage = async (
  title: string,
  imageQuery: string
): Promise<string | null> => {
  const prompt = `Professional food photography, top-down view, of "${title}" (${imageQuery}), traditional Spanish home cooking, served on a plate on a rustic table, warm natural light, appetizing, realistic, high detail. No text, no watermark.`;

  try {
    const imageAi = new GoogleGenAI({
      vertexai: true,
      project: process.env.VERTEX_PROJECT_ID!,
      location: "global",
    });

    const response = await withRetry(
      () =>
        imageAi.models.generateImages({
          model: "imagen-3.0-generate-001",
          prompt,
          config: { numberOfImages: 1, aspectRatio: "4:3" },
        }),
      "Vertex Imagen"
    );

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) throw new Error("sin bytes de imagen");
    return imageBytes;
  } catch (e) {
    console.warn("   ⚠️  Error generando imagen:", (e as Error).message);
    return null;
  }
};

// Sube los bytes base64 a ImgBB y devuelve la URL pública permanente.
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
    const json = (await res.json()) as {
      success?: boolean;
      data?: { url: string };
    };
    if (!json.success || !json.data?.url) {
      throw new Error(`ImgBB: ${JSON.stringify(json).slice(0, 160)}`);
    }
    return json.data.url;
  } catch (e) {
    console.warn("   ⚠️  Error subiendo a ImgBB:", (e as Error).message);
    return null;
  }
};

// Busca un ingrediente global por nombre (case-insensitive) o lo crea.
const resolveIngredientId = async (
  name: string
): Promise<mongoose.Types.ObjectId> => {
  const clean = name.trim();
  const existing = await IngredientModel.findOne({
    name: { $regex: `^${clean}$`, $options: "i" },
    owner: null,
  });
  if (existing) return existing._id as mongoose.Types.ObjectId;

  const created = await IngredientModel.create({ name: clean, owner: null });
  console.log(`   🆕 Ingrediente creado: ${clean}`);
  return created._id as mongoose.Types.ObjectId;
};

// --- Main -------------------------------------------------------------------

const run = async () => {
  const MONGO_URL = requireEnv("MONGO_URL");
  const IMGBB_API_KEY = requireEnv("IMGBB_API_KEY");
  requireEnv("VERTEX_PROJECT_ID");
  requireEnv("GOOGLE_APPLICATION_CREDENTIALS");

  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.VERTEX_PROJECT_ID!,
    location: "global",
  });

  console.log("🔌 Conectando a MongoDB...");
  await mongoose.connect(MONGO_URL);

  const categories = await CategoryModel.find();
  if (categories.length === 0) {
    console.error("❌ No hay categorías en la BD. Lanza el seed primero.");
    await mongoose.disconnect();
    process.exit(1);
  }
  const categoryNames = categories.map((c) => c.name as string);
  const categoryByName = new Map(
    categories.map((c) => [(c.name as string).toLowerCase(), c._id])
  );

  // Títulos existentes para evitar duplicados (se va engrosando en el bucle)
  const existingTitles = (await RecipeModel.find({}, "title")).map(
    (r) => r.title as string
  );

  // Vocabulario de ingredientes existentes para que la IA reutilice nombres
  // exactos en vez de fragmentar ("Huevo" vs "Huevos"). Se engrosa en el bucle.
  const existingIngredients = (
    await IngredientModel.find({ owner: null }, "name")
  ).map((i) => i.name as string);

  let created = 0;
  for (let i = 0; i < RECIPES_PER_RUN; i++) {
    console.log(`\n🍳 Receta ${i + 1}/${RECIPES_PER_RUN}...`);
    try {
      const recipe = await generateRecipeJson(
        ai,
        categoryNames,
        existingTitles,
        existingIngredients
      );

      // Anti-duplicado defensivo (por si la IA ignora la instrucción)
      if (
        existingTitles.some(
          (t) => t.toLowerCase() === recipe.title.trim().toLowerCase()
        )
      ) {
        console.log(`   ⏭️  "${recipe.title}" ya existe, salto.`);
        continue;
      }
      console.log(`   📝 ${recipe.title}`);

      // Mapear categorías (nombres -> ObjectId). Filtra las que no existan.
      const categoryIds = recipe.categories
        .map((n) => categoryByName.get(n.trim().toLowerCase()))
        .filter(Boolean);
      if (categoryIds.length === 0) categoryIds.push(categories[0]._id); // fallback

      // Resolver ingredientes (crear los que falten)
      const ingredients = [];
      for (const ing of recipe.ingredients) {
        if (!ing?.name?.trim()) continue; // sin nombre -> lo ignoramos
        const ingredient = await resolveIngredientId(ing.name);
        ingredients.push({
          ingredient,
          // flash-lite a veces omite cantidad/unidad: ponemos valores seguros
          quantity:
            typeof ing.quantity === "number" && ing.quantity > 0
              ? ing.quantity
              : 1,
          unit: ing.unit?.trim() || "al gusto",
        });
        // Que las siguientes recetas de esta tanda reutilicen este nombre
        if (
          !existingIngredients.some(
            (n) => n.toLowerCase() === ing.name.trim().toLowerCase()
          )
        ) {
          existingIngredients.push(ing.name.trim());
        }
      }

      // Imagen IA del plato con Vertex AI Imagen -> subida a ImgBB (placeholder si falla)
      const query = recipe.imageQuery?.trim() || recipe.title;
      const base64 = await generateDishImage(recipe.title, query);
      const hosted = base64
        ? await uploadToImgBB(base64, IMGBB_API_KEY, recipe.title)
        : null;
      const imageUrl = hosted ?? PLACEHOLDER_IMAGE;
      console.log(
        hosted ? `   🖼️  Imagen IA generada y subida` : "   ⚠️  Sin imagen, placeholder"
      );

      // Etiquetas de dieta/alérgenos y sensoriales derivadas de los ingredientes
      const derived = deriveTags({
        title: recipe.title,
        mainType: recipe.mainType,
        isVegetarian: recipe.isVegetarian,
        ingredientNames: recipe.ingredients.map((i) => i.name),
      });

      await RecipeModel.create({
        title: recipe.title.trim(),
        description: recipe.description,
        duration: recipe.duration,
        servings: typeof recipe.servings === "number" && recipe.servings > 0 ? recipe.servings : 4,
        difficulty: recipe.difficulty,
        categories: categoryIds,
        ingredients,
        steps: recipe.steps,
        imageUrl,
        mainType: recipe.mainType,
        isVegetarian: !!recipe.isVegetarian,
        ...derived,
      } as any);

      existingTitles.push(recipe.title.trim());
      created++;
      console.log(`   ✅ Guardada en la BD`);
      if (hosted) await sleep(32000); // respetar límite de Imagen 3 (~2 RPM)
    } catch (e) {
      console.error(`   ❌ Error en receta ${i + 1}:`, (e as Error).message);
    }
  }

  console.log(`\n✅ Listo. ${created}/${RECIPES_PER_RUN} recetas creadas.`);

  // Aviso push a los dispositivos suscritos (si se ha creado alguna receta)
  if (created > 0) {
    await notifyNewRecipes(created);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("❌ Error fatal:", e);
  process.exit(1);
});

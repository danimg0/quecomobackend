import "dotenv/config";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { RecipeModel } from "../db/recipe.model";
import "../db/ingredient.model"; // registra el schema Ingredient para el populate

// Regenera SOLO los pasos (texto) de las recetas que aún tienen el estilo viejo
// escueto, con el prompt nuevo (detallado pero sin parrafadas). NO toca imágenes,
// ingredientes ni nada más. Idempotente: solo procesa recetas con pasos cortos.
// Uso: npm run regen-steps

const TEXT_MODEL = "gemini-2.5-flash-lite";

// Umbral: si el paso más largo de una receta es más corto que esto, asumimos
// que tiene el estilo viejo y la regeneramos. Los pasos nuevos son más largos.
const OLD_STYLE_MAX_LEN = 90;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const withRetry = async <T>(fn: () => Promise<T>, n = 5): Promise<T> => {
  let last: unknown;
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const w = 4000 * 2 ** i;
      console.warn(`   ⏳ reintento ${i + 1}/${n} en ${w / 1000}s`);
      await sleep(w);
    }
  }
  throw last;
};

const genSteps = async (
  ai: GoogleGenAI,
  title: string,
  ingredientNames: string[]
): Promise<string[]> => {
  const prompt = `Eres un chef español. Reescribe los PASOS de la receta de "${title}".
Ingredientes disponibles: ${ingredientNames.join(", ")}.

Devuelve SOLO un JSON válido: { "steps": ["paso 1", "paso 2", "..."] }

Reglas de los pasos:
- Los pasos que la receta necesite DE VERDAD según su complejidad. Platos SIN cocción real (ensaladas, tostadas, montar un plato): 3-5 pasos como mucho. Un plato normal: 5-7. Un guiso o algo elaborado: 7-9. NO inventes relleno ni alargues una receta sencilla.
- Cada paso cubre UNA fase y explica el CÓMO para que salga bien: el fuego (suave/medio/fuerte), el tiempo aproximado ("unos 5 min") y una pista visual o sensorial ("hasta que la cebolla esté transparente", "hasta que se dore"). 1-2 frases, máximo unas 30 palabras. Detallado y realista, NUNCA un párrafo. Empieza por la acción.
- Que tenga sentido para alguien que NO ha cocinado nunca y para quien sí. Si usas un término ("pochar", "rehogar"), explícalo en pocas palabras. Usa solo los ingredientes dados.
- Lenguaje sencillo y cercano (público de 18 a 80 años).`;

  const resp = await withRetry(() =>
    ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    })
  );
  const { steps } = JSON.parse(resp.text || "{}") as { steps: string[] };
  if (!Array.isArray(steps) || steps.length === 0) throw new Error("sin pasos");
  return steps;
};

const run = async () => {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.VERTEX_PROJECT_ID!,
    location: "global",
  });
  await mongoose.connect(process.env.MONGO_URL!);

  const all = await RecipeModel.find().populate(
    "ingredients.ingredient",
    "name"
  );

  // Solo las de estilo viejo (paso más largo por debajo del umbral)
  const pending = all.filter((r) => {
    const steps = (r.steps as string[]) || [];
    if (steps.length === 0) return false;
    const longest = Math.max(...steps.map((s) => s.length));
    return longest < OLD_STYLE_MAX_LEN;
  });

  console.log(
    `✍️  Recetas a regenerar pasos: ${pending.length} (de ${all.length})\n`
  );

  let ok = 0;
  for (let i = 0; i < pending.length; i++) {
    const r = pending[i];
    const ingNames = (r.ingredients as any[])
      .map((it) => it.ingredient?.name)
      .filter(Boolean);
    console.log(`(${i + 1}/${pending.length}) ${r.title}`);
    try {
      const steps = await genSteps(ai, r.title as string, ingNames);
      await RecipeModel.updateOne({ _id: r._id }, { $set: { steps } });
      ok++;
      console.log(`   ✅ ${steps.length} pasos`);
      await sleep(1500);
    } catch (e) {
      console.error(`   ❌ ${(e as Error).message}`);
    }
  }

  console.log(`\n✅ Listo. ${ok}/${pending.length} regeneradas.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});

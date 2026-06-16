import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

// Muestra (solo texto, sin Mongo ni imágenes) de cómo quedan los PASOS con las
// nuevas reglas del prompt. Sirve para validar el estilo antes del lote grande.
// Uso: npm run sample-steps

const TEXT_MODEL = "gemini-2.5-flash-lite";

const DISHES = [
  "Ensalada Mixta Completa",
  "Tostada de Aguacate",
  "Lentejas Estofadas con Chorizo",
];

const prompt = (dish: string) => `Eres un chef español. Escribe los PASOS de la receta casera de "${dish}".

Devuelve SOLO un JSON válido: { "steps": ["paso 1", "paso 2", "..."] }

Reglas de los pasos:
- Los pasos que la receta necesite DE VERDAD según su complejidad: una ensalada o algo simple puede llevar 3-4; un guiso, 7-9. NO inventes relleno ni alargues una receta sencilla.
- Cada paso cubre UNA fase y explica el CÓMO para que salga bien: el fuego (suave/medio/fuerte), el tiempo aproximado ("unos 5 min") y una pista visual o sensorial para saber cuándo está ("hasta que la cebolla esté transparente", "hasta que se dore", "hasta que espese").
- 1-2 frases, máximo unas 30 palabras por paso. Detallado y realista, pero NUNCA un párrafo largo. Empieza cada paso por la acción (verbo).
- Que tenga sentido tanto para alguien que NO ha cocinado nunca como para quien ya sabe. Si usas un término ("pochar", "rehogar", "desglasar"), explícalo en pocas palabras la primera vez.
- Lenguaje sencillo y cercano (público de 18 a 80 años).`;

const run = async () => {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.VERTEX_PROJECT_ID!,
    location: "global",
  });

  for (const dish of DISHES) {
    const resp = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt(dish),
      config: { responseMimeType: "application/json" },
    });
    const { steps } = JSON.parse(resp.text || "{}") as { steps: string[] };
    console.log(`\n========== ${dish} (${steps?.length || 0} pasos) ==========`);
    (steps || []).forEach((s, i) => console.log(`${i + 1}. ${s}`));
  }
  process.exit(0);
};

run().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});

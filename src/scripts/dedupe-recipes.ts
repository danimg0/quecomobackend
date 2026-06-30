import "dotenv/config";
import mongoose from "mongoose";
import { RecipeModel } from "../db/recipe.model";

// Encuentra recetas duplicadas (el MISMO plato con otro nombre) y deja solo la
// mejor de cada grupo. Por seguridad va en MODO SIMULACIÓN: solo enseña lo que
// borraría. Para borrar de verdad, añade --confirm:
//
//   npm run dedupe-recipes            (simulación, no borra nada)
//   npm run dedupe-recipes -- --confirm   (borra de verdad)
//
// Agrupa por el conjunto de palabras significativas del título (sin acentos ni
// palabras de relleno). Es CONSERVADOR: solo junta títulos casi idénticos, para
// no borrar recetas que en realidad sean distintas.

const CONFIRM = process.argv.includes("--confirm");

// Palabras de relleno que no definen el plato (se ignoran al comparar).
const FILLER = new Set([
  "de", "la", "el", "los", "las", "con", "y", "a", "al", "en", "su", "sus",
  "un", "una", "unos", "unas", "e", "o", "lo", "para", "del",
  "casero", "casera", "caseros", "caseras", "sencillo", "sencilla",
  "sencillos", "sencillas", "clasico", "clasica", "tradicional", "rico",
  "rica", "completa", "completo", "facil", "faciles", "rapido", "rapida",
  "abuela", "cazuela", "barro", "casa", "autentico", "autentica", "estilo",
  "rica", "buenisima", "deliciosa", "delicioso",
]);

const tokenKey = (title: string): string => {
  const tokens = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w));
  // Conjunto ordenado de palabras significativas -> clave del "concepto"
  return Array.from(new Set(tokens)).sort().join(" ");
};

// "Mejor" receta de un grupo: con foto real (ibb) y pasos más detallados.
const score = (r: any): number => {
  const steps: string[] = r.steps || [];
  const hasImg = /ibb\.co|imgbb/i.test(r.imageUrl || "") ? 1000 : 0;
  const totalChars = steps.reduce((a, s) => a + s.length, 0);
  return hasImg + steps.length * 10 + totalChars / 100;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URL!);
  const recipes = await RecipeModel.find({}, "title steps imageUrl");

  // Agrupar por clave de concepto
  const groups = new Map<string, any[]>();
  for (const r of recipes) {
    const key = tokenKey(r.title as string);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const toDelete: any[] = [];
  console.log(`\n🔁 Grupos de recetas duplicadas (mismo plato, otro nombre):\n`);
  for (const group of Array.from(groups.values())) {
    if (group.length < 2) continue;
    // Ordenar por "mejor" primero; el primero se queda, el resto fuera
    group.sort((a: any, b: any) => score(b) - score(a));
    const keep = group[0];
    const drop = group.slice(1);
    console.log(`• ${keep.title}`);
    console.log(`    ✅ se queda: "${keep.title}"`);
    for (const d of drop) {
      console.log(`    🗑️  borrar:  "${d.title}"`);
      toDelete.push(d);
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(
    `Recetas: ${recipes.length}  ·  a borrar: ${toDelete.length}  ·  quedarían: ${recipes.length - toDelete.length}`
  );

  if (toDelete.length === 0) {
    console.log("✅ No hay duplicados claros que borrar.");
  } else if (!CONFIRM) {
    console.log(
      "\n⚠️  MODO SIMULACIÓN: no se ha borrado nada.\n" +
        "   Para borrar de verdad:  npm run dedupe-recipes -- --confirm"
    );
  } else {
    const ids = toDelete.map((d) => d._id);
    const res = await RecipeModel.deleteMany({ _id: { $in: ids } });
    console.log(`\n🗑️  Borradas ${res.deletedCount} recetas duplicadas.`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});

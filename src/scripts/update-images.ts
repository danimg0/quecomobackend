import "dotenv/config";
import mongoose from "mongoose";
import { RecipeModel } from "../db/recipe.model";
import { CategoryModel } from "../db/category.model";

// Actualiza SOLO las imágenes de recetas y categorías existentes.
// NO borra usuarios ni favoritos (a diferencia del seed).
// Usa loremflickr: fotos reales por palabra clave, fijadas con ?lock para que no cambien.

const img = (keywords: string, lock: number) =>
  `https://loremflickr.com/600/400/${keywords}?lock=${lock}`;

// Mapa título de receta -> foto real relacionada
const recipeImages: Record<string, string> = {
  "Lentejas Estofadas": img("lentils,stew", 1),
  "Tortilla de Patatas": img("potato,omelette", 2),
  "Macarrones con Tomate y Chorizo": img("pasta,tomato", 3),
  "Pechuga de Pollo al Ajillo": img("chicken,garlic", 4),
  "Arroz a la Cubana": img("rice,fried,egg", 5),
  "Ensalada Mixta Completa": img("salad,vegetables", 6),
  "Garbanzos con Espinacas (Potaje)": img("chickpeas,spinach", 7),
  "Revuelto de Huevos con Jamón": img("scrambled,eggs", 8),
  "Pastel de Carne y Patata": img("shepherds,pie", 9),
  "Merluza (o Pescado) en Salsa Verde": img("fish,fillet", 10),
};

// Mapa nombre de categoría -> foto real
const categoryImages: Record<string, string> = {
  Almuerzo: img("lunch,food", 11),
  Cena: img("dinner,food", 12),
};

const run = async () => {
  const MONGO_URL = process.env.MONGO_URL;
  if (!MONGO_URL) {
    console.error("❌ Falta MONGO_URL en el .env");
    process.exit(1);
  }

  console.log("🔌 Conectando...");
  await mongoose.connect(MONGO_URL);

  let updated = 0;

  for (const [title, imageUrl] of Object.entries(recipeImages)) {
    const res = await RecipeModel.updateOne({ title }, { $set: { imageUrl } });
    if (res.matchedCount > 0) {
      updated++;
      console.log(`🖼️  Receta: ${title}`);
    } else {
      console.log(`⚠️  No encontrada (receta): ${title}`);
    }
  }

  for (const [name, imageUrl] of Object.entries(categoryImages)) {
    const res = await CategoryModel.updateOne({ name }, { $set: { imageUrl } });
    if (res.matchedCount > 0) {
      console.log(`🏷️  Categoría: ${name}`);
    } else {
      console.log(`⚠️  No encontrada (categoría): ${name}`);
    }
  }

  console.log(`✅ Listo. ${updated} recetas actualizadas.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});

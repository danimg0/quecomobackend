import "dotenv/config";
import mongoose from "mongoose";
import { RecipeModel } from "../db/recipe.model";
import { CategoryModel } from "../db/category.model";
import imagesConfig from "./recipe-images.json";

// Actualiza las imágenes de recetas y categorías leyendo recipe-images.json.
// Pega la URL de cada foto en ese archivo y ejecuta: npm run update-images
// Las entradas vacías ("") se ignoran (no se tocan), para ir añadiendo poco a poco.
// NO borra usuarios ni favoritos.

const run = async () => {
  const MONGO_URL = process.env.MONGO_URL;
  if (!MONGO_URL) {
    console.error("❌ Falta MONGO_URL en el .env");
    process.exit(1);
  }

  console.log("🔌 Conectando...");
  await mongoose.connect(MONGO_URL);

  let updated = 0;
  let skipped = 0;

  // Recetas
  for (const [title, imageUrl] of Object.entries(imagesConfig.recipes)) {
    if (!imageUrl || !imageUrl.trim()) {
      skipped++;
      continue; // sin URL todavía -> no tocar
    }
    const res = await RecipeModel.updateOne({ title }, { $set: { imageUrl } });
    if (res.matchedCount > 0) {
      updated++;
      console.log(`🖼️  Receta: ${title}`);
    } else {
      console.log(`⚠️  No encontrada (receta): ${title}`);
    }
  }

  // Categorías
  for (const [name, imageUrl] of Object.entries(imagesConfig.categories)) {
    if (!imageUrl || !imageUrl.trim()) {
      skipped++;
      continue;
    }
    const res = await CategoryModel.updateOne({ name }, { $set: { imageUrl } });
    if (res.matchedCount > 0) {
      console.log(`🏷️  Categoría: ${name}`);
    } else {
      console.log(`⚠️  No encontrada (categoría): ${name}`);
    }
  }

  console.log(`✅ Listo. ${updated} actualizadas, ${skipped} sin URL (saltadas).`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});

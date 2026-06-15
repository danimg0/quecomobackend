import "dotenv/config";
import mongoose from "mongoose";
import { RecipeModel } from "../db/recipe.model";
import "../db/ingredient.model"; // registra el schema Ingredient para el populate
import { deriveTags } from "./lib/derive-tags";

// Enriquece TODAS las recetas con etiquetas de dieta/alérgenos y sensoriales,
// derivadas de forma determinista (sin IA) de sus ingredientes, tipo y título.
// Relanzable: recalcula y sobrescribe siempre. Uso: npm run enrich-recipes

const run = async () => {
  await mongoose.connect(process.env.MONGO_URL!);

  const recipes = await RecipeModel.find().populate(
    "ingredients.ingredient",
    "name"
  );
  console.log(`🧬 Recetas a enriquecer: ${recipes.length}\n`);

  let ok = 0;
  for (const r of recipes) {
    const ingredientNames = (r.ingredients as any[])
      .map((it) => it.ingredient?.name)
      .filter(Boolean);

    const tags = deriveTags({
      title: r.title as string,
      mainType: r.mainType as string,
      isVegetarian: r.isVegetarian as boolean,
      ingredientNames,
    });

    await RecipeModel.updateOne({ _id: r._id }, { $set: tags });
    ok++;

    const badges = [
      tags.isVegan ? "vegano" : null,
      tags.containsGluten ? "gluten" : "sin-gluten",
      tags.containsLactose ? "lactosa" : "sin-lactosa",
      tags.lowSugar ? "bajo-azúcar" : null,
      tags.temperature,
      tags.utensil,
      tags.heartiness,
    ]
      .filter(Boolean)
      .join(" · ");
    console.log(`✅ ${(r.title as string).padEnd(34)} ${badges}`);
  }

  console.log(`\n✅ Listo. ${ok}/${recipes.length} enriquecidas.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});

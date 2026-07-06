import mongoose from "mongoose";
import { Recipe } from "types.ts/recipe.type";

const RecipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    // Nº de comensales al que corresponden las cantidades (para escalar raciones)
    servings: { type: Number, default: 4 },
    imageUrl: { type: String, required: true },
    steps: { type: [String], required: true },
    ingredients: [
      {
        ingredient: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient" },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
      },
    ],
    difficulty: {
      type: String,
      enum: ["EASY", "MEDIUM", "HARD"],
      required: true,
    },
    // Tipo principal del plato (para personalizar el feed por gustos).
    // Opcional para no romper recetas antiguas hasta hacer el backfill.
    mainType: {
      type: String,
      enum: [
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
      ],
    },
    // Apto para vegetarianos (sin carne ni pescado).
    isVegetarian: { type: Boolean, default: false },
    // Apto para veganos (vegetariano + sin lácteos, huevo ni miel).
    isVegan: { type: Boolean, default: false },
    // Alérgenos/dieta DERIVADOS de los ingredientes (información orientativa).
    containsGluten: { type: Boolean, default: false },
    containsLactose: { type: Boolean, default: false },
    // Heurística "bajo en azúcar" (no es una afirmación médica para diabéticos).
    lowSugar: { type: Boolean, default: false },
    // Etiquetas sensoriales para el flujo "por antojo".
    temperature: { type: String, enum: ["frio", "caliente"] },
    utensil: { type: String, enum: ["cuchara", "tenedor"] },
    heartiness: { type: String, enum: ["ligero", "contundente"] },
    categories: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
      validate: {
        validator: function (v: any[]) {
          return v && v.length > 0; // devuelvo si existe y es mayor que 0
        },
        message: "A recipe must have at least one category",
      },
    },
  },
  { timestamps: true }
);

export const RecipeModel = mongoose.model<Recipe>("Recipe", RecipeSchema);

//Crear receta
export const createRecipe = (values: Record<string, any>) => {
  const recipe = new RecipeModel(values)
    .save()
    .then((recipe) => recipe.toObject());
  return recipe;
};

//GET Todas las recetas
export const getRecipes = (limit: number = 10, page: number = 0) =>
  //ingredients entra en el array de ingredientes de la receta
  //.ingredient --> dentro de cada objketo del array, busca el campo ingredient y lo rellena
  RecipeModel.find()
    .skip(page * limit) //salta las anteriores
    .limit(limit) // coge solo 10
    .populate("ingredients.ingredient", "_id name owner");

export const getRecipeById = (id: string) =>
  RecipeModel.findById(id).populate("ingredients.ingredient", "_id name owner");

// Escapa los caracteres especiales de regex del texto del usuario (evita
// inyección de patrones/ReDoS al buscar)
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET recetas filtradas
export const getRecipesByFilters = (filters: {
  title?: string;
  minDuration?: number;
  maxDuration?: number;
  difficulty?: string;
}) => {
  const query: any = {};
  // El options hace que sea case insensitive
  if (filters.title)
    query.title = { $regex: escapeRegex(filters.title), $options: "i" };
  if (filters.difficulty) query.difficulty = filters.difficulty;

  // Rango de duración (minutos)
  if (filters.minDuration || filters.maxDuration) {
    query.duration = {};
    if (filters.minDuration) query.duration.$gte = filters.minDuration;
    if (filters.maxDuration) query.duration.$lte = filters.maxDuration;
  }

  return RecipeModel.find(query).populate("ingredients.ingredient");
};

// GET recetas categoria
export const getRecipesByCategory = (
  id: string,
  page: number = 0,
  limit: number = 10
) => {
  return RecipeModel.find({ categories: id })
    .skip(page * limit)
    .limit(limit)
    .populate("ingredients.ingredient", "_id name");
};

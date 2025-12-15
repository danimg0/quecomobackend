import mongoose from "mongoose";
import { Recipe } from "types.ts/recipe.type";

const RecipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
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

// GET recetas filtradas
export const getRecipesByFilters = (
  title?: string,
  duration?: number
  // difficulty?: Difficulty
) => {
  const query: any = {};
  // El options hace que sea case insensitive
  if (title) query.title = { $regex: title, $options: "i" };
  if (duration) query.duration = duration;

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

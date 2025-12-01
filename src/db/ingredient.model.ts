import mongoose from "mongoose";

const IngredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    imageUrl: { type: String },
    // La persona puede añadir sus propios ingredientes
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Si es null, es un ingrediente GLOBAL (del sistema)
    },
  },
  { timestamps: true }
);

export const IngredientModel = mongoose.model("Ingredient", IngredientSchema);

// Obtener todos los ingredientes globales (donde owner es null)
export const getGlobalIngredients = () => IngredientModel.find({ owner: null });
// Crear un ingrediente
export const createIngredient = (values: Record<string, any>) =>
  new IngredientModel(values).save().then((i) => i.toObject());

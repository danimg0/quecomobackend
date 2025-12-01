import mongoose from "mongoose";

export interface Recipe extends Document {
  title: string;
  description: string;
  duration: number;
  imageUrl: string;
  steps: string[];
  ingredients: {
    // Aquí decimos: "Esto va a ser un ID de Mongo"
    ingredient: mongoose.Types.ObjectId;
    quantity: number;
    unit: string;
  }[];
  difficulty: "EASY" | "MEDIUM" | "HARD"; // Tipado literal estricto
  created_at: Date;
  updatedAt: Date; // Mongoose añade esto automáticamente con timestamps: true
}

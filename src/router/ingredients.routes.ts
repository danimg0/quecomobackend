import express from "express";
import {
  createNewIngredient,
  getAllIngredients,
} from "../controllers/ingredients.controller";
// import { isAuthenticated } from "../middlewares"; // Descomentar si quieres protegerlo

export default (router: express.Router) => {
  router.get("/ingredients", getAllIngredients);
  router.post("/ingredients", createNewIngredient);
};

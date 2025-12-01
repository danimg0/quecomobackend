import express from "express";

import {
  getAllRecipes,
  getFilteredRecipes,
  createNewRecipe,
  getRecipesFromCategory,
} from "../controllers/recipes.controller";
import { isAuthenticated, isOwner } from "../middlewares";

export default (router: express.Router) => {
  router.post("/recipe", createNewRecipe);
  router.get("/recipes", getAllRecipes);
  // no hace falta definir los parametros aqui, ya que express los coge solo
  router.get("/recipes/search", getFilteredRecipes);
  router.get("/recipes", getRecipesFromCategory);
};

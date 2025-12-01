import express from "express";
import {
  createRecipe,
  getRecipes,
  getRecipesByCategory,
  getRecipesByFilters,
} from "../db/recipe.model";

export const getAllRecipes = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    console.log("Peticion entrante en getAllRecipes");
    const recipes = await getRecipes();
    console.log("Controlador: Recetas encontradas:", recipes.length);
    return res.status(200).json(recipes).end();
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const createNewRecipe = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const {
      title,
      description,
      duration,
      imageUrl,
      steps,
      ingredients,
      difficulty,
    } = req.body;

    if (!title || !description || !duration || !ingredients) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const recipe = await createRecipe({
      title,
      description,
      duration,
      imageUrl,
      steps,
      ingredients,
      difficulty,
    });

    if (!recipe)
      return res.status(400).json({ message: "Error while creating recipe" });

    return res.status(200).json(recipe);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const getFilteredRecipes = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { title, duration } = req.query;

    const filteredRecipes = await getRecipesByFilters(
      title as string, //Si hago String(title) y title es undefined, mandara "undefined", pero con as string, no.
      duration ? Number(duration) : undefined
    );

    return res.status(200).json(filteredRecipes).end();
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
    // Esto no devuelve nada por si solo
    // return res.status(400);
  }
};

export const getRecipesFromCategory = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id: categoryId } = req.params;

    const recipes = await getRecipesByCategory(categoryId);

    return res.status(200).send(recipes);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

import express from "express";
import {
  createRecipe,
  getRecipeById,
  getRecipes,
  getRecipesByCategory,
  getRecipesByFilters,
} from "../db/recipe.model";

export const getAllRecipes = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const page = Number(req.query.page) || 0;

    const recipes = await getRecipes(limit, page);

    console.log(
      `Petición Pagina: ${page} | Recetas encontradas: ${recipes.length}`
    );

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
    const { title, minDuration, maxDuration, difficulty } = req.query;

    const filteredRecipes = await getRecipesByFilters({
      title: title as string, //Si hago String(title) y title es undefined, mandara "undefined", pero con as string, no.
      minDuration: minDuration ? Number(minDuration) : undefined,
      maxDuration: maxDuration ? Number(maxDuration) : undefined,
      difficulty: difficulty as string,
    });

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
    const limit = Number(req.query.limit) || 5;
    const page = Number(req.query.page) || 0;

    const recipes = await getRecipesByCategory(categoryId, page, limit);

    console.log(recipes);

    return res.status(200).send(recipes);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const getRecipeByIdC = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;

    if (!id) res.status(400).json({ message: "Id missing" });

    const recipe = await getRecipeById(id);

    if (!recipe) res.status(400).json({ message: "Recipe dont founded" });

    return res.status(200).json(recipe);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

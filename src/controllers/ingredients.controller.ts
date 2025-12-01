import express from "express";
import { createIngredient, getGlobalIngredients } from "../db/ingredient.model";

export const createNewIngredient = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { name, imageUrl } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Por defecto, lo creamos sin dueño (Global) para empezar
    const ingredient = await createIngredient({
      name,
      imageUrl,
      owner: null,
    });

    return res.status(200).json(ingredient);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const getAllIngredients = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const ingredients = await getGlobalIngredients();
    return res.status(200).json(ingredients);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

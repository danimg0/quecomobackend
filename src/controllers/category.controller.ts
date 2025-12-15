import { getCategories } from "../db/category.model";
import express from "express";

export const getAllCategories = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const categories = await getCategories();

    if (!categories)
      res.status(400).json({ message: "Categories doesnt exists" });

    return res.status(200).json(categories);
  } catch (error) {
    console.log(error);
  }
};

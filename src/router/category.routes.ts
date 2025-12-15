import { getAllCategories } from "../controllers/category.controller";
import express from "express";

export default (router: express.Router) => {
  router.get("/categories", (req, res) => {
    // #swagger.tags = ['Categorias']
    // #swagger.summary = 'Trae todas las categorias'
    getAllCategories(req, res);
  });
};

import express from "express";
import {
  getAllRecipes,
  getFilteredRecipes,
  createNewRecipe,
  getRecipesFromCategory,
  getRecipeByIdC, // Asegúrate de exportar e importar esto correctamente
} from "../controllers/recipes.controller";

export default (router: express.Router) => {
  // --- CREAR ---
  router.post("/recipes", (req, res) => {
    // #swagger.tags = ['Recetas']
    // #swagger.summary = 'Publicar nueva receta'
    /* #swagger.parameters['body'] = {
        in: 'body',
        description: 'Datos de la receta',
        required: true,
        schema: { $ref: "#/definitions/AddRecipe" }
    } */
    createNewRecipe(req, res);
  });

  // --- OBTENER TODAS ---
  router.get("/recipes", (req, res) => {
    // #swagger.tags = ['Recetas']
    // #swagger.summary = 'Obtener todas las recetas'
    getAllRecipes(req, res);
  });

  // --- FILTRAR (SEARCH) ---
  router.get("/recipes/search", (req, res) => {
    // #swagger.tags = ['Recetas']
    // #swagger.summary = 'Buscador avanzado'
    // #swagger.description = 'Filtra por título (parcial) o duración.'
    /* #swagger.parameters['title'] = { description: 'Texto a buscar', type: 'string' } */
    /* #swagger.parameters['duration'] = { description: 'Duración exacta', type: 'number' } */
    getFilteredRecipes(req, res);
  });

  // --- POR CATEGORÍA (Corregido) ---
  // Cambié la ruta para evitar conflicto con getAllRecipes
  router.get("/recipes/category/:id", (req, res) => {
    getRecipesFromCategory(req, res); // Asegúrate de usar la función correcta aquí
  });
  // #swagger.tags = ['Recetas']
  // #swagger.summary = 'Receta por Id'
  /* #swagger.parameters['id'] = { description: 'Id de la receta', type: 'string' } */
  router.get("/recipe/:id", (req, res) => {
    getRecipeByIdC(req, res);
  });
};

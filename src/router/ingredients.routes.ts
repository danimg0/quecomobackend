import express from "express";
import {
  createNewIngredient,
  getAllIngredients,
} from "../controllers/ingredients.controller";

export default (router: express.Router) => {
  router.get("/ingredients", (req, res) => {
    // #swagger.tags = ['Ingredientes']
    // #swagger.summary = 'Listar todos los ingredientes'
    getAllIngredients(req, res);
  });

  router.post("/ingredients", (req, res) => {
    // #swagger.tags = ['Ingredientes']
    // #swagger.summary = 'Crear un ingrediente nuevo'
    /* #swagger.parameters['body'] = {
        in: 'body',
        required: true,
        schema: { $ref: "#/definitions/AddIngredient" }
    } */
    createNewIngredient(req, res);
  });
};

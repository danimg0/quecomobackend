import express from "express";
import {
  deleteUser,
  getAllUsers,
  getFavoritesRecipes,
  toggleFavoriteRecipe,
  updateUser,
} from "../controllers/users.controller";
import { isAuthenticated, isOwner } from "../middlewares";

export default (router: express.Router) => {
  router.get(
    "/users",
    /* isAuthenticated, */ (req, res) => {
      // #swagger.tags = ['Usuarios']
      // #swagger.summary = 'Listar todos los usuarios'
      getAllUsers(req, res);
    }
  );

  // --- FAVORITOS ---

  router.get("/user/favs", isAuthenticated, (req, res) => {
    // #swagger.tags = ['Usuarios - Favoritos']
    // #swagger.summary = 'Ver mis recetas favoritas'
    // #swagger.description = 'Requiere estar logueado (Cookie).'
    getFavoritesRecipes(req, res);
  });

  router.patch("/user/fav/:recipeId", isAuthenticated, (req, res) => {
    // #swagger.tags = ['Usuarios - Favoritos']
    // #swagger.summary = 'Dar Like/Dislike a una receta'
    // #swagger.description = 'Añade o quita la receta de favoritos.'
    toggleFavoriteRecipe(req, res);
  });
  router.delete(
    `/users/:id`,
    /* isAuthenticated, isOwner, */ (req, res) => {
      // #swagger.tags = ['Usuarios']
      // #swagger.summary = 'Borrar usuario'
      deleteUser(req, res);
    }
  );

  router.patch(
    "/users/:id",
    /* isAuthenticated, isOwner, */ (req, res) => {
      // #swagger.tags = ['Usuarios']
      // #swagger.summary = 'Actualizar datos de usuario'
      /* #swagger.parameters['body'] = {
        in: 'body',
        schema: { $ref: "#/definitions/User" }
    } */
      updateUser(req, res);
    }
  );
};

import express from "express";
import {
  deleteMyAccount,
  deleteUser,
  getAllUsers,
  getFavoritesRecipes,
  toggleFavoriteRecipe,
  updateUser,
} from "../controllers/users.controller";
import { isAuthenticated, isOwner } from "../middlewares";

export default (router: express.Router) => {
  // Borrar la propia cuenta (requiere estar logueado)
  router.delete("/user", isAuthenticated, (req, res) => {
    // #swagger.tags = ['Usuarios']
    // #swagger.summary = 'Eliminar mi cuenta'
    // #swagger.description = 'Borra la cuenta del usuario autenticado.'
    deleteMyAccount(req, res);
  });

  // Listado de usuarios: SOLO autenticados (antes estaba abierto: cualquiera
  // podía listar emails de todos los usuarios)
  router.get("/users", isAuthenticated, (req, res) => {
    // #swagger.tags = ['Usuarios']
    // #swagger.summary = 'Listar todos los usuarios'
    getAllUsers(req, res);
  });

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
  // Borrar/actualizar usuario: solo el PROPIO usuario (antes estaba abierto:
  // cualquiera podía borrar o modificar cualquier cuenta)
  router.delete(`/users/:id`, isAuthenticated, isOwner, (req, res) => {
    // #swagger.tags = ['Usuarios']
    // #swagger.summary = 'Borrar usuario'
    deleteUser(req, res);
  });

  router.patch("/users/:id", isAuthenticated, isOwner, (req, res) => {
    // #swagger.tags = ['Usuarios']
    // #swagger.summary = 'Actualizar datos de usuario'
    /* #swagger.parameters['body'] = {
        in: 'body',
        schema: { $ref: "#/definitions/User" }
    } */
    updateUser(req, res);
  });
};

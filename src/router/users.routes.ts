import express from "express";

import {
  deleteUser,
  getAllUsers,
  getFavoritesRecipes,
  toggleFavoriteRecipe,
  updateUser,
} from "../controllers/users.controller";
import { isAuthenticated, isOwner } from "../middlewares";
import { isInt8Array } from "util/types";

export default (router: express.Router) => {
  router.get("/users", /* isAuthenticated, */ getAllUsers);
  //Importante que el isAuthenticated este delante del isOwner
  router.delete(`/users/:id`, /* isAuthenticated, isOwner, */ deleteUser);
  router.patch("/users/:id", /* isAuthenticated, isOwner, */ updateUser);
  router.get("/user/favs", isAuthenticated, getFavoritesRecipes);
  router.patch("/user/fav/:id", isAuthenticated, toggleFavoriteRecipe);
};

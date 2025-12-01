import express from "express";
import authentication from "./authentications.routes";
import users from "./users.routes";
import recipes from "./recipes.routes";
import ingredient from "./ingredients.routes";

// La libreta de rutas de express
const router = express.Router();

export default (): express.Router => {
  // Se agregan las rutas de autenticación
  authentication(router);
  users(router);
  recipes(router);
  ingredient(router);
  // Se regresan las rutas
  return router;
};

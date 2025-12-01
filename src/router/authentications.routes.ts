import express from "express";

import { login, register } from "../controllers/authentication.controller";

// esto lo llamo en el index.ts para agregar las rutas de autenticación
// recibe la libreta de rutas
export default (router: express.Router) => {
  // Escribe en la libreta la ruta de registro
  router.post("/auth/register", register);
  router.post("/auth/login", login);
};

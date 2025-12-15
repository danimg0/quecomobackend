import express from "express";
import { login, register } from "../controllers/authentication.controller";

export default (router: express.Router) => {
  router.post("/auth/register", (req, res) => {
    // #swagger.tags = ['Autenticación']
    // #swagger.summary = 'Registrar nuevo usuario'
    /* #swagger.parameters['body'] = {
        in: 'body',
        description: 'Datos del registro',
        required: true,
        schema: { $ref: "#/definitions/RegisterUser" }
    } */
    register(req, res);
  });

  router.post("/auth/login", (req, res) => {
    // #swagger.tags = ['Autenticación']
    // #swagger.summary = 'Iniciar sesión'
    /* #swagger.parameters['body'] = {
        in: 'body',
        description: 'Credenciales',
        required: true,
        schema: { $ref: "#/definitions/LoginUser" }
    } */
    login(req, res);
  });
};

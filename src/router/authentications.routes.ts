import express from "express";
import {
  login,
  register,
  verifyEmail,
  resendVerification,
  googleLogin,
} from "../controllers/authentication.controller";

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

  router.post("/auth/google", (req, res) => {
    // #swagger.tags = ['Autenticación']
    // #swagger.summary = 'Login/registro con Google (ID token)'
    googleLogin(req, res);
  });

  router.post("/auth/verify", (req, res) => {
    // #swagger.tags = ['Autenticación']
    // #swagger.summary = 'Verificar correo con código de 6 dígitos'
    verifyEmail(req, res);
  });

  router.post("/auth/resend-verification", (req, res) => {
    // #swagger.tags = ['Autenticación']
    // #swagger.summary = 'Reenviar código de verificación'
    resendVerification(req, res);
  });
};

import express from "express";
import { get, identity, merge } from "lodash";

import { getUserBySessionToken } from "../db/user.model";

export const isOwner = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { id } = req.params;
    // hace un get del req y le cogue el id de la identity (existinguser) que pegamos en el isAuthtenticated
    // el get es una funcion de lodash que busca de forma segura. Es como si hiciesemos req.identity._id, pero si no existe el identity, no explota
    const currentUserId = get(req, "identity._id") as string;

    if (!currentUserId) {
      return res.sendStatus(403);
    }

    // Si el usuario logeado no es el mismo que se esta intentando borrar, error
    if (currentUserId.toString() !== id) {
      return res.sendStatus(403);
    }

    // Si todo guay, next
    next();
  } catch (error) {
    console.log(error);
    return res.status(400);
  }
};

export const isAuthenticated = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    // Leemos el token del header: "Authorization: Bearer <token>"
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    if (!sessionToken) {
      return res.sendStatus(403);
    }

    const existingUser = await getUserBySessionToken(sessionToken);

    if (!existingUser) {
      return res.sendStatus(403);
    }

    //lodash es una libreria de utilidades para manipular datos en javascript
    // con merge cogemos el objeto req y le pegamos la informacion del usuario, bajo una nueva etiqueta llamada identity
    // esto es fundamental, ya que asi cualquier funcion que se ejecute tras el middleware, podra acceder a indentity y saber que usuario esta haciendo la peticion
    // sin tener que consultar de nuevo la bd
    merge(req, { identity: existingUser });

    //La peticion (request) es el producto y va pasando por la cinta
    // Los middleware son los trabajadores en la linea y van haciendo su trabajo
    // El next, es el visto bueno del trabajador y dice que ya termino y que puede seguir. Sin el next, se queda pillado ahi la req
    return next();
  } catch (error) {
    console.log(error);
    return res.status(400);
  }
};

import { createUser, getUserByEmail } from "../db/user.model";
import express from "express";
import { authentication, random } from "../helpers";

// Devuelve un objeto de usuario limpio (sin datos sensibles) para mandarlo al frontend
const toPublicUser = (user: any) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  imageUrl: user.imageUrl ?? null,
  favorites: user.favorites ?? [],
});

export const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await getUserByEmail(email).select(
      "+authentication.salt +authentication.password"
    );

    if (!user) {
      return res.status(400).json({ message: "User not founded" });
    }

    const expectedHash = authentication(user.authentication.salt, password);

    if (expectedHash !== user.authentication.password) {
      return res.status(403).json({ message: "Incorrect password" });
    }

    // Login correcto. Generamos el token de sesión (Bearer token opaco).
    const salt = random();
    user.authentication.sessionToken = authentication(salt, user.id.toString());

    await user.save();

    // En vez de una cookie, devolvemos el token en el body para que el cliente
    // (React Native) lo guarde y lo mande en el header Authorization.
    return res.status(200).json({
      token: user.authentication.sessionToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const register = async (req: express.Request, res: express.Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      // Al usar el json, el front recibe los mensajes con lo que pasa
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userExist = await getUserByEmail(email);
    if (userExist) {
      // el sendStatus cierra la conexion!!
      return res.status(400).json({ message: "User already exists" });
    }

    // Generamos el salt unico para el usuario
    const salt = random();
    // Generamos también el token de sesión para que quede logueado tras registrarse
    const sessionToken = authentication(random(), email);

    const user = await createUser({
      email,
      username,
      authentication: {
        salt,
        //guardamos la mezcla del salt y la contrasena
        password: authentication(salt, password),
        sessionToken,
      },
    });

    return res.status(200).json({
      token: sessionToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

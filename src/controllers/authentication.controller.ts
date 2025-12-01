import { createUser, getUserByEmail } from "../db/user.model";
import express from "express";
import { authentication, random } from "../helpers";

export const login = async (req: express.Request, res: express.Response) => {
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

  //Hasta aqui, el usuario esta log perfe
  //Creamos el sessionToken

  const salt = random();
  user.authentication.sessionToken = authentication(salt, user.id.toString());

  await user.save();

  res.cookie("QUECOMO-AUTH", user.authentication.sessionToken, {
    domain: "localhost",
    path: "/",
  });

  return res.status(200).json(user).end();
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
    const user = await createUser({
      email,
      username,
      authentication: {
        salt,
        //guardamos la mezcla del salt y la contrasena
        password: authentication(salt, password),
      },
    });

    return res.status(200).json(user).end();
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

import express from "express";
import {
  addFavoriteToUser,
  deleteUserById,
  getUserAndFavoritesRecipes,
  getUserById,
  getUsers,
  removeFavoriteFromUser,
} from "../db/user.model";
import { ObjectId } from "mongodb";
import { get } from "lodash";

export const getAllUsers = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const users = await getUsers();

    //todo si no hay usuarios, mandar algo
    return res.status(200).json(users);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const updateUser = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const { userName } = req.body;

    if (!userName) {
      return res.status(400).json({ message: `${userName} not found` });
    }

    const user = await getUserById(id);

    //Update
    user.username = userName;

    await user.save();

    return res.status(200).json({ message: "User changed succesfully" }).end();
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const deleteUser = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params; //Porque params y no body. Params cuando va en la url, body cuando se envia un objeto.

    const deleteUser = await deleteUserById(id);

    if (!deleteUser) {
      return res
        .status(400)
        .json({ message: "Error while deleting user with id " + id });
    }

    return res
      .status(200)
      .json({ message: "User with id " + id + " deleted succesfully" });
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const getFavoritesRecipes = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // Es valido, pero una haria falta el isOwner de middleware para no ver los favoritos de otra persona
    // const { id } = req.params;

    //No hace falta poner nada en la url. El id viene de la cookie
    // Hace falta el middleware isAuthenticated para que lea req.cookies, si no, identity no existe
    const currentUserId = get(req, "identity._id") as string;

    if (!currentUserId) {
      return res.status(400).json({ message: "User Id missing" });
    }
    const userWithFavorites = await getUserAndFavoritesRecipes(currentUserId);

    // 1. PROTECCIÓN CONTRA CRASH: Verificar si el usuario existe
    if (!userWithFavorites) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Devuelves solo el array poblado
    // Usa optional chaining (?.) por seguridad extra si favorites fuera undefined
    return res.status(200).json(userWithFavorites.favorites || []);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const toggleFavoriteRecipe = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const currentUserId = get(req, "identity._id") as string;
    const { id: recipeId } = req.params;

    if (!currentUserId)
      return res.status(400).json({ message: "User Id missing" });
    if (!recipeId)
      return res.status(400).json({ message: "Recipe Id missing" });

    const user = await getUserById(currentUserId);

    if (!user) return res.sendStatus(403);

    // Si existe el id, devuelve true

    // let isFav = false;

    // user.favorites.forEach((recipe) => {
    //   if (recipe._id.toString() === recipeId) {
    //     isFav = true;
    //   }
    // });
    // el some() recorre el array y busca si algun elemento coincide con la condicion
    // el include() no sirve porque no es una lista de id, si no de objetos
    const isFav = user.favorites.some(
      (recipe) => recipeId === recipe._id.toString()
    );

    if (isFav) {
      // Lo quito de favorito
      await removeFavoriteFromUser(currentUserId, recipeId);
      return res.status(200).json({ message: "Removed from favs" });
    } else {
      // Lo guardo en favorito
      await addFavoriteToUser(recipeId, currentUserId);
      return res.status(200).json({ message: "Added to favs" });
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

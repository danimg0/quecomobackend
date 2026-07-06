import mongoose from "mongoose";

// Esto permite que si intentamos guardar un usuario sin algun dato requerido, mongoose fallara.
// Schema es el arquitecto.
const UserSchema = new mongoose.Schema(
  {
    // Datos genericos
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // Verificación de correo: código de 6 dígitos con caducidad
    emailVerified: { type: Boolean, default: false },
    verification: {
      code: { type: String, select: false },
      expiresAt: { type: Date, select: false },
      sentAt: { type: Date, select: false },
      // Intentos fallidos: a los 5, el código se invalida (anti fuerza bruta)
      attempts: { type: Number, select: false, default: 0 },
    },
    // Restablecimiento de contraseña ("olvidé mi contraseña"), mismo esquema
    passwordReset: {
      code: { type: String, select: false },
      expiresAt: { type: Date, select: false },
      sentAt: { type: Date, select: false },
      attempts: { type: Number, select: false, default: 0 },
    },
    // Login con Google: id de la cuenta (estos usuarios no tienen contraseña)
    googleId: { type: String, index: true, sparse: true },
    authentication: {
      //select signifina que no se va a devolver ese dato cuando traemos al usuario
      // password/salt NO requeridos: los usuarios de Google no tienen contraseña
      password: { type: String, select: false },
      salt: { type: String, select: false },
      sessionToken: { type: String, select: false },
    },
    // Array de recetas favoritas del usuario
    favorites: [
      // El array es de objetos directamente. Este type indica que el objeto es un ObjetId de MongoDB, es decir, la clave primaria
      // Ref establece la relacion entre este ObjectId y la coleccion Recipe.
      // Esto es lo que permite usar el .populate()
      { type: mongoose.Schema.Types.ObjectId, ref: "Recipe" },
    ],
  },
  { timestamps: true }
);

// Es la fabrica. Con el plano (Schema) creamos el modelo (Model).
// El model es quien tiene la capacidad de crear, buscar, borrar, etc.
export const UserModel = mongoose.model("User", UserSchema);

//Ahora se definen las acciones.
// TODO Esto va en /src/services/userService.ts
// En vez de escribir la consulta en la BD en cada ruta, se escribe aqui una vez y se llama cuando haga falta.
export const getUsers = () => UserModel.find();
export const getUserByEmail = (email: string) => UserModel.findOne({ email });
export const getUserByGoogleId = (googleId: string) =>
  UserModel.findOne({ googleId });
export const getUserBySessionToken = (sessionToken: string) =>
  UserModel.findOne({ "authentication.sessionToken": sessionToken });
export const getUserById = (id: string) => UserModel.findById(id);
// <values: <Record<string, any>> --> indica que values es un objeto con clave string y valor de cualquier tipo
//TODO Conviene crear la interfaz mas adelante.
// .save guarda en la BD
// .then cuando termine de guardar, y si todo va bien ejecut algo
// .toObject el objeto user de mongoose trae mucha info extra, con toObject se queda solo con los datos.
export const createUser = (values: Record<string, any>) => {
  const user = new UserModel(values).save().then((user) => user.toObject());
  return user;
};
export const deleteUserById = (id: string) => UserModel.findByIdAndDelete(id);
export const getUserAndFavoritesRecipes = (id: string) =>
  UserModel.findById(id).populate({
    path: "favorites",
    populate: { path: "ingredients.ingredient", select: "_id name" },
  });
/**
 * Add recipe to favorites
 * @param recipeId
 * @param userId
 */
export const addFavoriteToUser = (recipeId: string, userId: string) =>
  // Busca por id y actualiza. Primer param el id
  //Segunda param la actualizacion. el $addToSet anade el id SOLO si no esta duplicado
  UserModel.findByIdAndUpdate(userId, {
    $addToSet: { favorites: recipeId },
  });
/**
 * Delete recipe from favorite
 * @param userId
 * @param recipeId
 * @returns
 */
export const removeFavoriteFromUser = (userId: string, recipeId: string) =>
  UserModel.findByIdAndUpdate(userId, {
    $pull: { favorites: recipeId },
  });

import mongoose from "mongoose";
import dotenv from "dotenv";
import { UserModel } from "../db/user.model";
import { RecipeModel } from "../db/recipe.model";
import { IngredientModel } from "../db/ingredient.model";
import { CategoryModel } from "../db/category.model";
import { authentication, random } from "../helpers";

// Cargar variables de entorno para no hardcodear la URL
dotenv.config();

const MONGO_URL =
  "mongodb+srv://daniel:0xiuuNobm5pfbIu9@quecomo.fz29y02.mongodb.net/?appName=quecomo";

if (!MONGO_URL) {
  console.error("❌ Error: No se ha encontrado MONGO_URL en el archivo .env");
  process.exit(1);
}

const seedDatabase = async () => {
  try {
    console.log("🔌 Conectando a la Base de Datos...");
    await mongoose.connect(MONGO_URL);

    console.log("🔥 BORRANDO datos antiguos (Nuke)...");
    await Promise.all([
      UserModel.deleteMany({}),
      RecipeModel.deleteMany({}),
      IngredientModel.deleteMany({}),
      CategoryModel.deleteMany({}),
    ]);

    // 1. CREAR USUARIO ADMIN (EL "Dueño" de las recetas globales)
    console.log("👤 Creando usuario Admin (Chef)...");
    const salt = random();
    const adminUser = await new UserModel({
      username: "ChefDeLaCasa",
      email: "chef@quecomo.com",
      authentication: {
        salt,
        password: authentication(salt, "admin123"),
      },
      avatarUrl: "https://cdn-icons-png.flaticon.com/512/3461/3461980.png",
    }).save();

    // 2. CREAR CATEGORÍAS
    console.log("🏷️ Creando categorías (Almuerzo y Cena)...");
    const catAlmuerzo = await new CategoryModel({
      name: "Almuerzo",
      imageUrl: "https://placehold.co/600x400/orange/white?text=Almuerzo",
    }).save();

    const catCena = await new CategoryModel({
      name: "Cena",
      imageUrl: "https://placehold.co/600x400/darkblue/white?text=Cena",
    }).save();

    // 3. CREAR 30 INGREDIENTES COMUNES
    console.log("🍅 Creando 30 ingredientes de la tienda del pueblo...");

    const ingredientsList = [
      "Aceite de Oliva",
      "Sal",
      "Pimienta",
      "Ajo",
      "Cebolla", // 1-5
      "Tomate",
      "Pimiento Verde",
      "Pimiento Rojo",
      "Zanahoria",
      "Patatas", // 6-10
      "Huevos",
      "Arroz",
      "Lentejas",
      "Garbanzos",
      "Macarrones", // 11-15
      "Pollo",
      "Carne Picada",
      "Chorizo",
      "Jamón Serrano",
      "Atún en lata", // 16-20
      "Lechuga",
      "Limón",
      "Perejil",
      "Pan Rallado",
      "Harina", // 21-25
      "Leche",
      "Queso Rallado",
      "Vino Blanco",
      "Laurel",
      "Pimentón", // 26-30
    ];

    // Mapa para guardar los ingredientes creados y poder usar sus IDs luego
    // Ejemplo: { "Pollo": { _id: "...", name: "Pollo" }, ... }
    const ingDb: Record<string, any> = {};

    for (const name of ingredientsList) {
      const ing = await new IngredientModel({
        name,
        imageUrl: `https://placehold.co/200x200?text=${name.replace(" ", "+")}`,
        owner: null, // Global
      }).save();
      ingDb[name] = ing;
    }

    // 4. CREAR 10 RECETAS CLÁSICAS
    console.log("🍲 Cocinando 10 recetas tradicionales...");

    const recipesData = [
      {
        title: "Lentejas Estofadas",
        description:
          "Como las de la abuela. Un plato de cuchara reconfortante, ideal para coger energía. Hierro puro.",
        duration: 45,
        difficulty: "EASY",
        categories: [catAlmuerzo._id],
        ingredients: [
          { ingredient: ingDb["Lentejas"]._id, quantity: 300, unit: "gr" },
          { ingredient: ingDb["Chorizo"]._id, quantity: 100, unit: "gr" },
          { ingredient: ingDb["Zanahoria"]._id, quantity: 2, unit: "piezas" },
          { ingredient: ingDb["Patatas"]._id, quantity: 1, unit: "pieza" },
          { ingredient: ingDb["Laurel"]._id, quantity: 1, unit: "hoja" },
        ],
        steps: [
          "Poner todo en crudo en la olla.",
          "Cubrir de agua.",
          "Cocinar a fuego lento 45 min.",
        ],
        imageUrl: "https://placehold.co/600x400?text=Lentejas",
      },
      {
        title: "Tortilla de Patatas",
        description:
          "El clásico español. Perfecta para cenar o para llevar. Con cebolla, por supuesto.",
        duration: 30,
        difficulty: "MEDIUM",
        categories: [catCena._id, catAlmuerzo._id],
        ingredients: [
          { ingredient: ingDb["Patatas"]._id, quantity: 4, unit: "piezas" },
          { ingredient: ingDb["Huevos"]._id, quantity: 6, unit: "unidades" },
          { ingredient: ingDb["Cebolla"]._id, quantity: 1, unit: "pieza" },
          {
            ingredient: ingDb["Aceite de Oliva"]._id,
            quantity: 100,
            unit: "ml",
          },
        ],
        steps: [
          "Freír patatas y cebolla.",
          "Batir huevos.",
          "Mezclar y cuajar en sartén.",
        ],
        imageUrl: "https://placehold.co/600x400?text=Tortilla",
      },
      {
        title: "Macarrones con Tomate y Chorizo",
        description:
          "El favorito de los nietos y el salvavidas de los abuelos. Rápido y sabroso.",
        duration: 20,
        difficulty: "EASY",
        categories: [catAlmuerzo._id],
        ingredients: [
          { ingredient: ingDb["Macarrones"]._id, quantity: 400, unit: "gr" },
          { ingredient: ingDb["Tomate"]._id, quantity: 200, unit: "gr" },
          { ingredient: ingDb["Chorizo"]._id, quantity: 50, unit: "gr" },
          { ingredient: ingDb["Queso Rallado"]._id, quantity: 20, unit: "gr" },
        ],
        steps: [
          "Cocer pasta.",
          "Sofreír chorizo.",
          "Añadir tomate.",
          "Mezclar todo.",
        ],
        imageUrl: "https://placehold.co/600x400?text=Macarrones",
      },
      {
        title: "Pechuga de Pollo al Ajillo",
        description:
          "Sencillo, sano y con mucho sabor. Vuelta y vuelta en la sartén.",
        duration: 15,
        difficulty: "EASY",
        categories: [catAlmuerzo._id, catCena._id],
        ingredients: [
          { ingredient: ingDb["Pollo"]._id, quantity: 2, unit: "filetes" },
          { ingredient: ingDb["Ajo"]._id, quantity: 3, unit: "dientes" },
          { ingredient: ingDb["Perejil"]._id, quantity: 1, unit: "pizca" },
          { ingredient: ingDb["Vino Blanco"]._id, quantity: 50, unit: "ml" },
        ],
        steps: ["Dorar ajos.", "Añadir pollo.", "Echar vino y dejar reducir."],
        imageUrl: "https://placehold.co/600x400?text=Pollo+Ajillo",
      },
      {
        title: "Arroz a la Cubana",
        description:
          "Arroz blanco, huevo frito y tomate. La cena que nunca falla y gusta a todos.",
        duration: 25,
        difficulty: "EASY",
        categories: [catAlmuerzo._id],
        ingredients: [
          { ingredient: ingDb["Arroz"]._id, quantity: 200, unit: "gr" },
          { ingredient: ingDb["Huevos"]._id, quantity: 2, unit: "unidades" },
          { ingredient: ingDb["Tomate"]._id, quantity: 100, unit: "gr" },
          { ingredient: ingDb["Ajo"]._id, quantity: 1, unit: "diente" },
        ],
        steps: [
          "Hacer arroz blanco con ajo.",
          "Freír huevo.",
          "Servir con salsa de tomate.",
        ],
        imageUrl: "https://placehold.co/600x400?text=Arroz+Cubana",
      },
      {
        title: "Ensalada Mixta Completa",
        description:
          "Fresca y ligera para cenar sin pesadez. Atún, huevo y verduras.",
        duration: 10,
        difficulty: "EASY",
        categories: [catCena._id],
        ingredients: [
          { ingredient: ingDb["Lechuga"]._id, quantity: 1, unit: "bolsa" },
          { ingredient: ingDb["Tomate"]._id, quantity: 2, unit: "piezas" },
          { ingredient: ingDb["Cebolla"]._id, quantity: 1, unit: "media" },
          { ingredient: ingDb["Atún en lata"]._id, quantity: 1, unit: "lata" },
          { ingredient: ingDb["Huevos"]._id, quantity: 2, unit: "cocidos" },
        ],
        steps: [
          "Lavar verduras.",
          "Cocer huevos.",
          "Mezclar todo en ensaladera.",
          "Aliñar.",
        ],
        imageUrl: "https://placehold.co/600x400?text=Ensalada",
      },
      {
        title: "Garbanzos con Espinacas (Potaje)",
        description:
          "Plato de vigilia o para cualquier martes. Muy nutritivo y económico.",
        duration: 40,
        difficulty: "MEDIUM",
        categories: [catAlmuerzo._id],
        ingredients: [
          { ingredient: ingDb["Garbanzos"]._id, quantity: 400, unit: "gr" },
          { ingredient: ingDb["Ajo"]._id, quantity: 2, unit: "dientes" },
          {
            ingredient: ingDb["Pan Rallado"]._id,
            quantity: 1,
            unit: "cucharada",
          },
          {
            ingredient: ingDb["Pimentón"]._id,
            quantity: 1,
            unit: "cucharadita",
          },
        ],
        steps: [
          "Sofreír ajo y pimentón.",
          "Añadir garbanzos.",
          "Cocinar a fuego lento.",
        ],
        imageUrl: "https://placehold.co/600x400?text=Potaje",
      },
      {
        title: "Revuelto de Huevos con Jamón",
        description:
          "Cena rica en proteínas y lista en 5 minutos. Con pan tostado es manjar.",
        duration: 5,
        difficulty: "EASY",
        categories: [catCena._id],
        ingredients: [
          { ingredient: ingDb["Huevos"]._id, quantity: 3, unit: "unidades" },
          { ingredient: ingDb["Jamón Serrano"]._id, quantity: 50, unit: "gr" },
          {
            ingredient: ingDb["Aceite de Oliva"]._id,
            quantity: 1,
            unit: "chorrito",
          },
        ],
        steps: [
          "Batir huevos ligeramente.",
          "Saltear jamón.",
          "Cuajar huevo sin secarlo.",
        ],
        imageUrl: "https://placehold.co/600x400?text=Revuelto",
      },
      {
        title: "Pastel de Carne y Patata",
        description:
          "Carne picada con puré gratinado. Un plato único muy completo.",
        duration: 50,
        difficulty: "HARD",
        categories: [catAlmuerzo._id],
        ingredients: [
          { ingredient: ingDb["Carne Picada"]._id, quantity: 500, unit: "gr" },
          { ingredient: ingDb["Patatas"]._id, quantity: 4, unit: "piezas" },
          { ingredient: ingDb["Queso Rallado"]._id, quantity: 100, unit: "gr" },
          { ingredient: ingDb["Tomate"]._id, quantity: 100, unit: "gr" },
        ],
        steps: [
          "Hacer puré de patata.",
          "Sofreír carne con tomate.",
          "Montar capas y hornear.",
        ],
        imageUrl: "https://placehold.co/600x400?text=Pastel+Carne",
      },
      {
        title: "Merluza (o Pescado) en Salsa Verde",
        description:
          "Una forma deliciosa de comer pescado. La salsa es para mojar pan.",
        duration: 25,
        difficulty: "MEDIUM",
        categories: [catCena._id],
        ingredients: [
          // Usamos 'Pollo' como placeholder de pescado si no creamos merluza,
          // pero mejor añadamos merluza o usemos uno genérico. Usaremos Atún como "pescado" genérico para el ejemplo
          // O mejor, añadimos "Pescado" a la lista de ingredientes o usamos Atún.
          // Usaremos Atún para no romper el script, pero en la realidad añadirías "Merluza".
          { ingredient: ingDb["Atún en lata"]._id, quantity: 2, unit: "lomos" },
          { ingredient: ingDb["Ajo"]._id, quantity: 2, unit: "dientes" },
          { ingredient: ingDb["Perejil"]._id, quantity: 1, unit: "manojo" },
          { ingredient: ingDb["Vino Blanco"]._id, quantity: 50, unit: "ml" },
        ],
        steps: [
          "Sofreír ajo.",
          "Añadir harina y vino.",
          "Cocinar pescado en la salsa.",
        ],
        imageUrl: "https://placehold.co/600x400?text=Pescado+Salsa",
      },
    ];

    await RecipeModel.insertMany(
      recipesData.map((r) => ({ ...r, author: adminUser._id }))
    );

    console.log("✅ ¡Seed completado! Base de datos lista para gente normal.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error en el seed:", error);
    process.exit(1);
  }
};

seedDatabase();

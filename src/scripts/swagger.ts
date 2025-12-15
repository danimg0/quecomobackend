// src/scripts/swagger.ts
import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "QueComo API",
    description: "API de recetas caseras.",
  },
  host: "localhost:8080",
  schemes: ["http"],
  definitions: {
    User: {
      username: "Dani",
      email: "dani@test.com",
      avatarUrl: "https://...",
    },
    LoginUser: {
      $email: "dani@test.com",
      $password: "secret123",
    },
    RegisterUser: {
      $username: "Dani",
      $email: "dani@test.com",
      $password: "secret123",
    },
    AddIngredient: {
      $name: "Tomate",
      imageUrl: "https://...",
    },
    AddRecipe: {
      $title: "Tortilla de Patatas",
      $description: "La mejor del mundo",
      $duration: 30,
      $imageUrl: "https://...",
      $steps: ["Pelar", "Freír", "Cuajar"],
      $difficulty: "MEDIUM",
      $ingredients: [
        { ingredient: "mongo_id_tomate", quantity: 2, unit: "gr" },
      ],
      $categories: ["mongo_id_categoria"],
    },
  },
};

// Guardamos el output en src para que esté cerca del código
const outputFile = "../../src/swagger-output.json";

// En lugar de apuntar a router/index.ts, apuntamos a TODOS los archivos donde hay rutas reales.
// Las rutas son relativas a la RAÍZ del proyecto (porque ejecutas npm run swagger desde ahí)
const routes = [
  "../router/authentications.routes.ts",
  "../router/users.routes.ts",
  "../router/recipes.routes.ts",
  "../router/ingredients.routes.ts",
];

// Generamos
swaggerAutogen()(outputFile, routes, doc);

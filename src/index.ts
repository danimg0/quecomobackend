import "dotenv/config";
import express from "express";
import http from "http";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import mongoose from "mongoose";
import { rateLimit } from "express-rate-limit";
import router from "./router";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger-output.json";

const app = express();

// Railway pone un proxy delante: necesario para que el rate limit vea la IP real
app.set("trust proxy", 1);

// Middlewares - Se ejecutan antes de que las peticiones lleguen a las rutas.
app.use(cors({ origin: true, credentials: true })); // Permite peticiones externas enviando credenciales (cookies)
app.use(compression()); // Activa la compresión de datos
app.use(cookieParser()); // Activa la lectura de cookies
app.use(bodyParser.json()); // Dice: "Si me llegan datos, asume que son JSON y tradúcelos"

// Rate limiting: frena la fuerza bruta en auth (contraseñas y códigos de
// verificación) y el spam de tokens push. Límite por IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 30, // 30 peticiones de auth por IP y ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados intentos. Espera unos minutos." },
});
app.use("/auth", authLimiter);

const pushLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/push-token", pushLimiter);

const server = http.createServer(app);

const MONGO_URL = process.env.MONGO_URL;
const PORT = Number(process.env.PORT) || 8080;

if (!MONGO_URL) {
  throw new Error("Falta MONGO_URL en el archivo .env");
}

// Mongoose se conecta a la base de datos
// mongoose.Promise = Promise; en mongoose v5 en adelante no es necesario
mongoose.connect(MONGO_URL);
mongoose.connection.on("error", (error: Error) => console.log(error));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/", router());

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

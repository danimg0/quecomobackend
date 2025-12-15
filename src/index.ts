import express from "express";
import http from "http";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import mongoose from "mongoose";
import router from "./router";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger-output.json";

const app = express();

// Middlewares - Se ejecutan antes de que las peticiones lleguen a las rutas.
app.use(cors({ origin: true, credentials: true })); // Permite peticiones externas enviando credenciales (cookies)
app.use(compression()); // Activa la compresión de datos
app.use(cookieParser()); // Activa la lectura de cookies
app.use(bodyParser.json()); // Dice: "Si me llegan datos, asume que son JSON y tradúcelos"

const server = http.createServer(app);

const MONGO_URL =
  "mongodb+srv://daniel:0xiuuNobm5pfbIu9@quecomo.fz29y02.mongodb.net/?appName=quecomo";

// Mongoose se conecta a la base de datos
// mongoose.Promise = Promise; en mongoose v5 en adelante no es necesario
mongoose.connect(MONGO_URL);
mongoose.connection.on("error", (error: Error) => console.log(error));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/", router());

server.listen(8080, () => {
  console.log("Server running on port 8080");
});

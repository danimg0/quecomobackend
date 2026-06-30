# QueComo — Backend (API + generación de recetas)

API en Express + TypeScript y los scripts que generan recetas con IA. Para la
visión global del proyecto, lee `../GUIA.md`.

## Stack
- **Express 5** + **TypeScript**, **MongoDB Atlas** vía **Mongoose**
- **@google/genai** (Vertex AI: Gemini para texto, Imagen 3 para fotos)
- Desplegado en **Railway** (push a `main` → deploy automático)

## Arrancar en local
```bash
npm install
npm run dev          # API en http://localhost:8080 (nodemon)
```
Requiere un `.env` (no versionado) — ver §Variables de entorno.

## Estructura
```
src/
  index.ts            Arranque del servidor
  router/             Rutas: auth, recipes, users, categories, ingredients,
                      legal (/privacy), deeplinks (/r, assetlinks), push
  controllers/        Lógica de cada endpoint
  db/                 Modelos Mongoose (recipe, user, ingredient, category, push-token)
  middlewares/        isAuthenticated (valida el Bearer token)
  helpers/            Auth (hash) y push (envío vía Expo)
  scripts/            Generación y mantenimiento de recetas (ver abajo)
secrets/              Credenciales (gitignored): vertex-key.json
```

## Endpoints principales
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/auth/login`, `/auth/register` | Autenticación (devuelve token Bearer) |
| GET | `/recipes` | Lista de recetas (paginada) |
| GET | `/recipes/search` | Filtro por título / duración / dificultad |
| GET | `/recipe/:id` | Una receta |
| GET | `/user/favs` | Favoritos del usuario (requiere token) |
| PATCH | `/user/fav/:recipeId` | Marca/desmarca favorito |
| POST | `/push-token` | Registra el token push de un dispositivo |
| GET | `/r/:id`, `/.well-known/assetlinks.json` | Deeplinks (App Links) |

## Scripts de recetas
```bash
npm run generate-recipes   # genera recetas nuevas (RECIPES_PER_RUN=N)
npm run regen-steps        # reescribe los pasos de recetas con estilo viejo
npm run tag-recipes        # etiqueta tipo + vegetariano (IA)
npm run enrich-recipes     # deriva dieta/alérgenos/sensorial (determinista, sin IA)
npm run sample-steps       # previsualiza pasos (solo texto, no toca la BD)
npm run reimage-recipes    # regenera fotos que aún sean stock/placeholder
```
El generador usa **Vertex AI**: Gemini (texto) + Imagen 3 (foto) → **ImgBB** (hosting)
→ **MongoDB**. Imagen 3 tiene ~2 imágenes/min, por eso hay esperas entre fotos.

## Variables de entorno (`.env`, no versionar)
```
MONGO_URL=...                              # conexión a Atlas
SECRET=mi_secreto_12345                    # hash de passwords (NO cambiar)
IMGBB_API_KEY=...                          # hosting de fotos
GOOGLE_APPLICATION_CREDENTIALS=./secrets/vertex-key.json   # credencial Vertex
VERTEX_PROJECT_ID=project-0305ea08-3133-414e-b31
```

## Cron (GitHub Actions)
`.github/workflows/generate-recipes.yml` genera 5 recetas los lunes y jueves.
Secrets necesarios en GitHub: `MONGO_URL`, `IMGBB_API_KEY`, `GOOGLE_SA_JSON`
(el contenido entero de `secrets/vertex-key.json`).

## Despliegue
Push a `main` → Railway redespliega solo. Ejecuta `npm run build` (`tsc`) y `npm start`.

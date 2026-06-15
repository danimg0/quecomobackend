// Deriva de forma DETERMINISTA (sin IA) las etiquetas de dieta/alérgenos y
// sensoriales de una receta, a partir de su título, tipo e ingredientes.
//
// Filosofía de seguridad para alérgenos: ante la duda, marcamos que CONTIENE el
// alérgeno (sobre-marcar). Como el filtro "sin X" EXCLUYE lo que contiene X, ese
// sesgo es el seguro: como mucho ocultamos una receta apta, nunca colamos una
// peligrosa. Siempre se acompaña de un aviso "información orientativa".

export type MainType =
  | "carne"
  | "pollo"
  | "pescado"
  | "verdura"
  | "legumbre"
  | "pasta"
  | "arroz"
  | "huevo"
  | "sopa"
  | "postre"
  | "otro";

export interface DerivedTags {
  isVegan: boolean;
  containsGluten: boolean;
  containsLactose: boolean;
  lowSugar: boolean;
  temperature: "frio" | "caliente";
  utensil: "cuchara" | "tenedor";
  heartiness: "ligero" | "contundente";
}

// Normaliza: minúsculas y sin acentos, para comparar palabras clave.
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const GLUTEN = [
  "harina", "pan", "pasta", "macarron", "espagueti", "fideo", "trigo",
  "cebada", "centeno", "cuscus", "semola", "galleta", "bizcocho", "rebozad",
  "empanad", "hojaldre", "cerveza", "seitan", "pan rallado", "tortita", "masa",
];
const LACTOSE = [
  "leche", "queso", "nata", "mantequilla", "yogur", "requeson", "parmesano",
  "mozzarella", "bechamel", "mascarpone", "kefir", "cuajada", "crema de leche",
];
const EGG = ["huevo", "mayonesa", "clara de huevo", "yema"];
const HONEY = ["miel"];
const SUGAR = [
  "azucar", "miel", "chocolate", "mermelada", "sirope", "caramelo", "cacao",
  "leche condensada", "dulce de leche", "turron", "mazapan", "nata montada",
];

const COLD_TITLE = [
  "gazpacho", "salmorejo", "ensalada", "ensaladilla", "ceviche", "vichyssoise",
  "tartar", "carpaccio", "helado", "flan", "natillas", "mousse", "gelatina",
  "melon con jamon",
];
const SPOON_TITLE = [
  "sopa", "crema", "caldo", "potaje", "guiso", "estofado", "cocido", "lenteja",
  "garbanzo", "pure", "gazpacho", "salmorejo", "natillas", "flan",
  "arroz con leche", "gachas", "fabada",
];
const HEAVY_TITLE = [
  "guiso", "estofado", "cocido", "fabada", "callos", "frito", "rebozado",
  "lasaña", "lasagna", "albondigas", "asado",
];

const anyMatch = (haystacks: string[], needles: string[]) =>
  needles.some((n) => haystacks.some((h) => h.includes(n)));

export const deriveTags = (input: {
  title: string;
  mainType?: MainType | string;
  isVegetarian?: boolean;
  ingredientNames: string[];
}): DerivedTags => {
  const title = norm(input.title);
  const ings = input.ingredientNames.map(norm);
  const blob = [title, ...ings];
  const mt = (input.mainType as MainType) || "otro";

  const containsGluten = anyMatch(ings, GLUTEN);
  const containsLactose = anyMatch(ings, LACTOSE);
  const containsEgg = anyMatch(ings, EGG);
  const containsHoney = anyMatch(blob, HONEY);

  const isVegan =
    !!input.isVegetarian && !containsLactose && !containsEgg && !containsHoney;

  const lowSugar = mt !== "postre" && !anyMatch(blob, SUGAR);

  // Temperatura: frío si el título lo delata; si no, caliente.
  const temperature: DerivedTags["temperature"] = anyMatch([title], COLD_TITLE)
    ? "frio"
    : "caliente";

  // Utensilio: cuchara para sopas/legumbres/cremas/guisos caldosos.
  const utensil: DerivedTags["utensil"] =
    mt === "sopa" || mt === "legumbre" || anyMatch([title], SPOON_TITLE)
      ? "cuchara"
      : "tenedor";

  // Contundencia: ligero (verdura/pescado/ensaladas/cremas) vs contundente.
  let heartiness: DerivedTags["heartiness"];
  if (anyMatch([title], HEAVY_TITLE)) {
    heartiness = "contundente";
  } else if (mt === "verdura" || mt === "pescado") {
    heartiness = "ligero";
  } else if (
    mt === "carne" ||
    mt === "legumbre" ||
    mt === "pasta" ||
    mt === "arroz" ||
    mt === "huevo"
  ) {
    heartiness = "contundente";
  } else if (mt === "sopa") {
    // sopa de cuchara densa (legumbres) ya cae arriba; el resto, ligero
    heartiness = "ligero";
  } else {
    heartiness = "ligero";
  }

  return {
    isVegan,
    containsGluten,
    containsLactose,
    lowSugar,
    temperature,
    utensil,
    heartiness,
  };
};

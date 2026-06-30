// Lista curada de platos concretos y variados para generar recetas SIN duplicar.
// El generador elige de aquí los que aún NO están en la BD y crea ese plato
// concreto (en vez de "inventar", que hace que la IA repita los mismos clásicos).
//
// Solo platos SALADOS (sin desayunos ni postres). Mezcla cocina española e
// internacional para dar variedad. El título es el nombre canónico que se guarda.

export const DISHES: string[] = [
  // --- Legumbres ---
  "Fabada Asturiana",
  "Potaje de Garbanzos y Espinacas",
  "Alubias Blancas con Almejas",
  "Judiones de La Granja",
  "Ensalada de Lentejas con Verduras",
  "Hummus de Garbanzos",
  "Cocido Madrileño",
  "Garbanzos con Bacalao y Espinacas",

  // --- Arroces ---
  "Paella Valenciana",
  "Paella de Marisco",
  "Arroz Negro con Calamares",
  "Arroz al Horno",
  "Risotto de Setas",
  "Risotto de Boletus y Parmesano",
  "Arroz Tres Delicias",
  "Arroz Frito con Verduras",
  "Arroz Caldoso de Bogavante",

  // --- Pasta ---
  "Espaguetis a la Carbonara",
  "Espaguetis a la Boloñesa",
  "Lasaña de Carne",
  "Lasaña de Verduras",
  "Macarrones Gratinados",
  "Pasta al Pesto",
  "Tallarines Salteados con Verduras",
  "Ñoquis con Salsa de Tomate",
  "Espaguetis con Gambas y Ajo",
  "Fideuá de Marisco",
  "Canelones de Carne",

  // --- Pollo y pavo ---
  "Pollo al Curry",
  "Pollo Teriyaki",
  "Pollo Agridulce",
  "Pollo Asado al Horno",
  "Pollo en Pepitoria",
  "Alitas de Pollo al Horno",
  "Muslos de Pollo a la Cerveza",
  "Pechuga de Pavo Rellena",
  "Fajitas de Pollo",
  "Curry Verde de Pollo",
  "Pollo a la Naranja",

  // --- Carne ---
  "Albóndigas en Salsa de Tomate",
  "Filete de Ternera a la Plancha",
  "Solomillo al Whisky",
  "Estofado de Ternera con Patatas",
  "Rabo de Toro Estofado",
  "Hamburguesa Casera",
  "Carrilleras de Cerdo al Vino Tinto",
  "Lomo de Cerdo a la Plancha",
  "Costillas de Cerdo al Horno",
  "Chili con Carne",
  "Brochetas de Cerdo Adobado",
  "Escalope de Ternera Empanado",
  "Conejo al Ajillo",
  "Ropa Vieja",
  "Redondo de Ternera Asado",

  // --- Pescado y marisco ---
  "Salmón al Horno con Verduras",
  "Atún a la Plancha con Salsa",
  "Lubina a la Sal",
  "Rape en Salsa de Almendras",
  "Pulpo a la Gallega",
  "Mejillones al Vapor",
  "Almejas a la Marinera",
  "Chipirones en su Tinta",
  "Marmitako de Bonito",
  "Boquerones en Vinagre",
  "Dorada al Horno con Patatas",
  "Bacalao al Pil Pil",
  "Gambas a la Gabardina",
  "Calamares a la Romana",
  "Ceviche de Corvina",
  "Salmón Teriyaki",

  // --- Huevos (como plato principal) ---
  "Huevos Rellenos",
  "Tortilla Paisana",
  "Huevos a la Flamenca",
  "Pisto con Huevo",
  "Shakshuka",

  // --- Verduras ---
  "Berenjenas Rellenas de Carne",
  "Calabacines Rellenos",
  "Menestra de Verduras",
  "Parrillada de Verduras",
  "Escalivada",
  "Coliflor Gratinada",
  "Judías Verdes con Jamón",
  "Espárragos Trigueros a la Plancha",
  "Champiñones al Ajillo",
  "Pimientos del Piquillo Rellenos",
  "Espinacas a la Crema",
  "Ratatouille de Verduras",
  "Brócoli Salteado con Ajo",
  "Acelgas Rehogadas con Ajo",
  "Berenjenas a la Parmesana",

  // --- Sopas, cremas y guisos ---
  "Sopa de Cebolla Gratinada",
  "Crema de Champiñones",
  "Crema de Puerros y Patata",
  "Sopa Minestrone",
  "Crema de Calabaza",
  "Sopa de Fideos con Pollo",
  "Caldo Gallego",
  "Sopa de Tomate Casera",
  "Vichyssoise",
  "Sopa Juliana de Verduras",

  // --- Ensaladas (como plato) ---
  "Ensalada César con Pollo",
  "Ensalada Caprese",
  "Ensalada de Pasta Fría",
  "Ensalada Campera",
  "Ensalada de Quinoa y Verduras",
  "Salpicón de Marisco",
  "Ensaladilla Rusa",
  "Ensalada Griega",

  // --- Internacional / varios ---
  "Tacos de Carne Mexicanos",
  "Quesadillas de Pollo y Queso",
  "Burrito de Ternera",
  "Wok de Ternera con Verduras",
  "Pad Thai de Gambas",
  "Noodles Salteados con Pollo",
  "Pizza Margarita Casera",
  "Croquetas de Jamón",
  "Empanada Gallega de Atún",
  "Rollitos de Primavera",
  "Falafel con Salsa de Yogur",
  "Cuscús con Verduras y Pollo",
  "Tortilla Española con Cebolla",
  "Patatas a la Riojana",
  "Pollo Tikka Masala",
];

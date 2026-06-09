//Herramienta de node
import crypto from "crypto";
//Llave que solo conoce el servidor. Se lee del .env.
// El fallback debe coincidir con el valor original para no invalidar los passwords ya guardados.
const SECRET = process.env.SECRET || "mi_secreto_12345";

// Funcion para crear un salt (cadena unica por usuario) o el session token
export const random = () => {
  // Se crea una cadena aleatoria y convierte esos binarios a texto legible (para poder guardarlo en la bd)
  return crypto.randomBytes(128).toString("base64");
};

/**
 *  Cocinero de passwords. Transforma la password en algo irreconocible antes de guardar.
 * @param salt Cadena unica por usuario
 * @param password Password en texto plano
 * @return Password cocinada
 */
export const authentication = (salt: string, password: string) => {
  return (
    crypto
      // crea un objeto HMAC. Hash-based Message Authentication Code. Licuadora que usa una llave para mezclar
      .createHmac(
        // Algoritmo de mezcla
        "sha256",
        // Llave dinamica
        [salt, password].join("/")
      )
      // Mezcla el secret con el HMAC
      .update(SECRET)
      // Devuelve el resultado en formato hexadecimal
      .digest("hex")
  );
};

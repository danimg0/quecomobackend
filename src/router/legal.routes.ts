import express from "express";

// Fecha de última actualización de la política
const LAST_UPDATED = "9 de junio de 2026";
const CONTACT_EMAIL = "daniel.martos@hotmail.com";

const privacyHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Política de Privacidad — QueComo</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 760px;
           margin: 0 auto; padding: 24px; line-height: 1.6; color: #1f2937; }
    h1 { color: #f97316; }
    h2 { color: #ea580c; margin-top: 28px; }
    a { color: #f97316; }
    .updated { color: #6b7280; font-size: 0.9em; }
    code { background: #f3f4f6; padding: 2px 5px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Política de Privacidad de QueComo</h1>
  <p class="updated">Última actualización: ${LAST_UPDATED}</p>

  <p>Esta política explica qué datos recoge la aplicación <strong>QueComo</strong>,
  con qué fin y cómo los tratamos. Al crear una cuenta, aceptas esta política.</p>

  <h2>1. Responsable del tratamiento</h2>
  <p>QueComo (proyecto personal). Para cualquier consulta sobre tus datos puedes
  escribir a: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

  <h2>2. Uso como invitado</h2>
  <p>Puedes navegar por las recetas y usar el buscador <strong>sin registrarte</strong>.
  En ese caso no recogemos ningún dato personal tuyo.</p>

  <h2>3. Qué datos recogemos (si creas una cuenta)</h2>
  <ul>
    <li><strong>Nombre de usuario</strong></li>
    <li><strong>Correo electrónico</strong></li>
    <li><strong>Contraseña</strong>, que se guarda siempre cifrada (hash); nunca en texto plano</li>
    <li><strong>Recetas favoritas</strong> que marques</li>
    <li>Un <strong>token de sesión</strong> para mantenerte identificado</li>
  </ul>

  <h2>4. Para qué usamos tus datos</h2>
  <ul>
    <li>Crear y gestionar tu cuenta</li>
    <li>Permitirte iniciar sesión y mantener la sesión abierta</li>
    <li>Guardar y mostrarte tus recetas favoritas</li>
  </ul>
  <p>No usamos tus datos para publicidad ni los vendemos a terceros.</p>

  <h2>5. Dónde se almacenan</h2>
  <p>Los datos se guardan en bases de datos de <strong>MongoDB Atlas</strong> y el
  servidor está alojado en <strong>Railway</strong>, proveedores de infraestructura en la nube.
  La comunicación entre la app y el servidor viaja cifrada (HTTPS).</p>

  <h2>6. Con quién se comparten</h2>
  <p>No compartimos ni vendemos tus datos personales a terceros. Únicamente se
  procesan en los proveedores de infraestructura mencionados (MongoDB Atlas, Railway),
  necesarios para que la app funcione.</p>

  <h2>7. Conservación y eliminación de la cuenta</h2>
  <p>Conservamos tus datos mientras mantengas tu cuenta. Puedes solicitar la
  <strong>eliminación de tu cuenta y de todos tus datos</strong> en cualquier momento
  escribiendo a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. Atenderemos la
  solicitud y borraremos tu información en un plazo razonable.</p>

  <h2>8. Tus derechos</h2>
  <p>Tienes derecho a acceder, rectificar o suprimir tus datos. Para ejercerlos,
  contacta en <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

  <h2>9. Menores</h2>
  <p>QueComo no está dirigida a menores de 14 años y no recogemos conscientemente
  datos de menores.</p>

  <h2>10. Cambios en esta política</h2>
  <p>Podemos actualizar esta política. Publicaremos la nueva versión en esta misma
  página con su fecha de actualización.</p>

  <h2>11. Contacto</h2>
  <p>Para cualquier duda sobre privacidad: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
</body>
</html>`;

export default (router: express.Router) => {
  router.get("/privacy", (req, res) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(privacyHtml);
  });
};

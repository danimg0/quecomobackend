import express from "express";

// Deeplinks / Android App Links de QueComo.
//
//  - GET /.well-known/assetlinks.json  -> verifica que la app puede abrir los
//    enlaces https de este dominio (necesario para que Android los abra DIRECTO).
//  - GET /r/:id  -> página puente: si tienes la app, abre la receta; si no, te
//    manda a Google Play.
//
// IMPORTANTE: rellena ANDROID_CERT_SHA256 con la huella SHA-256 del certificado
// de firma. En apps con Play App Signing es la que aparece en:
//   Play Console -> tu app -> Integridad de la app -> Firma de apps
//   -> "Certificado de la clave de firma de apps" (SHA-256).
// Puedes poner varias (p. ej. la de Play + la de subida/EAS).

const ANDROID_PACKAGE = "com.serpdev.quecomo";
const ANDROID_CERT_SHA256: string[] = [
  // Keystore de EAS (builds internos / instalación directa del APK)
  "77:66:EC:3C:08:BB:86:49:3C:E0:F5:69:5F:60:3C:2A:D6:F0:9A:1B:23:CF:5C:51:9E:8C:A0:23:BB:24:41:04",
  // Certificado de firma de apps de Google Play (versión publicada en Play)
  "FA:99:BD:6A:77:55:5E:9F:85:1E:6E:8B:4F:1A:F4:9A:ED:1C:67:0F:64:92:BA:39:83:77:45:92:53:22:CD:22",
];

const PLAY_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

const landingHtml = (id: string) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Abrir receta en QueComo</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px;
           margin: 0 auto; padding: 48px 24px; text-align: center; color: #1f2937; }
    h1 { color: #f97316; }
    a.btn { display: inline-block; margin-top: 16px; background: #f97316; color: #fff;
            text-decoration: none; padding: 14px 22px; border-radius: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <h1>QueComo 🥘</h1>
  <p>Abriendo la receta en la app…</p>
  <p>Si no se abre sola, ¿aún no tienes QueComo?</p>
  <a class="btn" href="${PLAY_URL}">Descargar en Google Play</a>
  <script>
    // Intenta abrir la app por su esquema; si no está instalada no pasa nada.
    window.location.href = "quecomo://recipe/${id}";
  </script>
</body>
</html>`;

export default (router: express.Router) => {
  router.get("/.well-known/assetlinks.json", (req, res) => {
    res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: ANDROID_PACKAGE,
          sha256_cert_fingerprints: ANDROID_CERT_SHA256,
        },
      },
    ]);
  });

  router.get("/r/:id", (req, res) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(landingHtml(req.params.id));
  });
};

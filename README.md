# Bolsillo

App de finanzas personales (PWA) en español: gastos, ingresos, meta de ahorro mensual, reportes semanal/mensual con recomendaciones y recordatorios al celular y correo. Sin servidor, sin costo; los datos viven solo en tu dispositivo.

## Publicar gratis (GitHub Pages)
Settings → Pages → Deploy from a branch → `main` / root.

## Instalar en iPhone
Abre la URL en **Safari** → Compartir → **Añadir a pantalla de inicio**.

## Recordatorios (celular + correo)
1. En la app: Ajustes → Generar mi código.
2. iPhone: instala **ntfy** y suscríbete a ese código.
3. GitHub → Settings → Secrets and variables → Actions: crea `NTFY_TOPIC` (el código) y, opcional, `NOTIFY_EMAIL`.
4. Ajusta las horas (UTC) en `.github/workflows/recordatorios.yml`.

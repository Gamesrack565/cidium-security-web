# Documentación: Automatización Landing Page LFPDPPP - Cidium Security

Este documento explica la arquitectura, configuración y mantenimiento del flujo de automatización (Backend) para la evaluación de leads y el formulario de contacto de la landing page.

## Arquitectura General
1. **Frontend:** Landing page en HTML/JS que envía datos vía `fetch` mediante un Webhook.
2. **Middleware / Automatización:** `n8n` recibe los datos, enruta la petición, calcula el Valor de Prospecto (VP) oculto, guarda en base de datos y envía correos.
3. **Base de Datos:** `Supabase` (PostgreSQL) con RLS (Row Level Security) activado para almacenamiento seguro.

---

## 1. Configuración de n8n (Para Infraestructura)

### Importar el Flujo
1. Abre la instancia de n8n de producción.
2. Ve a **Workflows** > **Add Workflow**.
3. Haz clic en el menú superior derecho `...` y selecciona **Import from File**.
4. Sube el archivo `POR_DEFINIR`.

### Configurar Credenciales
El flujo importado marcará errores en algunos nodos hasta que se configuren las credenciales:
1. **Supabase API:** Entra al nodo de Supabase, crea una nueva credencial usando la URL del proyecto y el **Service Role Secret** (para poder escribir saltando el RLS).
2. **Titán Mail (SMTP):** Entra a los nodos de "Send an Email", crea una credencial SMTP con los siguientes datos:
   * **Host:** `smtp.titan.email` (Puerto: `465`, SSL/TLS: `True`)
   * **User:** `contacto@cidium.com.mx`
   * **Password:** [Contraseña del correo]

### Activar el Webhook de Producción
1. Entra al primer nodo llamado **Webhook**.
2. Cambia la pestaña de "Test URL" a **"Production URL"**.
3. Copia esa URL.
4. En la esquina superior derecha de n8n, activa el flujo (cambia el interruptor a **Active**).

---

## 💻 2. Configuración del Frontend (Para Allan)

En el archivo `cidium-landing-v2.html`, ubica el bloque de configuración al inicio del script y pega la URL de producción que generó n8n en el paso anterior:

```javascript
const CONFIG = {
  endpoint: "PEGA_AQUI_LA_PRODUCTION_URL_DE_N8N",
  fallbackMail: "contacto@cidium.com.mx"
};
```

## 📝 3. ¿Cómo modificar los textos y diseños de los correos?

Si en el futuro el equipo de marketing o ventas desea cambiar el texto de los correos automáticos, se debe hacer directamente en n8n:

1. Entra a n8n y abre el flujo de Cidium.
2. Identifica el nodo de correo que deseas modificar:
   * **"Send an Email" (El primero):** Es el informe que le llega al cliente.
   * **"Send an Email1" (El de arriba):** Es el correo directo del formulario "Hablemos".
   * **"Send an Email2" (El de la alerta):** Es la alerta roja interna de SLA 24h.
3. Haz doble clic en el nodo.
4. En el campo **HTML**, puedes editar libremente el texto.
   > ⚠️ **Precaución:** No modifiques las partes que están entre llaves `{{ }}` (ej. `{{ $json.nombre }}`), ya que son las variables dinámicas que se llenan con los datos del usuario.
5. Al terminar, guarda los cambios haciendo clic en **Save** en la esquina superior derecha del flujo.

---

## 🗄️ 4. Base de Datos (Supabase)

Si se necesita recrear la base de datos en otro entorno, ejecuta el script SQL dadó en el archivo `supabase.sql` en el SQL editor de Supabase. Esto creará la tabla `leads` con las columnas necesarias y activará la RLS.



### Documentación creada por Angel Higuera
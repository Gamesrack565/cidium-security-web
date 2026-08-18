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

## 2. Configuración del Frontend

En el archivo `index.html`, ubica el bloque de configuración al inicio del script y pega la URL de producción que generó n8n en el paso anterior:

```javascript
const CONFIG = {
  endpoint: "PEGA_AQUI_LA_PRODUCTION_URL_DE_N8N",
  fallbackMail: "contacto@cidium.com.mx"
};
```

## 3. ¿Cómo modificar los textos y diseños de los correos?

Si en el futuro el equipo de marketing o ventas desea cambiar el texto de los correos automáticos, se debe hacer directamente en n8n:

Si en el futuro el equipo de marketing o ventas desea cambiar el texto o diseño de los correos automáticos, se debe realizar directamente en la plataforma n8n:

1. Entra a n8n y abre el flujo principal ("My workflow").
2. Identifica el nodo de correo que deseas modificar:
   * **"Correo_cliente":** Es la notificación principal que le llega al prospecto con su informe.
   * **"Correo_contacto":** Es el correo directo para quienes usan el formulario de contacto simple o "Hablemos".
   * **"Correo_alerta_roja":** Es la alerta interna para notificar al equipo de Cidium que existe un lead crítico con banda roja (SLA 24h).
3. Haz doble clic sobre el nodo específico para abrir su panel de configuración.
4. En el parámetro **Message**, verifica que el formato esté configurado para interpretar HTML. Ahí podrás editar o reemplazar libremente el código fuente.
   > ⚠️ **Precaución sobre variables dinámicas:** Al reemplazar el código HTML, es crucial tener precaución de no eliminar ni alterar las expresiones de n8n (variables encerradas entre llaves dobles, por ejemplo: `{{$json["nombre"]}}`). Estas etiquetas son responsables de inyectar la información personalizada del prospecto en el correo.
5. **Repositorio de diseños:** Para consultar o restaurar los diseños originales, los códigos fuente base se encuentran en el repositorio de GitHub: `cidium-security-web/Disenos correos` en la rama `abram-logica-calculo Gamesrack565/cidium-security-web`.
6. Al terminar, aplica las modificaciones haciendo clic en el indicador amarillo de la esquina superior derecha y seleccionando **Publish** / **Save**. Verifica que el indicador retorne a color verde ("Published") para confirmar que los cambios están en producción.
---

## 4. Base de Datos (Supabase)
Todo se encunetra en la base de datos de Supabase, que es un servicio de PostgreSQL con RLS (Row Level Security) activado. Esto significa que los datos están protegidos y solo pueden ser accedidos por el backend (n8n) y no directamente por los usuarios.


## 5. Lógica Comercial: Cálculo del Valor de Prospecto (VP)

Para mantener la seguridad y evitar que la competencia o los usuarios vean cómo Cidium califica a sus prospectos, el cálculo del **Valor de Prospecto (VP)** se realiza de forma oculta en el backend (n8n).

Este proceso ocurre en el primer nodo **Code** (ubicado después del Webhook). 

### ¿Cómo modificar la fórmula de calificación?
Si el equipo decide cambiar el peso que tiene cada respuesta para la calificación final, deben editar el código de ese nodo en las siguientes secciones:

1. **Puntajes base (`tamMap` y `fitMap`):** 
   Puedes cambiar cuántos puntos se le otorgan a una empresa según su tamaño o su nivel de urgencia (banda).
   ```javascript
   const tamMap = {"1-10": 45, "11-50": 100, "51-100": 90, "100+": 65};
   const fitMap = { "verde": 10, "amarillo": 100, "naranja": 90, "rojo": 70 };
   ```

2. **Pesos de la fórmula final (Porcentajes):**
   Si desean que el tamaño de la empresa importe más que los datos sensibles, solo deben ajustar los decimales en la fórmula final. Nota: La suma de los decimales siempre debe dar 1.00 (100%).
   ```javascript
   const vp = Math.round(
   (0.30 * ptTam) +     // 30% asignado al tamaño
   (0.25 * sensScore) + // 25% asignado a los datos sensibles
   (0.30 * ptFit) +     // 30% asignado al fit comercial (banda)
   (0.15 * urgencia)    // 15% asignado al Índice de Exposición
   );
   ```

## 6. Traducción de Respuestas para Correos (Code Node)

Para recibir las alertas rojas con las preguntas y respuestas legibles (en lugar de códigos JSON crudos como `{"tam": "11-50"}`), existe un segundo nodo **Code** (ubicado justo antes del correo de Alerta Roja) que transforma los datos en bloques HTML con diseño.

### Mantenimiento (Importante para Frontend)
Existe una regla de oro para este nodo: **Si el diseño del formulario en la Landing Page cambia, este nodo también debe actualizarse.**

1. **Si se agrega o edita una pregunta en el HTML (`index.html`):**
   Se debe agregar la misma clave y el texto exacto en el diccionario `PREGUNTAS` del nodo.
   ```javascript
   const PREGUNTAS = {
     "tam": "¿Cuántas personas trabajan en tu empresa?",
     // ... agregar nueva pregunta aquí
   };
   ```

2. **Si se agregan nuevas opciones de respuesta:**
   Se deben registrar en el diccionario `TRADUCCIONES` para que n8n sepa cómo convertirlas a texto legible.
   ```javascript
   const TRADUCCIONES = {
     "11-50": "11 a 50",
     "salud": "De salud (Sensible)",
     // ... agregar nueva opción aquí
   };
   ```

3. **Cambiar el color del diseño en el correo:**
   Si se desea cambiar el borde rojo (`#EF4444`) que aparece junto a cada respuesta en el correo de la alerta, deben modificar la variable `listaHtml` al final de este mismo nodo Code.

### Documentación creada por Angel Higuera
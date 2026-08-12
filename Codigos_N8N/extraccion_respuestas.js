/* ==========================================================================
   GENERADOR DE RESPUESTAS PARA CORREO (HTML)
   Este nodo toma las respuestas cortas guardadas en la base de datos (ej. "tam": "11-50")
   y las traduce a preguntas y respuestas legibles en español para inyectarlas en el correo.
   ========================================================================== */

/* 1. DICCIONARIO DE PREGUNTAS
   IMPORTANTE: Si se agregan o cambian preguntas en la página web (HTML), 
   deben actualizarse también en esta lista usando la misma clave (ej. "tam"). */
const PREGUNTAS = {
  "tam": "¿Cuántas personas trabajan en tu empresa?",
  "datos": "¿Qué tipos de datos personales trata tu empresa?",
  "aviso": "¿Tienes aviso de privacidad publicado y actualizado después de marzo de 2025?",
  "resp": "¿Hay una persona o área formalmente designada como responsable de datos personales?",
  "inv": "¿Sabes con precisión dónde viven todos los datos personales que tratas?",
  "canal": "¿Existe un canal formal y publicado para recibir solicitudes ARCO?",
  "plazo": "¿Podrías responder una solicitud ARCO documentada en 20 días hábiles?",
  "mfa": "¿Hay autenticación multifactor en correo y sistemas críticos?",
  "resp_bk": "¿Hacen respaldos y han probado una restauración en los últimos 12 meses?",
  "bajas": "Cuando alguien deja la empresa, ¿se revocan todos sus accesos el mismo día?",
  "acc_fis": "¿El lugar donde se resguardan servidores o expedientes tiene control de acceso?",
  "cctv": "Si tienes videovigilancia, ¿cuenta con su propio aviso de privacidad?",
  "terceros": "¿Tus proveedores que tratan datos tienen cláusula contractual, y existe un plan escrito de respuesta a incidentes?"
};

/* 2. DICCIONARIO DE TRADUCCIONES CORTAS
   Convierte los codigos cortos del formulario en texto legible. 
   Si agregas opciones nuevas en la web, agrégalas aquí. */
const TRADUCCIONES = {
  "ident": "Identificación", 
  "fin": "Patrimoniales o financieros", 
  "lab": "Laborales",
  "salud": "De salud (Sensible)", 
  "biom": "Biométricos (Sensible)", 
  "ideol": "Ideológicos, religiosos, sindicales u orientación sexual (Sensible)",
  "1-10": "1 a 10", 
  "11-50": "11 a 50", 
  "51-100": "51 a 100", 
  "100+": "Más de 100",
  "si": "Sí",
  "no": "No",
  "parc": "Parcial"
};

// 3. RASTREO DE DATOS: Busca el bloque de 'respuestas' revisando en los nodos anteriores.
// Esto asegura que sin importar cómo esté conectado n8n, siempre encuentre los datos.
let rawData = $('Create a row').first().json.respuestas || 
              $('Code in JavaScript').first().json.respuestas || 
              $('Webhook').first().json.body.respuestas || 
              $('Webhook').first().json.respuestas || 
              {};

// 4. PREVENCIÓN DE ERRORES: Si Supabase mandó las respuestas como texto, lo convertimos a JSON
if (typeof rawData === 'string') {
  try {
    rawData = JSON.parse(rawData);
  } catch (e) {
    console.log("Error al parsear JSON:", e);
    rawData = {};
  }
}

// Aquí iremos guardando el código HTML generado
let listaHtml = "";

// 5. TRANSFORMACIÓN A HTML: Recorremos cada respuesta guardada
for (const [clave, valor] of Object.entries(rawData)) {
  // Solo procesa si la clave existe en nuestro diccionario de PREGUNTAS
  if (PREGUNTAS[clave]) {
    let valorTraducido = valor;
    
    // A) Si el usuario eligió múltiples opciones (como los checkboxes de tipos de datos)
    if (Array.isArray(valor)) {
       // Traduce cada elemento y los une con comas
       valorTraducido = valor.map(v => TRADUCCIONES[v] || v).join(", ");
    } else {
       // B) Si el usuario eligió una sola opción (Radio buttons)
       if (TRADUCCIONES[valor]) {
           valorTraducido = TRADUCCIONES[valor];
       } else if (typeof valor === 'string') {
           // Si llega una palabra nueva, al menos le pone mayúscula a la primera letra
           valorTraducido = valor.charAt(0).toUpperCase() + valor.slice(1);
       }
    }

    /* DISEÑO HTML DEL CORREO*/
    listaHtml += `
      <div style="margin-bottom: 12px; padding: 10px; background-color: #F8FAFC; border-left: 3px solid #EF4444; border-radius: 4px;">
        <p style="margin: 0; font-size: 0.85rem; color: #475569; font-weight: bold;">${PREGUNTAS[clave]}</p>
        <p style="margin: 4px 0 0 0; color: #000019; font-size: 0.95rem;">R: <strong>${valorTraducido}</strong></p>
      </div>
    `;
  }
}

// 6. ENTREGA FINAL: Retornamos la variable 'respuestas_html' para que el nodo de correo la use
return [{ 
  json: { 
    respuestas_html: listaHtml,
    debug_rawData: rawData // Se deja con fines de auditoría por si algo falla
  } 
}];
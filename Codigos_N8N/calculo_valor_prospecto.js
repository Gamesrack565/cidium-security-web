/* ==========================================================================
   CALCULO DEL VALOR DE PROSPECTO (VP) SECRETO
   Este nodo recibe los datos del formulario, evalúa comercialmente al lead
   y le asigna una calificación del 0 al 100. Todo ocurre en el servidor 
   para que el usuario no pueda ver esta lógica.
   ========================================================================== */

const items = $input.all();

for (const item of items) {
  // 1. Extraemos los datos dependiendo de cómo los entregue el Webhook
  const payload = item.json.body || item.json;
  
  // 2. Filtro de seguridad: Solo calculamos si el formulario es el diagnóstico
  // (Si es el formulario de "Contacto", lo ignora y pasa de largo)
  if (payload.tipo === "diagnostico_lfpdppp") {
    
    // Variables que llegaron desde la página web
    const R = payload.respuestas;
    const banda = payload.resultado.banda; // Ej: "rojo", "naranja"
    const ie = payload.resultado.ie;       // Ej: 85

    /* --- INICIO DE CONFIGURACIÓN COMERCIAL (EDITABLE) --- */
    
    // A. Valor por Tamaño de Empresa
    const tamMap = {
      "1-10": 45,    // Empresas muy pequeñas valen menos comercialmente
      "11-50": 100,  // Target ideal (Máximo puntaje)
      "51-100": 90,  // Buen target
      "100+": 65     // Empresas muy grandes pueden requerir otro tipo de consultoría
    };
    
    // B. Lista de claves de datos considerados "Sensibles"
    const sensibles = ["salud", "biom", "ideol"];
    
    // C. Valor por Banda de Riesgo (¿Qué tanta urgencia tienen de comprar?)
    const fitMap = { 
      "verde": 10,     // No necesitan ayuda urgente
      "amarillo": 100, // Urgencia media, excelentes para remediación rápida
      "naranja": 90,   // Alta necesidad de servicios
      "rojo": 70       // Urgencia crítica (a veces son ventas rápidas, a veces riesgosas)
    };
    
    /* --- FIN DE CONFIGURACIÓN COMERCIAL --- */

    // 3. Cálculos individuales basados en las tablas de arriba
    const ptTam = tamMap[R.tam] || 50; // Si no hay dato, asigna 50 por defecto
    
    // 4. Calcular score de datos sensibles (Suman puntos extra si manejan datos críticos)
    const tiposSeleccionados = Array.isArray(R.datos) ? R.datos : [];
    const nSens = tiposSeleccionados.filter(v => sensibles.includes(v)).length;
    const nTipos = tiposSeleccionados.length;
    const sensScore = Math.min(100, (nSens * 30) + (nTipos * 10)); // Tope máximo de 100

    // 5. Ajuste comercial y urgencia legal
    const ptFit = fitMap[banda] || 0;
    const urgencia = Math.min(100, ie); // Usamos directamente el IE como urgencia

    // 6. FÓRMULA FINAL (En caso de cambio, verificar que la suma de los pesos sea 100%)
    const vp = Math.round(
      (0.30 * ptTam) +     // 30% de peso al tamaño de la empresa
      (0.25 * sensScore) + // 25% de peso a los datos que manejan
      (0.30 * ptFit) +     // 30% de peso a su banda de riesgo (fit comercial)
      (0.15 * urgencia)    // 15% de peso al Índice de Exposición puro
    );

    // 7. Inyectamos el VP calculado en el resultado para que el siguiente nodo (Supabase) lo guarde
    payload.resultado.vp = vp;
    item.json = payload;
  }
}

return items;
const axios = require('axios');

// ============================================
// CONFIGURACIÓN - Variables del comercio
// ============================================
const URL_PRODUCCION = 'https://www.paq.com.gt/paqpayws/emite.asmx';
const USUARIO = 'PruebaTec'; // Reemplazar con el usuario entregado
const PASSWORD = 'PruebaTec%1%2'; // Reemplazar con el password entregado
const REP_ID = 'CBCAC6'; // Reemplazar con el rep_id entregado

// ============================================
// PARÁMETROS DE LA SOLICITUD
// ============================================
const PARAMETROS = {
  usuario: USUARIO,
  password: PASSWORD,
  rep_id: REP_ID,
  cliente_celular: '50002184', // String 8 - Opcional si se especifica cliente_email
//   cliente_email: 'cliente@example.com', // String 256 - Opcional si se especifica cliente_celular
  monto: 1.00, // Decimal - Requerido
  referencia: `REF-${Date.now()}`, // String 256 - Requerido, ahora es dinámica usando timestamp
  descripcion: 'Prueba de API', // String MAX - Opcional
//   cliente_nombre: 'Juan Pérez', // String 201 - Opcional
  horas_vigencia: 24 // Integer - Requerido
};

// ============================================
// FUNCIÓN PARA CONSTRUIR EL XML SOAP
// ============================================
function construirSOAPRequest(parametros) {
  // Construir los parámetros opcionales solo si existen
  let paramsXml = '';
  paramsXml += `<usuario>${escapeXml(parametros.usuario)}</usuario>`;
  paramsXml += `<password>${escapeXml(parametros.password)}</password>`;
  paramsXml += `<rep_id>${escapeXml(parametros.rep_id)}</rep_id>`;
  
  if (parametros.cliente_celular) {
    paramsXml += `<cliente_celular>${escapeXml(parametros.cliente_celular)}</cliente_celular>`;
  }
  if (parametros.cliente_email) {
    paramsXml += `<cliente_email>${escapeXml(parametros.cliente_email)}</cliente_email>`;
  }
  
  paramsXml += `<monto>${parametros.monto}</monto>`;
  paramsXml += `<referencia>${escapeXml(parametros.referencia)}</referencia>`;
  
  if (parametros.descripcion) {
    paramsXml += `<descripcion>${escapeXml(parametros.descripcion)}</descripcion>`;
  }
  if (parametros.cliente_nombre) {
    paramsXml += `<cliente_nombre>${escapeXml(parametros.cliente_nombre)}</cliente_nombre>`;
  }
  
  paramsXml += `<horas_vigencia>${parametros.horas_vigencia}</horas_vigencia>`;

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <emite_token xmlns="http://www.paq.com.gt/paqpay/emite_token">
      ${paramsXml}
    </emite_token>
  </soap:Body>
</soap:Envelope>`;
  
  return soapBody;
}

// ============================================
// FUNCIÓN PARA ESCAPAR XML
// ============================================
function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) {
    return '';
  }
  return unsafe.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================
// FUNCIÓN PARA PARSEAR LA RESPUESTA SOAP
// ============================================
function parsearRespuestaSOAP(xmlResponse) {
  try {
    // Verificar si hay un error SOAP (Fault)
    const faultMatch = xmlResponse.match(/<soap:Fault[^>]*>(.*?)<\/soap:Fault>/s);
    if (faultMatch) {
      const faultContent = faultMatch[1];
      const faultcodeMatch = faultContent.match(/<faultcode[^>]*>(.*?)<\/faultcode>/);
      const faultstringMatch = faultContent.match(/<faultstring[^>]*>(.*?)<\/faultstring>/);
      
      return {
        error: true,
        faultcode: faultcodeMatch ? faultcodeMatch[1] : null,
        faultstring: faultstringMatch ? faultstringMatch[1] : null,
        codret: null,
        mensaje: faultstringMatch ? faultstringMatch[1] : 'Error SOAP desconocido',
        transaccion: null,
        token: null
      };
    }

    // Extraer el contenido del body SOAP
    const bodyMatch = xmlResponse.match(/<soap:Body[^>]*>(.*?)<\/soap:Body>/s);
    if (!bodyMatch) {
      throw new Error('No se encontró el body SOAP en la respuesta');
    }

    const bodyContent = bodyMatch[1];
    
    // Buscar el resultado dentro de emite_tokenResponse
    // La respuesta viene como: <emite_tokenResponse><emite_tokenResult>string</emite_tokenResult></emite_tokenResponse>
    const responseMatch = bodyContent.match(/<emite_tokenResponse[^>]*>(.*?)<\/emite_tokenResponse>/s);
    
    if (!responseMatch) {
      // Si no hay responseMatch, intentar buscar directamente los campos
      const codretMatch = bodyContent.match(/<codret[^>]*>(\d+)<\/codret>/);
      const mensajeMatch = bodyContent.match(/<mensaje[^>]*>(.*?)<\/mensaje>/);
      const transaccionMatch = bodyContent.match(/<transaccion[^>]*>(\d+)<\/transaccion>/);
      const tokenMatch = bodyContent.match(/<token[^>]*>(.*?)<\/token>/);

      return {
        error: false,
        codret: codretMatch ? parseInt(codretMatch[1]) : null,
        mensaje: mensajeMatch ? mensajeMatch[1] : null,
        transaccion: transaccionMatch ? parseInt(transaccionMatch[1]) : null,
        token: tokenMatch ? tokenMatch[1] : null
      };
    }
    
    // Extraer el contenido de emite_tokenResult
    const resultMatch = responseMatch[1].match(/<emite_tokenResult[^>]*>(.*?)<\/emite_tokenResult>/s);
    
    if (resultMatch) {
      const resultString = resultMatch[1];
      
      // Intentar parsear como JSON primero
      try {
        const jsonResult = JSON.parse(resultString);
        return {
          error: false,
          codret: jsonResult.codret !== undefined ? parseInt(jsonResult.codret) : null,
          mensaje: jsonResult.mensaje || null,
          transaccion: jsonResult.transaccion !== undefined ? parseInt(jsonResult.transaccion) : null,
          token: jsonResult.token || null
        };
      } catch (e) {
        // Si no es JSON, intentar parsear como XML
        const codretMatch = resultString.match(/<codret[^>]*>(\d+)<\/codret>/);
        const mensajeMatch = resultString.match(/<mensaje[^>]*>(.*?)<\/mensaje>/);
        const transaccionMatch = resultString.match(/<transaccion[^>]*>(\d+)<\/transaccion>/);
        const tokenMatch = resultString.match(/<token[^>]*>(.*?)<\/token>/);

        return {
          error: false,
          codret: codretMatch ? parseInt(codretMatch[1]) : null,
          mensaje: mensajeMatch ? mensajeMatch[1] : null,
          transaccion: transaccionMatch ? parseInt(transaccionMatch[1]) : null,
          token: tokenMatch ? tokenMatch[1] : null
        };
      }
    }
    
    // Si no se encuentra emite_tokenResult, buscar directamente los campos en el response
    const codretMatch = responseMatch[1].match(/<codret[^>]*>(\d+)<\/codret>/);
    const mensajeMatch = responseMatch[1].match(/<mensaje[^>]*>(.*?)<\/mensaje>/);
    const transaccionMatch = responseMatch[1].match(/<transaccion[^>]*>(\d+)<\/transaccion>/);
    const tokenMatch = responseMatch[1].match(/<token[^>]*>(.*?)<\/token>/);

    return {
      error: false,
      codret: codretMatch ? parseInt(codretMatch[1]) : null,
      mensaje: mensajeMatch ? mensajeMatch[1] : null,
      transaccion: transaccionMatch ? parseInt(transaccionMatch[1]) : null,
      token: tokenMatch ? tokenMatch[1] : null
    };
  } catch (error) {
    console.error('Error al parsear la respuesta SOAP:', error);
    return null;
  }
}

// ============================================
// FUNCIÓN PRINCIPAL PARA EMITIR TOKEN
// ============================================
async function emiteToken(parametros) {
  try {
    const soapRequest = construirSOAPRequest(parametros);

    console.log('Enviando solicitud a:', URL_PRODUCCION);
    console.log('Parámetros:', {
      usuario: parametros.usuario,
      rep_id: parametros.rep_id,
      monto: parametros.monto,
      referencia: parametros.referencia,
      horas_vigencia: parametros.horas_vigencia
    });

    const response = await axios.post(
      URL_PRODUCCION,
      soapRequest,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '"http://www.paq.com.gt/paqpay/emite_token"'
        },
        timeout: 30000 // 30 segundos
      }
    );

    console.log('\nRespuesta recibida:');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);

    // Parsear la respuesta SOAP
    const resultado = parsearRespuestaSOAP(response.data);

    if (resultado) {
      console.log('\nResultado parseado:');
      console.log(JSON.stringify(resultado, null, 2));

      if (resultado.error) {
        console.log('\n❌ Error SOAP en la respuesta');
        console.log(`Fault Code: ${resultado.faultcode}`);
        console.log(`Fault String: ${resultado.faultstring}`);
      } else if (resultado.codret === 0) {
        console.log('\n✅ Éxito! Token emitido correctamente');
        console.log(`Token: ${resultado.token}`);
        console.log(`Transacción ID: ${resultado.transaccion}`);
      } else {
        console.log('\n❌ Error en la solicitud');
        console.log(`Código: ${resultado.codret}`);
        console.log(`Mensaje: ${resultado.mensaje}`);
      }
    } else {
      console.log('\n⚠️ No se pudo parsear la respuesta');
      console.log('Respuesta XML:', response.data);
    }

    return resultado;

  } catch (error) {
    console.error('\n❌ Error al realizar la solicitud:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
      console.error('Request:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// ============================================
// EJECUTAR EL SCRIPT
// ============================================
if (require.main === module) {
  emiteToken(PARAMETROS)
    .then((resultado) => {
      console.log('\n✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Proceso falló');
      process.exit(1);
    });
}

// Exportar la función para uso como módulo
module.exports = { emiteToken, construirSOAPRequest, parsearRespuestaSOAP };


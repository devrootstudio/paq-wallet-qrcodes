const axios = require('axios');

// ============================================
// CONFIGURACIÓN - Variables del comercio
// ============================================
const URL_PRODUCCION = 'https://www.paq.com.gt/paqgo/paqgo.asmx';
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
  token: '6RWDH', // String 5 - Requerido; Token PAYPAQ generado y enviado al cliente vía SMS
  celular: '50002184' // String 8 - Requerido; Celular del cliente asociado a su PAQWALLET
};

// ============================================
// FUNCIÓN PARA CONSTRUIR EL XML SOAP
// ============================================
function construirSOAPRequest(parametros) {
  const paramsXml = `<usuario>${escapeXml(parametros.usuario)}</usuario>
      <password>${escapeXml(parametros.password)}</password>
      <rep_id>${escapeXml(parametros.rep_id)}</rep_id>
      <token>${escapeXml(parametros.token)}</token>
      <celular>${parametros.celular}</celular>`;

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <PAQgo xmlns="http://tempuri.org/">
      ${paramsXml}
    </PAQgo>
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
        transaccion: null
      };
    }

    // Extraer el contenido del body SOAP
    const bodyMatch = xmlResponse.match(/<soap:Body[^>]*>(.*?)<\/soap:Body>/s);
    if (!bodyMatch) {
      throw new Error('No se encontró el body SOAP en la respuesta');
    }

    const bodyContent = bodyMatch[1];
    
    // Buscar el resultado dentro de PAQgoResponse
    // La respuesta viene como: <PAQgoResponse><PAQgoResult>string</PAQgoResult></PAQgoResponse>
    const responseMatch = bodyContent.match(/<PAQgoResponse[^>]*>(.*?)<\/PAQgoResponse>/s);
    
    if (!responseMatch) {
      // Si no hay responseMatch, intentar buscar directamente los campos
      const codretMatch = bodyContent.match(/<codret[^>]*>(\d+)<\/codret>/);
      const mensajeMatch = bodyContent.match(/<mensaje[^>]*>(.*?)<\/mensaje>/);
      const transaccionMatch = bodyContent.match(/<transaccion[^>]*>(\d+)<\/transaccion>/);

      return {
        error: false,
        codret: codretMatch ? parseInt(codretMatch[1]) : null,
        mensaje: mensajeMatch ? mensajeMatch[1] : null,
        transaccion: transaccionMatch ? parseInt(transaccionMatch[1]) : null
      };
    }
    
    // Extraer el contenido de PAQgoResult
    const resultMatch = responseMatch[1].match(/<PAQgoResult[^>]*>(.*?)<\/PAQgoResult>/s);
    
    if (resultMatch) {
      const resultString = resultMatch[1];
      
      // Intentar parsear como JSON primero
      try {
        const jsonResult = JSON.parse(resultString);
        return {
          error: false,
          codret: jsonResult.codret !== undefined ? parseInt(jsonResult.codret) : null,
          mensaje: jsonResult.mensaje || null,
          transaccion: jsonResult.transaccion !== undefined ? parseInt(jsonResult.transaccion) : null
        };
      } catch (e) {
        // Si no es JSON, intentar parsear como XML
        const codretMatch = resultString.match(/<codret[^>]*>(\d+)<\/codret>/);
        const mensajeMatch = resultString.match(/<mensaje[^>]*>(.*?)<\/mensaje>/);
        const transaccionMatch = resultString.match(/<transaccion[^>]*>(\d+)<\/transaccion>/);

        return {
          error: false,
          codret: codretMatch ? parseInt(codretMatch[1]) : null,
          mensaje: mensajeMatch ? mensajeMatch[1] : null,
          transaccion: transaccionMatch ? parseInt(transaccionMatch[1]) : null
        };
      }
    }
    
    // Si no se encuentra PAQgoResult, buscar directamente los campos en el response
    const codretMatch = responseMatch[1].match(/<codret[^>]*>(\d+)<\/codret>/);
    const mensajeMatch = responseMatch[1].match(/<mensaje[^>]*>(.*?)<\/mensaje>/);
    const transaccionMatch = responseMatch[1].match(/<transaccion[^>]*>(\d+)<\/transaccion>/);

    return {
      error: false,
      codret: codretMatch ? parseInt(codretMatch[1]) : null,
      mensaje: mensajeMatch ? mensajeMatch[1] : null,
      transaccion: transaccionMatch ? parseInt(transaccionMatch[1]) : null
    };
  } catch (error) {
    console.error('Error al parsear la respuesta SOAP:', error);
    return null;
  }
}

// ============================================
// FUNCIÓN PRINCIPAL PARA REALIZAR PAGO
// ============================================
async function realizarPago(parametros) {
  try {
    const soapRequest = construirSOAPRequest(parametros);

    console.log('Enviando solicitud a:', URL_PRODUCCION);
    console.log('Parámetros:', {
      usuario: parametros.usuario,
      rep_id: parametros.rep_id,
      token: parametros.token,
      celular: parametros.celular
    });

    // Mostrar el XML de la solicitud para debugging
    console.log('\n📤 XML de la solicitud:');
    console.log(soapRequest);

    const response = await axios.post(
      URL_PRODUCCION,
      soapRequest,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '"http://tempuri.org/PAQgo"'
        },
        timeout: 30000 // 30 segundos
      }
    );

    console.log('\n📥 Respuesta recibida:');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('\n📄 Respuesta XML completa:');
    console.log(response.data);

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
        console.log('\n✅ Éxito! Pago realizado correctamente');
        console.log(`Transacción ID: ${resultado.transaccion}`);
        console.log(`Mensaje: ${resultado.mensaje}`);
      } else {
        console.log('\n❌ Error en la solicitud');
        console.log(`Código: ${resultado.codret}`);
        console.log(`Mensaje: ${resultado.mensaje}`);
        
        // Mensajes de ayuda según el código de error
        if (resultado.codret === 99) {
          console.log('\n💡 Posibles causas del error 99 (Error de conexión):');
          console.log('   - El token no es válido o ha expirado');
          console.log('   - El celular no coincide con el token');
          console.log('   - Las credenciales (usuario, password, rep_id) son incorrectas');
          console.log('   - Problema de conexión con el servicio de PAQ');
        }
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
  realizarPago(PARAMETROS)
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
module.exports = { realizarPago, construirSOAPRequest, parsearRespuestaSOAP };


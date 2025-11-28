import axios from "axios"
import { parseString } from "xml2js"

// SOAP Web Service configuration
const SOAP_URL = process.env.SOAP_URL || "https://www.paq.com.gt/paqadelaws_desa/PAQAdelantos.asmx"
const USERNAME = process.env.SOAP_USERNAME
const PASSWORD = decodeURIComponent(process.env.SOAP_PASSWORD_URL_ENCODE || "")

// Type interfaces
export interface ClientData {
  id?: string
  status?: string
  identificationNumber?: string
  fullName?: string
  phone?: string
  email?: string
  nit?: string
  startDate?: string
  monthlySalary?: string
  paymentFrequency?: string
  numberOfDispersions?: string
  averageDispersionAmount?: string
  acceptsTerms?: string
  endDate?: string
}

export interface QueryClientResponse {
  returnCode: string | number
  message: string
  client: ClientData | string | null
}

export interface SendTokenResponse {
  returnCode: string | number
  message: string
}

export interface ValidateTokenResponse {
  returnCode: string | number
  message: string
}

export interface ValidateCupoResponse {
  returnCode: string | number
  message: string
  idSolicitud?: string
  celular?: string
  cupoAutorizado?: number
  comisionSobreCupo?: number
  porcComision?: number
  limMaxComBanda1?: number
  comMinBanda1?: number
  limMaxComBanda2?: number
  comMinBanda2?: number
}

export interface ExecuteDisbursementResponse {
  returnCode: string | number
  message: string
}

export interface PAQgoResponse {
  error: boolean
  faultcode?: string | null
  faultstring?: string | null
  codret: number | null
  mensaje: string | null
  transaccion: number | null
}

// Raw SOAP response interface (Spanish format from API)
interface RawSoapResponse {
  codret: string | number
  mensaje: string
  cliente: any
}

// Function to map raw SOAP response to English camelCase format
function mapRawResponseToClientData(rawClient: any): ClientData | null {
  if (!rawClient) return null

  // If it's a string, try to parse it as JSON
  let clientObj: any = rawClient
  if (typeof rawClient === "string") {
    try {
      clientObj = JSON.parse(rawClient)
    } catch (e) {
      return null
    }
  }

  // Map Spanish field names to English camelCase
  return {
    id: clientObj.ID,
    status: clientObj.STATUS,
    identificationNumber: clientObj.NUMERO_IDENTIFICACION,
    fullName: clientObj.NOMBRE_COMPLETO,
    phone: clientObj.CELULAR,
    email: clientObj.EMAIL,
    nit: clientObj.NIT,
    startDate: clientObj.FECHA_ALTA,
    monthlySalary: clientObj.SALARIO_MENSUAL,
    paymentFrequency: clientObj.FRECUENCIA_PAGO,
    numberOfDispersions: clientObj.NUMERO_DISPERSIONES,
    averageDispersionAmount: clientObj.MONTO_PROMEDIO_DISPERSION,
    acceptsTerms: clientObj.ACEPTA_TERMINOS,
    endDate: clientObj.FECHA_BAJA,
  }
}

// Function to map raw SOAP response to QueryClientResponse
function mapRawResponse(rawResponse: RawSoapResponse): QueryClientResponse {
  return {
    returnCode: rawResponse.codret,
    message: rawResponse.mensaje,
    client: mapRawResponseToClientData(rawResponse.cliente),
  }
}

// Function to escape XML characters
function escapeXml(unsafe: string | number | undefined): string {
  if (unsafe === undefined || unsafe === null) {
    return ""
  }
  const safeString = String(unsafe)
  return safeString.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case "&":
        return "&amp;"
      case "'":
        return "&apos;"
      case '"':
        return "&quot;"
      default:
        return c
    }
  })
}

// Function to build SOAP XML envelope for Consulta_Cliente
function buildSoapEnvelope(username: string, password: string, phone: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Consulta_Cliente xmlns="http://www.paq.com.gt/">
      <USERNAME>${escapeXml(username)}</USERNAME>
      <PASSWORD>${escapeXml(password)}</PASSWORD>
      <CELULAR>${escapeXml(phone)}</CELULAR>
    </Consulta_Cliente>
  </soap:Body>
</soap:Envelope>`
}

// Function to build SOAP XML envelope for Envia_Token_TyC
function buildTokenSoapEnvelope(username: string, password: string, phone: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Envia_Token_TyC xmlns="http://www.paq.com.gt/">
      <USERNAME>${escapeXml(username)}</USERNAME>
      <PASSWORD>${escapeXml(password)}</PASSWORD>
      <CELULAR>${escapeXml(phone)}</CELULAR>
    </Envia_Token_TyC>
  </soap:Body>
</soap:Envelope>`
}

// Function to build SOAP XML envelope for Valida_Token_TyC
function buildValidateTokenSoapEnvelope(username: string, password: string, phone: string, token: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Valida_Token_TyC xmlns="http://www.paq.com.gt/">
      <USERNAME>${escapeXml(username)}</USERNAME>
      <PASSWORD>${escapeXml(password)}</PASSWORD>
      <CELULAR>${escapeXml(phone)}</CELULAR>
      <TOKEN>${escapeXml(token)}</TOKEN>
    </Valida_Token_TyC>
  </soap:Body>
</soap:Envelope>`
}

// Function to build SOAP XML envelope for Valida_Cupo
function buildValidateCupoSoapEnvelope(username: string, password: string, phone: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <valida_cupo xmlns="http://www.paq.com.gt/">
      <USERNAME>${escapeXml(username)}</USERNAME>
      <PASSWORD>${escapeXml(password)}</PASSWORD>
      <CELULAR>${escapeXml(phone)}</CELULAR>
    </valida_cupo>
  </soap:Body>
</soap:Envelope>`
}

// Function to parse XML response
function parseXmlResponse(xmlString: string): Promise<any> {
  return new Promise((resolve, reject) => {
    parseString(
      xmlString,
      {
        explicitArray: false,
        mergeAttrs: true,
        trim: true,
        normalize: true,
        normalizeTags: false,
        explicitCharkey: false,
        explicitRoot: true,
        ignoreAttrs: false,
        charkey: "_",
        async: false,
        attrkey: "@",
      },
      (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      },
    )
  })
}

// Helper function to extract value from XML node
function extractValue(node: any): any {
  if (!node) return null
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (node._) return node._
  if (Array.isArray(node) && node.length > 0) {
    return extractValue(node[0])
  }
  return node
}

// Function to extract data from SOAP response
function extractResponseData(parsedXml: any): QueryClientResponse {
  try {
    // Try different possible structures
    const envelope = parsedXml["soap:Envelope"] || parsedXml["soapenv:Envelope"] || parsedXml.Envelope
    const body = envelope?.["soap:Body"] || envelope?.["soapenv:Body"] || envelope?.Body
    const response = body?.Consulta_ClienteResponse || body?.["Consulta_ClienteResponse"]
    const queryResultRaw = response?.Consulta_ClienteResult || response?.["Consulta_ClienteResult"]

    if (!queryResultRaw) {
      // Alternative search in the entire structure
      const searchInObject = (obj: any, key: string): any => {
        if (!obj || typeof obj !== "object") return null
        if (obj[key]) return obj[key]
        for (const objKey in obj) {
          const result = searchInObject(obj[objKey], key)
          if (result) return result
        }
        return null
      }

      const altResult = searchInObject(parsedXml, "Consulta_ClienteResult")
      if (altResult) {
        // If it's a JSON string, parse it
        if (typeof altResult === "string") {
          try {
            const jsonParsed = JSON.parse(altResult)
            return mapRawResponse({
              codret: jsonParsed.codret || "0",
              mensaje: jsonParsed.mensaje || altResult,
              cliente: jsonParsed.cliente || null,
            })
          } catch (e) {
            return mapRawResponse({
              codret: "0",
              mensaje: altResult,
              cliente: null,
            })
          }
        }
        // If it's an object, extract values and map
        return mapRawResponse({
          codret: extractValue(altResult.codret) || "0",
          mensaje: extractValue(altResult.mensaje) || "",
          cliente: extractValue(altResult.cliente),
        })
      }

      throw new Error("Unrecognized response structure")
    }

    // Extract the value (can be JSON string or object)
    const queryResultValue = extractValue(queryResultRaw)

    // If it's a JSON string, parse it
    if (typeof queryResultValue === "string") {
      try {
        const jsonParsed = JSON.parse(queryResultValue)
        return mapRawResponse({
          codret: jsonParsed.codret || "0",
          mensaje: jsonParsed.mensaje || queryResultValue,
          cliente: jsonParsed.cliente || null,
        })
      } catch (e) {
        return mapRawResponse({
          codret: "0",
          mensaje: queryResultValue,
          cliente: null,
        })
      }
    }

    // If it's already an object, map it
    return mapRawResponse({
      codret: queryResultValue.codret || "0",
      mensaje: queryResultValue.mensaje || "",
      cliente: queryResultValue.cliente || null,
    })
  } catch (error) {
    throw new Error(`Error parsing response: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Queries a client in the PAQ system by phone number
 * @param phone - Client phone number (8 digits)
 * @returns Response with client data or error
 */
export async function queryClient(phone: string): Promise<QueryClientResponse> {
  // Validate credentials
  if (!USERNAME || !PASSWORD) {
    throw new Error("SOAP credentials not configured. Check SOAP_USERNAME and SOAP_PASSWORD_URL_ENCODE environment variables")
  }

  // Validate phone
  const cleanPhone = phone.replace(/\s/g, "")
  if (!cleanPhone || cleanPhone.length !== 8) {
    throw new Error("Phone number must have 8 digits")
  }

  try {
    // Build SOAP XML
    const soapBody = buildSoapEnvelope(USERNAME, PASSWORD, cleanPhone)

    // Configure headers to ensure UTF-8
    const headers = {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "http://www.paq.com.gt/Consulta_Cliente",
      Accept: "text/xml; charset=utf-8",
      "Accept-Charset": "utf-8, *;q=0.8",
      "Accept-Language": "es, es-ES;q=0.9, *;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Connection: "keep-alive",
    }

    // Make SOAP request with axios
    const response = await axios.post(SOAP_URL, soapBody, {
      headers,
      responseType: "text",
      responseEncoding: "utf8",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      transformResponse: [
        (data) => {
          // If it comes as Buffer, convert to UTF-8 string
          if (Buffer.isBuffer(data)) {
            return data.toString("utf8")
          }
          return data
        },
      ],
    })

    // Parse XML response
    const parsedXml = await parseXmlResponse(response.data)
    const responseData = extractResponseData(parsedXml)

    return responseData
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`SOAP service connection error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Sends OTP token to client's phone for terms and conditions acceptance
 * @param phone - Client phone number (8 digits)
 * @returns Response with return code and message
 */
export async function sendTokenTyc(phone: string): Promise<SendTokenResponse> {
  // Validate credentials
  if (!USERNAME || !PASSWORD) {
    throw new Error("SOAP credentials not configured. Check SOAP_USERNAME and SOAP_PASSWORD_URL_ENCODE environment variables")
  }

  // Validate phone
  const cleanPhone = phone.replace(/\s/g, "")
  if (!cleanPhone || cleanPhone.length !== 8) {
    throw new Error("Phone number must have 8 digits")
  }

  try {
    // Build SOAP XML
    const soapBody = buildTokenSoapEnvelope(USERNAME, PASSWORD, cleanPhone)

    // Configure headers to ensure UTF-8
    const headers = {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "http://www.paq.com.gt/Envia_Token_TyC",
      Accept: "text/xml; charset=utf-8",
      "Accept-Charset": "utf-8, *;q=0.8",
      "Accept-Language": "es, es-ES;q=0.9, *;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Connection: "keep-alive",
    }

    // Make SOAP request with axios
    const response = await axios.post(SOAP_URL, soapBody, {
      headers,
      responseType: "text",
      responseEncoding: "utf8",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      transformResponse: [
        (data) => {
          // If it comes as Buffer, convert to UTF-8 string
          if (Buffer.isBuffer(data)) {
            return data.toString("utf8")
          }
          return data
        },
      ],
    })

    // Parse XML response
    const parsedXml = await parseXmlResponse(response.data)

    // Extract response data
    const envelope = parsedXml["soap:Envelope"] || parsedXml["soapenv:Envelope"] || parsedXml.Envelope
    const body = envelope?.["soap:Body"] || envelope?.["soapenv:Body"] || envelope?.Body
    const responseNode = body?.Envia_Token_TyCResponse || body?.["Envia_Token_TyCResponse"]
    const resultRaw = responseNode?.Envia_Token_TyCResult || responseNode?.["Envia_Token_TyCResult"]

    if (!resultRaw) {
      throw new Error("Unrecognized response structure for token sending")
    }

    // Extract the value (can be JSON string or object)
    const resultValue = extractValue(resultRaw)

    // If it's a JSON string, parse it
    if (typeof resultValue === "string") {
      try {
        const jsonParsed = JSON.parse(resultValue)
        return {
          returnCode: jsonParsed.codret || "0",
          message: jsonParsed.mensaje || resultValue,
        }
      } catch (e) {
        return {
          returnCode: "0",
          message: resultValue,
        }
      }
    }

    // If it's already an object, map it
    return {
      returnCode: resultValue.codret || "0",
      message: resultValue.mensaje || "",
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`SOAP service connection error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Validates OTP token sent to client's phone for terms and conditions acceptance
 * @param phone - Client phone number (8 digits)
 * @param token - OTP token received by the client
 * @returns Response with return code and message
 */
export async function validateTokenTyc(phone: string, token: string): Promise<ValidateTokenResponse> {
  // Validate credentials
  if (!USERNAME || !PASSWORD) {
    throw new Error("SOAP credentials not configured. Check SOAP_USERNAME and SOAP_PASSWORD_URL_ENCODE environment variables")
  }

  // Validate phone
  const cleanPhone = phone.replace(/\s/g, "")
  if (!cleanPhone || cleanPhone.length !== 8) {
    throw new Error("Phone number must have 8 digits")
  }

  // Validate token
  const cleanToken = token.replace(/\s/g, "")
  if (!cleanToken || cleanToken.length !== 6) {
    throw new Error("Token must have 6 digits")
  }

  try {
    // Build SOAP XML
    const soapBody = buildValidateTokenSoapEnvelope(USERNAME, PASSWORD, cleanPhone, cleanToken)

    // Configure headers to ensure UTF-8
    const headers = {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "http://www.paq.com.gt/Valida_Token_TyC",
      Accept: "text/xml; charset=utf-8",
      "Accept-Charset": "utf-8, *;q=0.8",
      "Accept-Language": "es, es-ES;q=0.9, *;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Connection: "keep-alive",
    }

    // Make SOAP request with axios
    const response = await axios.post(SOAP_URL, soapBody, {
      headers,
      responseType: "text",
      responseEncoding: "utf8",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      transformResponse: [
        (data) => {
          // If it comes as Buffer, convert to UTF-8 string
          if (Buffer.isBuffer(data)) {
            return data.toString("utf8")
          }
          return data
        },
      ],
    })

    // Parse XML response
    const parsedXml = await parseXmlResponse(response.data)

    // Extract response data
    const envelope = parsedXml["soap:Envelope"] || parsedXml["soapenv:Envelope"] || parsedXml.Envelope
    const body = envelope?.["soap:Body"] || envelope?.["soapenv:Body"] || envelope?.Body
    const responseNode = body?.Valida_Token_TyCResponse || body?.["Valida_Token_TyCResponse"]
    const resultRaw = responseNode?.Valida_Token_TyCResult || responseNode?.["Valida_Token_TyCResult"]

    if (!resultRaw) {
      throw new Error("Unrecognized response structure for token validation")
    }

    // Extract the value (can be JSON string or object)
    const resultValue = extractValue(resultRaw)

    // If it's a JSON string, parse it
    if (typeof resultValue === "string") {
      try {
        const jsonParsed = JSON.parse(resultValue)
        return {
          returnCode: jsonParsed.codret || "0",
          message: jsonParsed.mensaje || resultValue,
        }
      } catch (e) {
        return {
          returnCode: "0",
          message: resultValue,
        }
      }
    }

    // If it's already an object, map it
    return {
      returnCode: resultValue.codret || "0",
      message: resultValue.mensaje || "",
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`SOAP service connection error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Validates credit limit (cupo) for salary advance authorization
 * @param phone - Client phone number (8 digits)
 * @returns Response with authorized amount and commission details
 */
export async function validateCupo(phone: string): Promise<ValidateCupoResponse> {
  // Validate credentials
  if (!USERNAME || !PASSWORD) {
    throw new Error("SOAP credentials not configured. Check SOAP_USERNAME and SOAP_PASSWORD_URL_ENCODE environment variables")
  }

  // Validate phone
  const cleanPhone = phone.replace(/\s/g, "")
  if (!cleanPhone || cleanPhone.length !== 8) {
    throw new Error("Phone number must have 8 digits")
  }

  try {
    // Build SOAP XML
    const soapBody = buildValidateCupoSoapEnvelope(USERNAME, PASSWORD, cleanPhone)

    // Configure headers to ensure UTF-8
    const headers = {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "http://www.paq.com.gt/valida_cupo",
      Accept: "text/xml; charset=utf-8",
      "Accept-Charset": "utf-8, *;q=0.8",
      "Accept-Language": "es, es-ES;q=0.9, *;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Connection: "keep-alive",
    }

    // Make SOAP request with axios
    const response = await axios.post(SOAP_URL, soapBody, {
      headers,
      responseType: "text",
      responseEncoding: "utf8",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      transformResponse: [
        (data) => {
          // If it comes as Buffer, convert to UTF-8 string
          if (Buffer.isBuffer(data)) {
            return data.toString("utf8")
          }
          return data
        },
      ],
    })

    // Parse XML response
    const parsedXml = await parseXmlResponse(response.data)

    // Extract response data
    const envelope = parsedXml["soap:Envelope"] || parsedXml["soapenv:Envelope"] || parsedXml.Envelope
    const body = envelope?.["soap:Body"] || envelope?.["soapenv:Body"] || envelope?.Body
    const responseNode = body?.valida_cupoResponse || body?.["valida_cupoResponse"]
    const resultRaw = responseNode?.valida_cupoResult || responseNode?.["valida_cupoResult"]

    if (!resultRaw) {
      throw new Error("Unrecognized response structure for cupo validation")
    }

    // Extract the value (can be JSON string or object)
    const resultValue = extractValue(resultRaw)

    // If it's a JSON string, parse it
    if (typeof resultValue === "string") {
      try {
        const jsonParsed = JSON.parse(resultValue)
        return {
          returnCode: jsonParsed.codret || "0",
          message: jsonParsed.mensaje || resultValue,
          idSolicitud: jsonParsed.id_solicitud,
          celular: jsonParsed.celular,
          cupoAutorizado: jsonParsed.cupo_autorizado ? Number.parseFloat(jsonParsed.cupo_autorizado) : undefined,
          comisionSobreCupo: jsonParsed.comision_sobre_cupo ? Number.parseFloat(jsonParsed.comision_sobre_cupo) : undefined,
          porcComision: jsonParsed.porc_comision ? Number.parseFloat(jsonParsed.porc_comision) : undefined,
          limMaxComBanda1: jsonParsed.limMaxComBanda1 ? Number.parseFloat(jsonParsed.limMaxComBanda1) : undefined,
          comMinBanda1: jsonParsed.comMinBanda1 ? Number.parseFloat(jsonParsed.comMinBanda1) : undefined,
          limMaxComBanda2: jsonParsed.limMaxComBanda2 ? Number.parseFloat(jsonParsed.limMaxComBanda2) : undefined,
          comMinBanda2: jsonParsed.comMinBanda2 ? Number.parseFloat(jsonParsed.comMinBanda2) : undefined,
        }
      } catch (e) {
        return {
          returnCode: "0",
          message: resultValue,
        }
      }
    }

    // If it's already an object, map it
    return {
      returnCode: resultValue.codret || "0",
      message: resultValue.mensaje || "",
      idSolicitud: resultValue.id_solicitud,
      celular: resultValue.celular,
      cupoAutorizado: resultValue.cupo_autorizado ? Number.parseFloat(resultValue.cupo_autorizado) : undefined,
      comisionSobreCupo: resultValue.comision_sobre_cupo ? Number.parseFloat(resultValue.comision_sobre_cupo) : undefined,
      porcComision: resultValue.porc_comision ? Number.parseFloat(resultValue.porc_comision) : undefined,
      limMaxComBanda1: resultValue.limMaxComBanda1 ? Number.parseFloat(resultValue.limMaxComBanda1) : undefined,
      comMinBanda1: resultValue.comMinBanda1 ? Number.parseFloat(resultValue.comMinBanda1) : undefined,
      limMaxComBanda2: resultValue.limMaxComBanda2 ? Number.parseFloat(resultValue.limMaxComBanda2) : undefined,
      comMinBanda2: resultValue.comMinBanda2 ? Number.parseFloat(resultValue.comMinBanda2) : undefined,
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`SOAP service connection error: ${error.message}`)
    }
    throw error
  }
}

// Function to build SOAP XML envelope for Ejecuta_Desembolso
function buildExecuteDisbursementSoapEnvelope(
  username: string,
  password: string,
  phone: string,
  idSolicitud: string,
  monto: number,
  comision: number,
  autorizacion: string,
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Ejecuta_Desembolso xmlns="http://www.paq.com.gt/">
      <USERNAME>${escapeXml(username)}</USERNAME>
      <PASSWORD>${escapeXml(password)}</PASSWORD>
      <CELULAR>${escapeXml(phone)}</CELULAR>
      <ID_SOLICITUD>${escapeXml(String(idSolicitud))}</ID_SOLICITUD>
      <MONTO>${monto}</MONTO>
      <COMISION>${comision}</COMISION>
      <AUTORIZACION>${escapeXml(autorizacion)}</AUTORIZACION>
    </Ejecuta_Desembolso>
  </soap:Body>
</soap:Envelope>`
}

/**
 * Executes disbursement of salary advance
 * @param phone - Client phone number (8 digits)
 * @param idSolicitud - Request ID from cupo validation
 * @param monto - Amount requested by user
 * @param comision - Commission calculated (monto - disbursementAmount)
 * @param autorizacion - Authorization number generated by PAQWallet
 * @returns Response indicating success or failure
 */
export async function executeDisbursement(
  phone: string,
  idSolicitud: string,
  monto: number,
  comision: number,
  autorizacion: string,
): Promise<ExecuteDisbursementResponse> {
  // Validate credentials
  if (!USERNAME || !PASSWORD) {
    throw new Error("SOAP credentials not configured. Check SOAP_USERNAME and SOAP_PASSWORD_URL_ENCODE environment variables")
  }

  // Validate phone
  const cleanPhone = phone.replace(/\s/g, "")
  if (!cleanPhone || cleanPhone.length !== 8) {
    throw new Error("Phone number must have 8 digits")
  }

  // Validate parameters
  if (!idSolicitud) {
    throw new Error("ID_SOLICITUD is required")
  }
  if (!monto || monto <= 0) {
    throw new Error("MONTO must be greater than 0")
  }
  if (comision < 0) {
    throw new Error("COMISION must be greater than or equal to 0")
  }
  if (!autorizacion) {
    throw new Error("AUTORIZACION is required")
  }

  try {
    // Build SOAP XML
    const soapBody = buildExecuteDisbursementSoapEnvelope(USERNAME, PASSWORD, cleanPhone, idSolicitud, monto, comision, autorizacion)

    // Configure headers to ensure UTF-8
    const headers = {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "http://www.paq.com.gt/Ejecuta_Desembolso",
      Accept: "text/xml; charset=utf-8",
      "Accept-Charset": "utf-8, *;q=0.8",
      "Accept-Language": "es, es-ES;q=0.9, *;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Connection: "keep-alive",
    }

    // Make SOAP request with axios
    const response = await axios.post(SOAP_URL, soapBody, {
      headers,
      responseType: "text",
      responseEncoding: "utf8",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      transformResponse: [
        (data) => {
          // If it comes as Buffer, convert to UTF-8 string
          if (Buffer.isBuffer(data)) {
            return data.toString("utf8")
          }
          return data
        },
      ],
    })

    // Parse XML response
    const parsedXml = await parseXmlResponse(response.data)

    // Extract response data
    const envelope = parsedXml["soap:Envelope"] || parsedXml["soapenv:Envelope"] || parsedXml.Envelope
    const body = envelope?.["soap:Body"] || envelope?.["soapenv:Body"] || envelope?.Body
    const responseNode = body?.Ejecuta_DesembolsoResponse || body?.["Ejecuta_DesembolsoResponse"]
    const resultRaw = responseNode?.Ejecuta_DesembolsoResult || responseNode?.["Ejecuta_DesembolsoResult"]

    if (!resultRaw) {
      throw new Error("Unrecognized response structure for disbursement execution")
    }

    // Extract the value (can be JSON string or object)
    const resultValue = extractValue(resultRaw)

    // If it's a JSON string, parse it
    if (typeof resultValue === "string") {
      try {
        const jsonParsed = JSON.parse(resultValue)
        return {
          returnCode: jsonParsed.codret || "0",
          message: jsonParsed.mensaje || resultValue,
        }
      } catch (e) {
        return {
          returnCode: "0",
          message: resultValue,
        }
      }
    }

    // If it's already an object, map it
    return {
      returnCode: resultValue.codret || "0",
      message: resultValue.mensaje || "",
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`SOAP service connection error: ${error.message}`)
    }
    throw error
  }
}


// ============================================
// EMITE_TOKEN - Payment Token Generation
// ============================================

// SOAP Web Service configuration for emite_token
const PAQPAY_SOAP_URL = process.env.PAQPAY_SOAP_URL || "https://www.paq.com.gt/paqpayws/emite.asmx"

export interface EmiteTokenResponse {
  codret: number
  mensaje: string
  transaccion: number | null
  token: string | null
  error?: boolean
  faultcode?: string | null
  faultstring?: string | null
}

// Function to build SOAP XML envelope for emite_token
function buildEmiteTokenSoapEnvelope(
  usuario: string,
  password: string,
  rep_id: string,
  cliente_celular: string,
  monto: number,
  referencia: string,
  horas_vigencia: number,
  descripcion?: string,
  cliente_email?: string,
  cliente_nombre?: string,
): string {
  // According to SOAP documentation, all fields must be strings
  // Format monto as string with 2 decimal places
  const montoString = typeof monto === 'number' ? monto.toFixed(2) : String(monto)
  const horasVigenciaString = String(horas_vigencia)

  // Truncate fields to their maximum lengths to prevent truncation errors
  // Based on API specifications from emite_token.js comments
  const usuarioTruncated = usuario.substring(0, 100)
  const passwordTruncated = password.substring(0, 100)
  const repIdTruncated = rep_id.substring(0, 50)
  const clienteCelularTruncated = cliente_celular ? cliente_celular.substring(0, 8) : ""
  const clienteEmailTruncated = cliente_email ? cliente_email.substring(0, 256) : ""
  const referenciaTruncated = referencia.substring(0, 256)
  const descripcionTruncated = descripcion ? descripcion.substring(0, 500) : ""
  const clienteNombreTruncated = cliente_nombre ? cliente_nombre.substring(0, 201) : ""

  let paramsXml = ""
  paramsXml += `<usuario>${escapeXml(usuarioTruncated)}</usuario>`
  paramsXml += `<password>${escapeXml(passwordTruncated)}</password>`
  paramsXml += `<rep_id>${escapeXml(repIdTruncated)}</rep_id>`

  if (clienteCelularTruncated) {
    paramsXml += `<cliente_celular>${escapeXml(clienteCelularTruncated)}</cliente_celular>`
  }
  if (clienteEmailTruncated) {
    paramsXml += `<cliente_email>${escapeXml(clienteEmailTruncated)}</cliente_email>`
  }

  // monto must be a string according to SOAP documentation
  paramsXml += `<monto>${escapeXml(montoString)}</monto>`
  paramsXml += `<referencia>${escapeXml(referenciaTruncated)}</referencia>`

  if (descripcionTruncated) {
    paramsXml += `<descripcion>${escapeXml(descripcionTruncated)}</descripcion>`
  }
  if (clienteNombreTruncated) {
    paramsXml += `<cliente_nombre>${escapeXml(clienteNombreTruncated)}</cliente_nombre>`
  }

  // horas_vigencia must be a string according to SOAP documentation
  paramsXml += `<horas_vigencia>${escapeXml(horasVigenciaString)}</horas_vigencia>`

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <emite_token xmlns="http://www.paq.com.gt/paqpay/emite_token">
      ${paramsXml}
    </emite_token>
  </soap:Body>
</soap:Envelope>`
}

// Function to parse SOAP response for emite_token
function parseEmiteTokenResponse(xmlResponse: string): EmiteTokenResponse {
  try {
    // Check for SOAP Fault
    const faultMatch = xmlResponse.match(/<soap:Fault[^>]*>([\s\S]*?)<\/soap:Fault>/)
    if (faultMatch) {
      const faultContent = faultMatch[1]
      const faultcodeMatch = faultContent.match(/<faultcode[^>]*>(.*?)<\/faultcode>/)
      const faultstringMatch = faultContent.match(/<faultstring[^>]*>(.*?)<\/faultstring>/)

      return {
        error: true,
        faultcode: faultcodeMatch ? faultcodeMatch[1] : null,
        faultstring: faultstringMatch ? faultstringMatch[1] : null,
        codret: -1,
        mensaje: faultstringMatch ? faultstringMatch[1] : "Error SOAP desconocido",
        transaccion: null,
        token: null,
      }
    }

    // Extract SOAP body content
    const bodyMatch = xmlResponse.match(/<soap:Body[^>]*>([\s\S]*?)<\/soap:Body>/)
    if (!bodyMatch) {
      throw new Error("No se encontró el body SOAP en la respuesta")
    }

    const bodyContent = bodyMatch[1]

    // Search for emite_tokenResponse
    const responseMatch = bodyContent.match(/<emite_tokenResponse[^>]*>([\s\S]*?)<\/emite_tokenResponse>/)

    if (!responseMatch) {
      // Try to find fields directly
      const codretMatch = bodyContent.match(/<codret[^>]*>(\d+)<\/codret>/)
      const mensajeMatch = bodyContent.match(/<mensaje[^>]*>(.*?)<\/mensaje>/)
      const transaccionMatch = bodyContent.match(/<transaccion[^>]*>(\d+)<\/transaccion>/)
      const tokenMatch = bodyContent.match(/<token[^>]*>(.*?)<\/token>/)

      return {
        error: false,
        codret: codretMatch ? Number.parseInt(codretMatch[1], 10) : -1,
        mensaje: mensajeMatch ? mensajeMatch[1] : "",
        transaccion: transaccionMatch ? Number.parseInt(transaccionMatch[1], 10) : null,
        token: tokenMatch ? tokenMatch[1] : null,
      }
    }

    // Extract emite_tokenResult content
    const resultMatch = responseMatch[1].match(/<emite_tokenResult[^>]*>([\s\S]*?)<\/emite_tokenResult>/)

    if (resultMatch) {
      const resultString = resultMatch[1]

      // Try to parse as JSON first
      try {
        const jsonResult = JSON.parse(resultString)
        return {
          error: false,
          codret: jsonResult.codret !== undefined ? Number.parseInt(String(jsonResult.codret), 10) : -1,
          mensaje: jsonResult.mensaje || "",
          transaccion: jsonResult.transaccion !== undefined ? Number.parseInt(String(jsonResult.transaccion), 10) : null,
          token: jsonResult.token || null,
        }
      } catch (e) {
        // If not JSON, parse as XML
        const codretMatch = resultString.match(/<codret[^>]*>(\d+)<\/codret>/)
        const mensajeMatch = resultString.match(/<mensaje[^>]*>(.*?)<\/mensaje>/)
        const transaccionMatch = resultString.match(/<transaccion[^>]*>(\d+)<\/transaccion>/)
        const tokenMatch = resultString.match(/<token[^>]*>(.*?)<\/token>/)

        return {
          error: false,
          codret: codretMatch ? Number.parseInt(codretMatch[1], 10) : -1,
          mensaje: mensajeMatch ? mensajeMatch[1] : "",
          transaccion: transaccionMatch ? Number.parseInt(transaccionMatch[1], 10) : null,
          token: tokenMatch ? tokenMatch[1] : null,
        }
      }
    }

    // If emite_tokenResult not found, search directly in response
    const codretMatch = responseMatch[1].match(/<codret[^>]*>(\d+)<\/codret>/)
    const mensajeMatch = responseMatch[1].match(/<mensaje[^>]*>(.*?)<\/mensaje>/)
    const transaccionMatch = responseMatch[1].match(/<transaccion[^>]*>(\d+)<\/transaccion>/)
    const tokenMatch = responseMatch[1].match(/<token[^>]*>(.*?)<\/token>/)

    return {
      error: false,
      codret: codretMatch ? Number.parseInt(codretMatch[1], 10) : -1,
      mensaje: mensajeMatch ? mensajeMatch[1] : "",
      transaccion: transaccionMatch ? Number.parseInt(transaccionMatch[1], 10) : null,
      token: tokenMatch ? tokenMatch[1] : null,
    }
  } catch (error) {
    console.error("Error al parsear la respuesta SOAP:", error)
    return {
      error: true,
      codret: -1,
      mensaje: error instanceof Error ? error.message : "Error desconocido al parsear respuesta",
      transaccion: null,
      token: null,
    }
  }
}

/**
 * Emits a payment token for QR code payment
 * @param usuario - Merchant username
 * @param password - Merchant password
 * @param rep_id - Merchant rep_id
 * @param cliente_celular - Client phone number (8 digits)
 * @param monto - Payment amount
 * @param referencia - Payment reference
 * @param horas_vigencia - Token validity hours (default: 24)
 * @param descripcion - Optional description
 * @param cliente_email - Optional client email
 * @param cliente_nombre - Optional client name
 * @returns Response with token and transaction ID
 */
export async function emiteToken(
  usuario: string,
  password: string,
  rep_id: string,
  cliente_celular: string,
  monto: number,
  referencia: string,
  horas_vigencia: number = 24,
  descripcion?: string,
  cliente_email: string = 'kike@devroot.studio',
  cliente_nombre: string = 'Dev Root Studio',
): Promise<EmiteTokenResponse> {
  // Validate parameters
  if (!usuario || !password || !rep_id) {
    throw new Error("Merchant credentials are required")
  }

  const cleanPhone = cliente_celular.replace(/\s/g, "")
  if (!cleanPhone || cleanPhone.length !== 8) {
    throw new Error("Phone number must have 8 digits")
  }

  if (!monto || monto <= 0) {
    throw new Error("Amount must be greater than 0")
  }

  if (!referencia) {
    throw new Error("Reference is required")
  }

  // Validate field lengths according to API specifications
  // cliente_celular: String 8
  if (cleanPhone.length > 8) {
    throw new Error("Phone number must be exactly 8 digits")
  }

  // referencia: String 256
  if (referencia.length > 256) {
    throw new Error("Reference must be 256 characters or less")
  }

  // cliente_email: String 256 (optional)
  if (cliente_email && cliente_email.length > 256) {
    throw new Error("Email must be 256 characters or less")
  }

  // cliente_nombre: String 201 (optional)
  if (cliente_nombre && cliente_nombre.length > 201) {
    throw new Error("Client name must be 201 characters or less")
  }

  // descripcion: String MAX (optional, but we'll limit to reasonable size)
  if (descripcion && descripcion.length > 500) {
    throw new Error("Description must be 500 characters or less")
  }

  try {
    // Log all input parameters before processing
    console.log("=".repeat(80))
    console.log("📤 EMITE_TOKEN - Building SOAP Request")
    console.log("=".repeat(80))
    console.log("Input Parameters (before truncation):")
    console.log(`  usuario: "${usuario}" (length: ${usuario.length})`)
    console.log(`  password: "${password}" (length: ${password.length})`)
    console.log(`  rep_id: "${rep_id}" (length: ${rep_id.length})`)
    console.log(`  cliente_celular: "${cleanPhone}" (length: ${cleanPhone.length})`)
    console.log(`  monto: ${monto} (will be formatted as string)`)
    console.log(`  referencia: "${referencia}" (length: ${referencia.length})`)
    console.log(`  horas_vigencia: ${horas_vigencia} (will be formatted as string)`)
    console.log(`  descripcion: "${descripcion || "(not provided)"}" (length: ${descripcion?.length || 0})`)
    console.log(`  cliente_email: "${cliente_email || "(not provided)"}" (length: ${cliente_email?.length || 0})`)
    console.log(`  cliente_nombre: "${cliente_nombre || "(not provided)"}" (length: ${cliente_nombre?.length || 0})`)
    console.log(`  URL: ${PAQPAY_SOAP_URL}`)
    console.log("=".repeat(80))

    // Build SOAP XML (monto and horas_vigencia will be converted to strings inside)
    const soapBody = buildEmiteTokenSoapEnvelope(
      usuario,
      password,
      rep_id,
      cleanPhone,
      monto, // Will be converted to string inside buildEmiteTokenSoapEnvelope
      referencia,
      horas_vigencia, // Will be converted to string inside buildEmiteTokenSoapEnvelope
      descripcion,
      cliente_email,
      cliente_nombre,
    )

    // Log the complete SOAP body
    console.log("📦 SOAP Request Body:")
    console.log("-".repeat(80))
    console.log(soapBody)
    console.log("-".repeat(80))

    // Configure headers
    const headers = {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: '"http://www.paq.com.gt/paqpay/emite_token"',
      Accept: "text/xml; charset=utf-8",
      "Accept-Charset": "utf-8, *;q=0.8",
      "Accept-Language": "es, es-ES;q=0.9, *;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Connection: "keep-alive",
    }

    // Log headers
    console.log("📋 Request Headers:")
    console.log(JSON.stringify(headers, null, 2))
    console.log("=".repeat(80))

    // Make SOAP request
    console.log("🚀 Sending SOAP request...")
    const response = await axios.post(PAQPAY_SOAP_URL, soapBody, {
      headers,
      responseType: "text",
      responseEncoding: "utf8",
      timeout: 30000, // 30 seconds
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      transformResponse: [
        (data) => {
          if (Buffer.isBuffer(data)) {
            return data.toString("utf8")
          }
          return data
        },
      ],
    })

    // Log response
    console.log("=".repeat(80))
    console.log("📥 EMITE_TOKEN - SOAP Response Received")
    console.log("=".repeat(80))
    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log("Response Body:")
    console.log("-".repeat(80))
    console.log(response.data)
    console.log("-".repeat(80))

    // Parse response
    const resultado = parseEmiteTokenResponse(response.data)
    
    console.log("📊 Parsed Result:")
    console.log(JSON.stringify(resultado, null, 2))
    console.log("=".repeat(80))
    
    return resultado
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`SOAP service connection error: ${error.message}`)
    }
    throw error
  }
}

// ============================================
// PAQgo Service - Payment Processing
// ============================================

// PAQgo SOAP URL
const PAQGO_URL = process.env.PAQGO_URL || "https://www.paq.com.gt/paqgo/paqgo.asmx"

/**
 * Builds SOAP request for PAQgo service
 * Uses the existing escapeXml function defined earlier in the file
 */
function buildPAQgoSoapRequest(
  usuario: string,
  password: string,
  rep_id: string,
  token: string,
  celular: string,
): string {
  const paramsXml = `<usuario>${escapeXml(usuario)}</usuario>
      <password>${escapeXml(password)}</password>
      <rep_id>${escapeXml(rep_id)}</rep_id>
      <token>${escapeXml(token)}</token>
      <celular>${celular}</celular>`

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <PAQgo xmlns="http://tempuri.org/">
      ${paramsXml}
    </PAQgo>
  </soap:Body>
</soap:Envelope>`

  return soapBody
}

/**
 * Parses PAQgo SOAP response
 */
function parsePAQgoResponse(xmlResponse: string): PAQgoResponse {
  try {
    // Check for SOAP Fault
    const faultMatch = xmlResponse.match(/<soap:Fault[^>]*>([\s\S]*?)<\/soap:Fault>/)
    if (faultMatch) {
      const faultContent = faultMatch[1]
      const faultcodeMatch = faultContent.match(/<faultcode[^>]*>(.*?)<\/faultcode>/)
      const faultstringMatch = faultContent.match(/<faultstring[^>]*>(.*?)<\/faultstring>/)

      return {
        error: true,
        faultcode: faultcodeMatch ? faultcodeMatch[1] : null,
        faultstring: faultstringMatch ? faultstringMatch[1] : null,
        codret: null,
        mensaje: faultstringMatch ? faultstringMatch[1] : "Error SOAP desconocido",
        transaccion: null,
      }
    }

    // Extract SOAP body content
    const bodyMatch = xmlResponse.match(/<soap:Body[^>]*>([\s\S]*?)<\/soap:Body>/)
    if (!bodyMatch) {
      throw new Error("No se encontró el body SOAP en la respuesta")
    }

    const bodyContent = bodyMatch[1]

    // Look for PAQgoResponse
    const responseMatch = bodyContent.match(/<PAQgoResponse[^>]*>([\s\S]*?)<\/PAQgoResponse>/)

    if (!responseMatch) {
      // Try to find fields directly
      const codretMatch = bodyContent.match(/<codret[^>]*>(\d+)<\/codret>/)
      const mensajeMatch = bodyContent.match(/<mensaje[^>]*>(.*?)<\/mensaje>/)
      const transaccionMatch = bodyContent.match(/<transaccion[^>]*>(\d+)<\/transaccion>/)

      return {
        error: false,
        codret: codretMatch ? parseInt(codretMatch[1]) : null,
        mensaje: mensajeMatch ? mensajeMatch[1] : null,
        transaccion: transaccionMatch ? parseInt(transaccionMatch[1]) : null,
      }
    }

    // Extract PAQgoResult content
    const resultMatch = responseMatch[1].match(/<PAQgoResult[^>]*>([\s\S]*?)<\/PAQgoResult>/)

    if (resultMatch) {
      const resultString = resultMatch[1]

      // Try to parse as JSON first
      try {
        const jsonResult = JSON.parse(resultString)
        return {
          error: false,
          codret: jsonResult.codret !== undefined ? parseInt(jsonResult.codret.toString()) : null,
          mensaje: jsonResult.mensaje || null,
          transaccion: jsonResult.transaccion !== undefined ? parseInt(jsonResult.transaccion.toString()) : null,
        }
      } catch (e) {
        // If not JSON, try to parse as XML
        const codretMatch = resultString.match(/<codret[^>]*>(\d+)<\/codret>/)
        const mensajeMatch = resultString.match(/<mensaje[^>]*>(.*?)<\/mensaje>/)
        const transaccionMatch = resultString.match(/<transaccion[^>]*>(\d+)<\/transaccion>/)

        return {
          error: false,
          codret: codretMatch ? parseInt(codretMatch[1]) : null,
          mensaje: mensajeMatch ? mensajeMatch[1] : null,
          transaccion: transaccionMatch ? parseInt(transaccionMatch[1]) : null,
        }
      }
    }

    // If PAQgoResult not found, search for fields directly in response
    const codretMatch = responseMatch[1].match(/<codret[^>]*>(\d+)<\/codret>/)
    const mensajeMatch = responseMatch[1].match(/<mensaje[^>]*>(.*?)<\/mensaje>/)
    const transaccionMatch = responseMatch[1].match(/<transaccion[^>]*>(\d+)<\/transaccion>/)

    return {
      error: false,
      codret: codretMatch ? parseInt(codretMatch[1]) : null,
      mensaje: mensajeMatch ? mensajeMatch[1] : null,
      transaccion: transaccionMatch ? parseInt(transaccionMatch[1]) : null,
    }
  } catch (error) {
    console.error("Error al parsear la respuesta SOAP:", error)
    throw new Error(`Error parsing SOAP response: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Executes payment using PAQgo service
 * @param usuario - Merchant username
 * @param password - Merchant password
 * @param rep_id - Merchant rep_id
 * @param token - Payment token (5 characters)
 * @param celular - Client phone number (8 digits)
 * @returns Response with codret, mensaje, and transaccion
 */
export async function paqgo(
  usuario: string,
  password: string,
  rep_id: string,
  token: string,
  celular: string,
): Promise<PAQgoResponse> {
  // Validate parameters
  if (!usuario || !password || !rep_id) {
    throw new Error("Merchant credentials are required")
  }

  const cleanToken = token.replace(/\s/g, "").toUpperCase()
  if (!cleanToken || cleanToken.length !== 5) {
    throw new Error("Token must have 5 characters")
  }

  const cleanPhone = celular.replace(/\s/g, "")
  if (!cleanPhone || cleanPhone.length !== 8) {
    throw new Error("Phone number must have 8 digits")
  }

  try {
    console.log("=".repeat(80))
    console.log("📤 PAQGO - Building SOAP Request")
    console.log("=".repeat(80))
    console.log("Input Parameters:")
    console.log(`  usuario: "${usuario}"`)
    console.log(`  rep_id: "${rep_id}"`)
    console.log(`  token: "${cleanToken}"`)
    console.log(`  celular: "${cleanPhone}"`)
    console.log(`  URL: ${PAQGO_URL}`)
    console.log("=".repeat(80))

    const soapRequest = buildPAQgoSoapRequest(usuario, password, rep_id, cleanToken, cleanPhone)

    console.log("📦 SOAP Request Body:")
    console.log("-".repeat(80))
    console.log(soapRequest)
    console.log("-".repeat(80))

    const response = await axios.post(PAQGO_URL, soapRequest, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: '"http://tempuri.org/PAQgo"',
      },
      timeout: 30000, // 30 seconds
      responseType: "text",
      responseEncoding: "utf8",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      transformResponse: [
        (data) => {
          if (Buffer.isBuffer(data)) {
            return data.toString("utf8")
          }
          return data
        },
      ],
    })

    console.log("=".repeat(80))
    console.log("📥 PAQGO - SOAP Response Received")
    console.log("=".repeat(80))
    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log("Response Body:")
    console.log("-".repeat(80))
    console.log(response.data)
    console.log("-".repeat(80))

    // Parse response
    const resultado = parsePAQgoResponse(response.data)

    console.log("📊 Parsed Result:")
    console.log(JSON.stringify(resultado, null, 2))
    console.log("=".repeat(80))

    return resultado
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`SOAP service connection error: ${error.message}`)
    }
    throw error
  }
}

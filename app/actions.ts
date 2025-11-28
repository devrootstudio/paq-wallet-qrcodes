"use server"

import {
  queryClient,
  sendTokenTyc,
  validateTokenTyc,
  validateCupo,
  executeDisbursement,
  emiteToken,
  paqgo,
  type QueryClientResponse,
} from "@/lib/soap-client"
import { sendToMakeWebhook } from "@/lib/make-integration"
import { validateSecurityToken } from "@/lib/security-token"

// Test mode configuration from environment variables
const ENABLE_TEST_BYPASS = process.env.ENABLE_TEST_BYPASS === "true" || process.env.ENABLE_TEST_BYPASS === "1"
const TEST_PHONE = process.env.TEST_PHONE || "50502180"
const TEST_APPROVED_AMOUNT = Number.parseInt(process.env.TEST_APPROVED_AMOUNT || "3500", 10)
const TEST_ID_SOLICITUD = process.env.TEST_ID_SOLICITUD || "TEST-001"
const TEST_TOKEN = process.env.TEST_TOKEN || "222222"

/**
 * Validates security token for Server Actions
 * This prevents external requests from calling Server Actions directly
 * Only requests with a valid security token (obtained from the client-side) are allowed
 * @param providedToken - Optional token provided in the request (for additional validation)
 * @returns true if request is allowed, false otherwise
 */
async function validateRequestSecurity(providedToken?: string): Promise<boolean> {
  try {
    // Validate the security token (from httpOnly cookie or provided token)
    const isValid = await validateSecurityToken(providedToken)
    
    if (!isValid) {
      console.error("🚫 Security: Invalid or missing security token")
      console.error("   Request blocked - Only client-side requests are allowed")
      return false
    }
    
    return true
  } catch (error) {
    console.error("❌ Security: Error validating request security:", error)
    return false
  }
}

interface Step0FormData {
  phone: string
  requestedAmount: number
  usuario: string // Merchant username
  password: string // Merchant password
  rep_id: string // Merchant rep_id
  autorizacion?: string // Authorization number for end-to-end tracking
}

interface Step1FormData {
  identification: string
  fullName: string
  phone: string
  email: string
  nit: string
  startDate: string
  salary: string
  paymentFrequency: string
  autorizacion?: string // Authorization number for end-to-end tracking
}

interface ServerActionResponse {
  success: boolean
  error?: string
  errorType?: "token" | "cupo" | "general" | "phone_number" | "disbursement" // Distinguish error types for step2
  approvedAmount?: number
  idSolicitud?: string
  skipStep2?: boolean // Indicates that step 2 (OTP) should be skipped
  hasCommissionIssue?: boolean // Indicates code 34: disbursement successful but commission collection had issues
  token?: string | null // Payment token from emite_token
  transaccion?: number | null // Transaction ID from emite_token or PAQgo
  codret?: number | null // Response code from PAQgo (0 = success, 99 = success with flag)
  hasCode99Flag?: boolean // Flag indicating code 99 was returned
  clientData?: {
    identification?: string
    fullName?: string
    phone?: string
    email?: string
    nit?: string
    startDate?: string
    salary?: string
    paymentFrequency?: string
  }
}

/**
 * Server action for step 0: Emit payment token
 * @param data - Phone number, amount, and merchant credentials
 * @returns Response with token and transaction ID or error
 */
export async function submitStep0Form(data: Step0FormData): Promise<ServerActionResponse> {
  // Validate security token (only client-side requests allowed)
  const isValid = await validateRequestSecurity()
  if (!isValid) {
    return {
      success: false,
      error: "Unauthorized request",
      errorType: "general",
    }
  }

  console.log("=== STEP 0 EMITE TOKEN ===")
  console.log("Timestamp:", new Date().toISOString())
  console.log("Phone:", data.phone)
  console.log("Amount:", data.requestedAmount)
  console.log("Merchant Usuario:", data.usuario)
  console.log("Merchant Rep ID:", data.rep_id)
  console.log("Merchant Password Length:", data.password?.length || 0)
  console.log("Full Data:", JSON.stringify({
    phone: data.phone,
    requestedAmount: data.requestedAmount,
    usuario: data.usuario,
    rep_id: data.rep_id,
    hasPassword: !!data.password,
    passwordLength: data.password?.length || 0,
    autorizacion: data.autorizacion,
  }, null, 2))
  console.log("===============================")

  try {
    // Validate input
    if (!data.phone) {
      return {
        success: false,
        error: "Phone number is required",
        errorType: "general",
      }
    }

    if (!data.requestedAmount || data.requestedAmount <= 0) {
      return {
        success: false,
        error: "Amount must be greater than 0",
        errorType: "general",
      }
    }

    if (!data.usuario || !data.password || !data.rep_id) {
      return {
        success: false,
        error: "Merchant credentials are required",
        errorType: "general",
      }
    }

    // Validate field lengths to prevent truncation errors
    if (data.usuario.length > 100) {
      return {
        success: false,
        error: "Usuario demasiado largo",
        errorType: "general",
      }
    }

    if (data.password.length > 100) {
      return {
        success: false,
        error: "Password demasiado largo",
        errorType: "general",
      }
    }

    if (data.rep_id.length > 50) {
      return {
        success: false,
        error: "Rep ID demasiado largo",
        errorType: "general",
      }
    }

    const cleanPhone = data.phone.replace(/\s/g, "")
    if (cleanPhone.length !== 8) {
      return {
        success: false,
        error: "Phone number must have 8 digits",
        errorType: "general",
      }
    }

    // Generate reference - short dynamic 6 character code
    // Use last 6 digits of timestamp for uniqueness
    const timestamp = Date.now().toString()
    const shortCode = timestamp.slice(-6) // Last 6 digits
    const referencia = `REF-${shortCode}` // Total: 10 characters (REF- + 6 digits)

    // Generate description (optional, but keep it short - max 200 chars)
    const descripcion = `Pago rápido - ${data.usuario}`.substring(0, 200)

    // Handle password - try to decode if it looks URL-encoded
    // The password "PruebaTec%1%2" might need decoding
    let passwordToUse = data.password
    try {
      // If password contains % and looks like URL encoding, try to decode
      if (passwordToUse.includes('%') && passwordToUse.match(/%[0-9A-Fa-f]{2}/)) {
        const decoded = (passwordToUse)
        // Only use decoded if it's different and makes sense
        if (decoded !== passwordToUse && decoded.length > 0) {
          console.log("🔓 Decoding URL-encoded password")
          passwordToUse = decoded
        }
      }
    } catch (e) {
      // If decoding fails, use original password
      console.warn("⚠️ Could not decode password, using as-is")
    }

    // Call emiteToken service - Log all parameters
    console.log("=".repeat(80))
    console.log("🔐 CALLING EMITE_TOKEN SERVICE")
    console.log("=".repeat(80))
    console.log("📋 Parameters being sent:")
    console.log(`   usuario: "${data.usuario}"`)
    console.log(`   password: "${passwordToUse}" (length: ${passwordToUse.length})`)
    console.log(`   rep_id: "${data.rep_id}"`)
    console.log(`   cliente_celular: "${cleanPhone}"`)
    console.log(`   monto: ${data.requestedAmount}`)
    console.log(`   referencia: "${referencia}"`)
    console.log(`   horas_vigencia: 24`)
    console.log(`   descripcion: "${descripcion}"`)
    console.log("=".repeat(80))

    let tokenResponse
    try {
      tokenResponse = await emiteToken(
        data.usuario,
        passwordToUse,
        data.rep_id,
        cleanPhone,
        data.requestedAmount,
        referencia,
        24, // horas_vigencia: 24 hours
        descripcion, // descripcion
      )
        } catch (error) {
      console.error("❌ Error calling emite_token:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error calling payment service. Please try again later.",
        errorType: "general",
      }
    }

    // Check if there was a SOAP fault
    if (tokenResponse.error || tokenResponse.faultcode) {
      console.error("❌ SOAP Fault in emite_token response:")
      console.error(`   Fault Code: ${tokenResponse.faultcode}`)
      console.error(`   Fault String: ${tokenResponse.faultstring}`)
      return {
        success: false,
        error: tokenResponse.faultstring || tokenResponse.mensaje || "Error en el servicio de pago",
        errorType: "general",
      }
    }

    // Check if token was emitted successfully (codret === 0)
    if (tokenResponse.codret !== 0) {
      console.error("❌ Error emitting token:")
      console.error(`   Code: ${tokenResponse.codret}`)
      console.error(`   Message: ${tokenResponse.mensaje}`)
      
      // Provide user-friendly error messages
      let userFriendlyError = tokenResponse.mensaje || "Error al generar el token de pago"
      
      // Check for authentication errors
      if (tokenResponse.mensaje && (
        tokenResponse.mensaje.toLowerCase().includes("incorrecto") ||
        tokenResponse.mensaje.toLowerCase().includes("password") ||
        tokenResponse.mensaje.toLowerCase().includes("usuario") ||
        tokenResponse.mensaje.toLowerCase().includes("rep_id")
      )) {
        userFriendlyError = "Error de autenticación: Las credenciales del comercio no son válidas. Por favor, contacta al administrador."
      }
      
      return {
        success: false,
        error: userFriendlyError,
        errorType: "general",
      }
    }

    // Token emitted successfully
    console.log("✅ Token emitted successfully")
    console.log(`   Code: ${tokenResponse.codret}`)
    console.log(`   Message: ${tokenResponse.mensaje}`)
    console.log(`   Token: ${tokenResponse.token}`)
    console.log(`   Transaction ID: ${tokenResponse.transaccion}`)

    return {
      success: true,
      token: tokenResponse.token,
      transaccion: tokenResponse.transaccion,
    }
  } catch (error) {
    console.error("❌ Error in submitStep0Form:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing phone validation",
      errorType: "general",
    }
  }
}

export async function submitStep1Form(data: Step1FormData): Promise<ServerActionResponse> {
  // Validate security token (only client-side requests allowed)
  const isValid = await validateRequestSecurity()
  if (!isValid) {
    return {
      success: false,
      error: "Unauthorized request",
      errorType: "general",
    }
  }

  // Server log with all received fields
  console.log("=== STEP 1 FORM SUBMISSION ===")
  console.log("Timestamp:", new Date().toISOString())
  console.log("Form Data:", JSON.stringify(data, null, 2))
  console.log("===============================")

  try {
    // Additional server-side validation
    if (!data.identification || !data.fullName || !data.phone || !data.email || !data.nit || !data.startDate || !data.salary || !data.paymentFrequency) {
      return {
        success: false,
        error: "All fields are required",
        errorType: "general", // Step1 errors stay in step1
      }
    }

    const cleanPhone = data.phone.replace(/\s/g, "")

    // TEST MODE: Bypass for test phone number
    if (ENABLE_TEST_BYPASS && cleanPhone === TEST_PHONE) {
      console.log("🧪 TEST MODE: Bypass activated for test phone number")
      console.log(`   Phone: ${cleanPhone}`)
      console.log("   Skipping client validation and OTP sending")
      console.log("   Sending mock data to webhook")

      // Send mock data to webhook
      const mockClientResponse: QueryClientResponse = {
        returnCode: 0,
        message: "TEST MODE: Mock client validation",
        client: {
          id: "TEST-001",
          status: "ACTIVE",
          identificationNumber: data.identification,
          fullName: data.fullName,
          phone: cleanPhone,
          email: data.email,
          nit: data.nit,
          startDate: data.startDate,
          monthlySalary: data.salary,
          paymentFrequency: data.paymentFrequency,
        },
      }

      await sendToMakeWebhook(1, data, mockClientResponse, true, data.autorizacion)

      // Return success to proceed to step 2 (OTP)
      console.log("✅ TEST MODE: Step 1 completed, proceeding to step 2")
      return {
        success: true,
        skipStep2: false, // Go to step 2 for OTP
      }
    }

    // STEP 1: Query if client is registered by phone number
    console.log("🔍 Querying client in system...")
    console.log(`   Phone: ${cleanPhone}`)

    let clientResponse: QueryClientResponse | null = null
    let clientExists = false

    try {
      clientResponse = await queryClient(cleanPhone)
    } catch (error) {
      console.error("❌ Error querying client:", error)
      // Send to webhook even if query fails
      await sendToMakeWebhook(1, data, null, false, data.autorizacion)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error querying service. Please try again later.",
        errorType: "general", // Step1 errors stay in step1
      }
    }

    // Check if query was successful
    const returnCode = clientResponse.returnCode
    const isSuccessful = returnCode === 0 || returnCode === "0"
    clientExists = isSuccessful

    if (!isSuccessful) {
      // Client not registered or error in query
      const errorMessage = clientResponse.message || "Phone number is not registered in the system"
      console.error("❌ Client not found or query error:")
      console.error(`   Code: ${returnCode}`)
      console.error(`   Message: ${errorMessage}`)

      // Send to webhook with client not found
      await sendToMakeWebhook(1, data, clientResponse, false, data.autorizacion)

      return {
        success: false,
        error: errorMessage,
        errorType: "general", // Step1 errors stay in step1
      }
    }

    // Client found - process client data
    console.log("✅ Client found in system")
    console.log(`   Code: ${returnCode}`)
    console.log(`   Message: ${clientResponse.message}`)

    // Client data is already mapped to English camelCase format
    const clientData = clientResponse.client

    if (clientData && typeof clientData === "object") {
      console.log("📋 Client Data:")
      console.log(`   ID: ${clientData.id || "N/A"}`)
      console.log(`   Status: ${clientData.status || "N/A"}`)
      console.log(`   Name: ${clientData.fullName || "N/A"}`)
      console.log(`   Phone: ${clientData.phone || "N/A"}`)
      console.log(`   Email: ${clientData.email || "N/A"}`)
    }

    // Here you can add additional validations comparing form data
    // with client data obtained from the system
    // For example:
    // - Verify that name matches
    // - Verify that email matches
    // - Verify that NIT matches
    // - etc.

    // Send to webhook with successful client query
    await sendToMakeWebhook(1, data, clientResponse, true, data.autorizacion)

    // Send OTP token to client's phone for step 2 validation
    console.log("📱 Sending OTP token to client's phone...")
    try {
      // TEST MODE: Bypass token sending for test phone number
      if (ENABLE_TEST_BYPASS && cleanPhone === TEST_PHONE) {
        console.log("🧪 TEST MODE: Bypass token sending for test phone number")
        console.log(`   Phone: ${cleanPhone}`)
        console.log(`   Test Token: ${TEST_TOKEN}`)
        console.log("   ✅ TEST MODE: Token sending bypassed, proceed to step 2")
        // Continue to step 2 without sending actual token
        // Return success to proceed to step 2 (OTP input)
        return {
          success: true,
        }
      }

      // Normal flow: Send token via SOAP service
      const tokenResponse = await sendTokenTyc(data.phone)
      const tokenReturnCode = tokenResponse.returnCode
      const tokenSuccess = tokenReturnCode === 0 ||
        tokenReturnCode === "0" ||
        tokenReturnCode === 24 ||
        tokenReturnCode === "24"

      if (!tokenSuccess) {
        // OTP sending failed - go to fallback
        const errorMessage = tokenResponse.message || "Error sending OTP token"
        console.error("❌ Error sending OTP token:")
        console.error(`   Code: ${tokenReturnCode}`)
        console.error(`   Message: ${errorMessage}`)
        return {
          success: false,
          error: errorMessage,
        }
      }

      // Check if code is 24 (client already accepted terms and conditions)
      const isCode24 = tokenReturnCode === 24 || tokenReturnCode === "24"
      
      if (isCode24) {
        console.log("✅ Client already accepted terms and conditions (Code 24)")
        console.log(`   Message: ${tokenResponse.message}`)
        console.log("⏭️ Skipping OTP validation, proceeding directly to cupo validation...")

        // Validate cupo (credit limit) directly
        console.log("💰 Validating credit limit (cupo)...")
        console.log(`   Phone: ${data.phone}`)

        let cupoResponse
        try {
          cupoResponse = await validateCupo(data.phone)
        } catch (error) {
          console.error("❌ Error validating cupo:", error)
          return {
            success: false,
            error: error instanceof Error ? error.message : "Error validating credit limit. Please try again later.",
            errorType: "cupo",
          }
        }

        // Check if cupo validation was successful
        const cupoReturnCode = cupoResponse.returnCode
        const cupoIsSuccessful = cupoReturnCode === 0 || cupoReturnCode === "0"

        if (!cupoIsSuccessful) {
          // Cupo validation failed
          const errorMessage = cupoResponse.message || "Error validating credit limit"
          console.error("❌ Cupo validation failed:")
          console.error(`   Code: ${cupoReturnCode}`)
          console.error(`   Message: ${errorMessage}`)

          return {
            success: false,
            error: errorMessage,
            errorType: "cupo",
          }
        }

        // Cupo validated successfully
        console.log("✅ Credit limit validated successfully")
        console.log(`   Code: ${cupoReturnCode}`)
        console.log(`   Message: ${cupoResponse.message}`)
        console.log(`   Approved Amount: Q${cupoResponse.cupoAutorizado || "N/A"}`)
        console.log(`   Request ID: ${cupoResponse.idSolicitud || "N/A"}`)

        // Return success with approved amount and skipStep2 flag
        return {
          success: true,
          approvedAmount: cupoResponse.cupoAutorizado,
          idSolicitud: cupoResponse.idSolicitud,
          skipStep2: true, // Skip OTP step and go directly to step 3
        }
      }

      // Code 0: OTP token sent successfully, proceed to step 2
      console.log("✅ OTP token sent successfully")
      console.log(`   Message: ${tokenResponse.message}`)
    } catch (error) {
      // OTP sending failed - go to fallback
      console.error("❌ Error sending OTP token:", error)
      const errorMessage = error instanceof Error ? error.message : "Error sending OTP token. Please try again later."
      return {
        success: false,
        error: errorMessage,
      }
    }

    // If everything is ok, return success (normal flow: go to step 2)
    console.log("✅ Form processed successfully")
    return {
      success: true,
    }
  } catch (error) {
    console.error("❌ Error in submitStep1Form:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing form",
      errorType: "general", // Step1 errors stay in step1
    }
  }
}

interface Step2FormData {
  phone: string
  token: string
  autorizacion?: string // Authorization number for end-to-end tracking
  usuario: string // Merchant username
  password: string // Merchant password
  rep_id: string // Merchant rep_id
  requestedAmount: number // Requested amount for the payment
}

/**
 * Server action to resend OTP token via SMS
 * @param phone - Client phone number (8 digits)
 * @returns Response indicating success or failure
 */
export async function resendToken(phone: string): Promise<ServerActionResponse> {
  // Validate security token (only client-side requests allowed)
  const isValid = await validateRequestSecurity()
  if (!isValid) {
    return {
      success: false,
      error: "Unauthorized request",
      errorType: "general",
    }
  }

  console.log("=== RESEND TOKEN ===")
  console.log("Timestamp:", new Date().toISOString())
  console.log("Phone:", phone)
  console.log("===============================")

  try {
    // Validate phone
    const cleanPhone = phone.replace(/\s/g, "")
    if (!cleanPhone || cleanPhone.length !== 8) {
      return {
        success: false,
        error: "Phone number must have 8 digits",
        errorType: "general",
      }
    }

    // TEST MODE: Bypass for test phone number
    if (ENABLE_TEST_BYPASS && cleanPhone === TEST_PHONE) {
      console.log("🧪 TEST MODE: Bypass OTP resend for test phone number")
      console.log(`   Phone: ${cleanPhone}`)
      console.log("   ✅ TEST MODE: OTP resend bypassed successfully")
      return {
        success: true,
      }
    }

    // Send OTP token to client's phone
    console.log("📱 Resending OTP token to client's phone...")
    console.log(`   Phone: ${cleanPhone}`)

    try {
      const tokenResponse = await sendTokenTyc(cleanPhone)
      const tokenReturnCode = tokenResponse.returnCode
      const tokenSuccess = tokenReturnCode === 0 || tokenReturnCode === "0"

      if (tokenSuccess) {
        console.log("✅ OTP token resent successfully")
        console.log(`   Message: ${tokenResponse.message}`)
        return {
          success: true,
        }
      } else {
        console.error("❌ Error resending OTP token:")
        console.error(`   Code: ${tokenReturnCode}`)
        console.error(`   Message: ${tokenResponse.message}`)
        return {
          success: false,
          error: tokenResponse.message || "Failed to resend OTP token.",
          errorType: "token", // Resend errors go to fallback
        }
      }
    } catch (error) {
      console.error("❌ Error resending OTP token:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error resending OTP token",
        errorType: "token", // Resend errors go to fallback
      }
    }
  } catch (error) {
    console.error("❌ Error in resendToken:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing token resend",
      errorType: "cupo", // Resend errors go to fallback
    }
  }
}

export async function submitStep2Form(data: Step2FormData): Promise<ServerActionResponse> {
  // Validate security token (only client-side requests allowed)
  const isValid = await validateRequestSecurity()
  if (!isValid) {
    return {
      success: false,
      error: "Unauthorized request",
      errorType: "general",
    }
  }

  // Server log with received data
  console.log("=== STEP 2 FORM SUBMISSION - PAQGO PAYMENT ===")
  console.log("Timestamp:", new Date().toISOString())
  console.log("Phone:", data.phone)
  console.log("Token:", data.token)
  console.log("Requested Amount:", data.requestedAmount)
  console.log("Merchant:", data.rep_id)
  console.log("===============================")

  try {
    // Validate input
    if (!data.phone || !data.token) {
      return {
        success: false,
        error: "Phone and token are required",
        errorType: "token",
      }
    }

    if (!data.usuario || !data.password || !data.rep_id) {
      return {
        success: false,
        error: "Merchant credentials are required",
        errorType: "general",
      }
    }

    // Validate token format (PAQgo expects exactly 5 characters)
    const cleanToken = data.token.replace(/\s/g, "").toUpperCase()
    if (cleanToken.length !== 5) {
      return {
        success: false,
        error: "Token must have exactly 5 characters",
        errorType: "token",
      }
    }

    // PAQgo expects 5-character token
    const paqgoToken = cleanToken
    const cleanPhone = data.phone.replace(/\s/g, "")

    // TEST MODE: Bypass for test phone number
    if (ENABLE_TEST_BYPASS && cleanPhone === TEST_PHONE) {
      console.log("🧪 TEST MODE: Bypass activated for test phone number")
      console.log(`   Phone: ${cleanPhone}`)
      console.log(`   Token: ${paqgoToken} (bypass - test mode)`)
      console.log("   Skipping PAQgo payment processing")
      console.log("   Returning mock transaction:", 999999)

      // Return mock payment data
      return {
        success: true,
        approvedAmount: data.requestedAmount,
        transaccion: 999999,
      }
    }

    // Execute payment using PAQgo
    console.log("💳 Processing payment with PAQgo...")
    console.log(`   Phone: ${cleanPhone}`)
    console.log(`   Token: ${paqgoToken}`)
    console.log(`   Amount: Q${data.requestedAmount}`)

    let paqgoResponse
    try {
      paqgoResponse = await paqgo(data.usuario, data.password, data.rep_id, paqgoToken, cleanPhone)
      } catch (error) {
      console.error("❌ Error processing payment with PAQgo:", error)
        return {
          success: false,
        error: error instanceof Error ? error.message : "Error processing payment. Please try again later.",
        errorType: "token",
      }
    }

    // Check if payment was successful
    // Code: 0 -> Payment successful
    if (paqgoResponse.error) {
      // SOAP Fault occurred
      const errorMessage = paqgoResponse.faultstring || paqgoResponse.mensaje || "Error processing payment"
      console.error("❌ PAQgo payment failed (SOAP Fault):")
      console.error(`   Fault Code: ${paqgoResponse.faultcode}`)
      console.error(`   Fault String: ${errorMessage}`)

        return {
          success: false,
          error: errorMessage,
        errorType: "token",
      }
    }

    // Check codret (return code)
    // Code: 0 -> Payment successful
    // Code: 99 -> Payment successful (with flag)
    const codret = paqgoResponse.codret
    const isSuccessful = codret === 0 || codret === 99 || codret === null

    if (!isSuccessful) {
      // Payment failed
      const errorMessage = paqgoResponse.mensaje || "Error processing payment"
      console.error("❌ PAQgo payment failed:")
      console.error(`   Code: ${codret}`)
      console.error(`   Message: ${errorMessage}`)

      return {
        success: false,
        error: errorMessage,
        errorType: "token",
      }
    }

    // Payment successful (code 0 or 99)
    const hasCode99Flag = codret === 99
    if (hasCode99Flag) {
      console.log("✅ Payment processed successfully (Code 99)")
    } else {
      console.log("✅ Payment processed successfully")
    }
    console.log(`   Code: ${codret}`)
    console.log(`   Message: ${paqgoResponse.mensaje || "Payment successful"}`)
    console.log(`   Transaction ID: ${paqgoResponse.transaccion || "N/A"}`)

    // Return success with transaction ID and response code
    return {
      success: true,
      approvedAmount: data.requestedAmount,
      transaccion: paqgoResponse.transaccion,
      codret: codret,
      hasCode99Flag: hasCode99Flag,
    }
  } catch (error) {
    console.error("❌ Error in submitStep2Form:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing payment",
      errorType: "general",
    }
  }
}

interface Step3FormData {
  phone: string
  idSolicitud: string
  monto: number
  comision: number
  autorizacion: string
}

/**
 * Server action for step 3: Execute disbursement
 * @param data - Disbursement data (phone, idSolicitud, monto, comision, autorizacion)
 * @returns Response indicating success or failure
 */
export async function submitStep3Form(data: Step3FormData): Promise<ServerActionResponse> {
  // Validate security token (only client-side requests allowed)
  const isValid = await validateRequestSecurity()
  if (!isValid) {
    return {
      success: false,
      error: "Unauthorized request",
      errorType: "disbursement",
    }
  }

  console.log("=== STEP 3 DISBURSEMENT EXECUTION ===")
  console.log("Timestamp:", new Date().toISOString())
  console.log("Phone:", data.phone)
  console.log("ID Solicitud:", data.idSolicitud)
  console.log("Monto:", data.monto)
  console.log("Comision:", data.comision)
  console.log("Autorizacion:", data.autorizacion)
  console.log("===============================")

  try {
    // Validate input
    if (!data.phone || !data.idSolicitud || !data.monto || data.comision < 0 || !data.autorizacion) {
      return {
        success: false,
        error: "All fields are required and valid",
        errorType: "disbursement",
      }
    }

    const cleanPhone = data.phone.replace(/\s/g, "")

    // TEST MODE: Bypass disbursement for test phone number
    if (ENABLE_TEST_BYPASS && cleanPhone === TEST_PHONE) {
      console.log("🧪 TEST MODE: Bypass disbursement execution")
      console.log(`   Phone: ${cleanPhone}`)
      console.log(`   ID Solicitud: ${data.idSolicitud}`)
      console.log(`   Monto: Q${data.monto}`)
      console.log(`   Comision: Q${data.comision}`)
      console.log(`   Autorizacion: ${data.autorizacion}`)
      console.log("   ✅ TEST MODE: Disbursement bypassed successfully")

      return {
        success: true,
        hasCommissionIssue: false,
      }
    }

    // Execute disbursement
    console.log("💰 Executing disbursement...")
    console.log(`   Phone: ${data.phone}`)
    console.log(`   ID Solicitud: ${data.idSolicitud}`)
    console.log(`   Monto: Q${data.monto}`)
    console.log(`   Comision: Q${data.comision}`)
    console.log(`   Autorizacion: ${data.autorizacion}`)

    let disbursementResponse
    try {
      disbursementResponse = await executeDisbursement(
        data.phone,
        data.idSolicitud,
        data.monto,
        data.comision,
        data.autorizacion,
      )
    } catch (error) {
      console.error("❌ Error executing disbursement:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error executing disbursement. Please try again later.",
        errorType: "disbursement",
      }
    }

    // Check if disbursement was successful
    // Code 0 = success, Code 34 = success in disbursement but error in commission collection (also consider success)
    const returnCode = disbursementResponse.returnCode
    const isSuccessful = returnCode === 0 || returnCode === "0" || returnCode === 34 || returnCode === "34"

    if (!isSuccessful) {
      // Disbursement failed
      const errorMessage = disbursementResponse.message || "Error executing disbursement"
      console.error("❌ Disbursement execution failed:")
      console.error(`   Code: ${returnCode}`)
      console.error(`   Message: ${errorMessage}`)

      return {
        success: false,
        error: errorMessage,
        errorType: "disbursement",
      }
    }

    // Disbursement executed successfully
    console.log("✅ Disbursement executed successfully")
    console.log(`   Code: ${returnCode}`)
    console.log(`   Message: ${disbursementResponse.message}`)
    const hasCommissionIssue = returnCode === 34 || returnCode === "34"
    if (hasCommissionIssue) {
      console.warn("⚠️ Disbursement successful but commission collection had issues (Code 34)")
    }

    return {
      success: true,
      hasCommissionIssue: hasCommissionIssue,
    }
  } catch (error) {
    console.error("❌ Error in submitStep3Form:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing disbursement",
      errorType: "disbursement",
    }
  }
}


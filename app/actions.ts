"use server"

import { queryClient, sendTokenTyc, validateTokenTyc, type QueryClientResponse } from "@/lib/soap-client"
import { sendToMakeWebhook } from "@/lib/make-integration"

interface Step1FormData {
  identification: string
  fullName: string
  phone: string
  email: string
  nit: string
  startDate: string
  salary: string
  paymentFrequency: string
}

interface ServerActionResponse {
  success: boolean
  error?: string
}

export async function submitStep1Form(data: Step1FormData): Promise<ServerActionResponse> {
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
      }
    }

    // STEP 1: Query if client is registered by phone number
    console.log("🔍 Querying client in system...")
    console.log(`   Phone: ${data.phone}`)

    let clientResponse: QueryClientResponse | null = null
    let clientExists = false

    try {
      clientResponse = await queryClient(data.phone)
    } catch (error) {
      console.error("❌ Error querying client:", error)
      // Send to webhook even if query fails
      await sendToMakeWebhook(1, data, null, false)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error querying service. Please try again later.",
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
      await sendToMakeWebhook(1, data, clientResponse, false)

      return {
        success: false,
        error: errorMessage,
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
    await sendToMakeWebhook(1, data, clientResponse, true)

    // Send OTP token to client's phone for step 2 validation
    console.log("📱 Sending OTP token to client's phone...")
    try {
      const tokenResponse = await sendTokenTyc(data.phone)
      const tokenReturnCode = tokenResponse.returnCode
      const tokenSuccess = tokenReturnCode === 0 || tokenReturnCode === "0"

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

    // If everything is ok, return success
    console.log("✅ Form processed successfully")
    return {
      success: true,
    }
  } catch (error) {
    console.error("❌ Error in submitStep1Form:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing form",
    }
  }
}

interface Step2FormData {
  phone: string
  token: string
}

export async function submitStep2Form(data: Step2FormData): Promise<ServerActionResponse> {
  // Server log with received data
  console.log("=== STEP 2 FORM SUBMISSION ===")
  console.log("Timestamp:", new Date().toISOString())
  console.log("Phone:", data.phone)
  console.log("Token:", data.token)
  console.log("===============================")

  try {
    // Validate input
    if (!data.phone || !data.token) {
      return {
        success: false,
        error: "Phone and token are required",
      }
    }

    // Validate token format
    const cleanToken = data.token.replace(/\s/g, "")
    if (cleanToken.length !== 6) {
      return {
        success: false,
        error: "Token must have 6 digits",
      }
    }

    // Validate token with SOAP service
    console.log("🔍 Validating OTP token...")
    console.log(`   Phone: ${data.phone}`)
    console.log(`   Token: ${cleanToken}`)

    let tokenResponse
    try {
      tokenResponse = await validateTokenTyc(data.phone, cleanToken)
    } catch (error) {
      console.error("❌ Error validating token:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error validating token. Please try again later.",
      }
    }

    // Check if validation was successful
    // Code: 26 -> El token ingresado no es correcto.
    const returnCode = tokenResponse.returnCode
    const isSuccessful = returnCode === 26 || returnCode === "26" // TODO - Change to 0 when token validation is fixed

    if (!isSuccessful) {
      // Token validation failed
      const errorMessage = tokenResponse.message || "Invalid token. Please try again."
      console.error("❌ Token validation failed:")
      console.error(`   Code: ${returnCode}`)
      console.error(`   Message: ${errorMessage}`)

      return {
        success: false,
        error: errorMessage,
      }
    }

    // Token validated successfully
    console.log("✅ Token validated successfully")
    console.log(`   Code: ${returnCode}`)
    console.log(`   Message: ${tokenResponse.message}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error("❌ Error in submitStep2Form:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing token validation",
    }
  }
}


import axios from "axios"
import type { QueryClientResponse } from "./soap-client"

// Make.com Webhook configuration
const WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || ""
const WEBHOOK_API_KEY = process.env.MAKE_WEBHOOK_API_KEY

interface FormDataPayload {
  identification: string
  fullName: string
  phone: string
  email: string
  nit: string
  startDate: string
  salary: string
  paymentFrequency: string
}

interface WebhookPayload {
  step: number
  formData: FormDataPayload
  soapResponse: {
    returnCode: string | number
    message: string
    client: any
  } | null
  clientExists: boolean
  timestamp: string
}

/**
 * Converts payment frequency from Spanish to code
 * @param frequency - Payment frequency in Spanish ("mensual" or "quincenal")
 * @returns Payment frequency code ("M" or "Q")
 */
function normalizePaymentFrequency(frequency: string): string {
  const normalized = frequency.toLowerCase().trim()
  if (normalized === "mensual") return "M"
  if (normalized === "quincenal") return "Q"
  if (normalized === "semanal") return "S"
  return frequency // Return original if not recognized
}

/**
 * Converts date from dd-mm-yyyy format to yyyy-mm-dd format
 * @param date - Date in dd-mm-yyyy format
 * @returns Date in yyyy-mm-dd format
 */
function normalizeStartDate(date: string): string {
  if (!date || date.length !== 10) return date
  
  // Check if already in yyyy-mm-dd format
  if (date.match(/^\d{4}-\d{2}-\d{2}$/)) return date
  
  // Convert from dd-mm-yyyy to yyyy-mm-dd
  const parts = date.split("-")
  if (parts.length === 3) {
    const [day, month, year] = parts
    return `${year}-${month}-${day}`
  }
  
  return date // Return original if format is not recognized
}

/**
 * Sends form data and SOAP response to Make.com webhook
 * @param step - Current step number (1, 2, 3, etc.)
 * @param formData - Form data from the current step
 * @param soapResponse - Response from SOAP query (can be null if query failed)
 * @param clientExists - Whether the client exists in the system
 */
export async function sendToMakeWebhook(
  step: number,
  formData: FormDataPayload,
  soapResponse: QueryClientResponse | null,
  clientExists: boolean,
): Promise<void> {
  try {
    // Transform form data before sending
    const payload: WebhookPayload = {
      step,
      formData: {
        identification: formData.identification,
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        nit: formData.nit,
        startDate: normalizeStartDate(formData.startDate),
        salary: formData.salary,
        paymentFrequency: normalizePaymentFrequency(formData.paymentFrequency),
      },
      soapResponse: soapResponse
        ? {
            returnCode: soapResponse.returnCode,
            message: soapResponse.message,
            client: soapResponse.client,
          }
        : null,
      clientExists,
      timestamp: new Date().toISOString(),
    }

    await axios.post(WEBHOOK_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-make-apikey": WEBHOOK_API_KEY,
      },
    })

    console.log("✅ Data sent to Make.com webhook successfully")
  } catch (error) {
    // Log error but don't fail the entire process
    console.error("❌ Error sending to Make.com webhook:", error)
    // We don't throw here to avoid breaking the main flow
    if (axios.isAxiosError(error)) {
      console.error(`   Status: ${error.response?.status}`)
      console.error(`   Message: ${error.message}`)
    }
  }
}


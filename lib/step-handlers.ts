"use client"

import type { WizardState } from "./store"
import { submitStep0Form, submitStep1Form, submitStep2Form, resendToken } from "@/app/actions"

// Re-export types for convenience
export type { WizardState }

/**
 * Handler for Step 0: Phone validation
 */
// Helper function to generate authorization number
function generateAutorizacion(): string {
  return `AUTH-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
}

export async function handleStep0Submit(
  phone: string,
  requestedAmount: number,
  store: Pick<WizardState, "updateFormData" | "setLoading" | "setErrorStep" | "goToStepAsync" | "formData" | "comercio">,
) {
  const cleanPhone = phone.replace(/\s/g, "")

  // Validate that comercio is available
  if (!store.comercio) {
    console.error("❌ Comercio not found in store")
    store.setLoading(false)
    store.setErrorStep("general", "Error: Comercio no encontrado")
    return
  }

  // Generate authorization number at step 0 for end-to-end tracking
  const autorizacion = generateAutorizacion()
  store.updateFormData({ autorizacion, requestedAmount, phone: cleanPhone })

  // Activate global loader
  store.setLoading(true)

  try {
    // Log comercio data for debugging
    console.log("📋 Comercio data from store:", {
      id: store.comercio.id,
      name: store.comercio.name,
      user: store.comercio.user,
      rep_id: store.comercio.rep_id,
      hasPassword: !!store.comercio.password,
      passwordLength: store.comercio.password?.length || 0,
    })

    const formDataToSubmit = {
      phone: cleanPhone,
      requestedAmount: requestedAmount,
      usuario: store.comercio.user,
      password: store.comercio.password,
      rep_id: store.comercio.rep_id,
      autorizacion: autorizacion,
    }

    console.log("📤 Submitting to server action:", {
      phone: formDataToSubmit.phone,
      requestedAmount: formDataToSubmit.requestedAmount,
      usuario: formDataToSubmit.usuario,
      rep_id: formDataToSubmit.rep_id,
      hasPassword: !!formDataToSubmit.password,
      passwordLength: formDataToSubmit.password?.length || 0,
      autorizacion: formDataToSubmit.autorizacion,
    })

    // Call server action to emit token
    const result = await submitStep0Form(formDataToSubmit)

    if (result.success) {
      // Token emitted successfully, save token and transaction ID
      console.log("✅ Token emitted successfully, going to step 2")
      store.updateFormData({
        // Save transaction ID from emiteToken
        tokenTransactionId: result.transaccion || null,
      })
      
      // Go to step 2 (token input)
      store.setLoading(false)
      await store.goToStepAsync(2)
    } else {
      // Error emitting token, go to step 5 (fallback)
      const errorType = result.errorType || "general"
      const errorMsg = result.error || "Error al generar el token de pago"
      console.error("❌ Error emitting token:", errorMsg)
      store.setLoading(false)
      store.setErrorStep(errorType, errorMsg)
    }
  } catch (error) {
    console.error("❌ Error in handleStep0Submit:", error)
    const errorMsg = error instanceof Error ? error.message : "Error desconocido al procesar la solicitud"
    store.setLoading(false)
    store.setErrorStep("general", errorMsg)
  }
}

/**
 * Handler for Step 1: Form submission
 */
export async function handleStep1Submit(
  formData: {
    identification: string
    fullName: string
    phone: string
    email: string
    nit: string
    startDate: string
    salary: string
    paymentFrequency: string
  },
  store: Pick<WizardState, "nextStepAsync" | "setLoading" | "setErrorStep" | "updateFormData" | "goToStepAsync" | "formData">,
) {
  // Activate global loader
  store.setLoading(true)

  try {
    // Prepare data for server action
    const formDataToSubmit = {
      identification: formData.identification.replace(/\s/g, ""),
      fullName: formData.fullName.trim(),
      phone: formData.phone.replace(/\s/g, ""),
      email: formData.email.trim(),
      nit: formData.nit.trim(),
      startDate: formData.startDate,
      salary: formData.salary,
      paymentFrequency: formData.paymentFrequency,
      autorizacion: store.formData.autorizacion,
    }

    // Call server action
    const result = await submitStep1Form(formDataToSubmit)

    if (result.success) {
      // Check if we should skip step 2 (OTP validation)
      if (result.skipStep2 && result.approvedAmount !== undefined) {
        // Client already accepted terms (Code 24), cupo validated, skip to step 3
        console.log("⏭️ Skipping step 2 (OTP), going directly to step 3")
        store.updateFormData({
          approvedAmount: result.approvedAmount,
          idSolicitud: result.idSolicitud || "",
        })
        store.setLoading(false)
        await store.goToStepAsync(3)
      } else {
        // Normal flow: advance to next step (step 2)
        await store.nextStepAsync()
      }
    } else {
      // Use setErrorStep to analyze and decide where to go
      const errorType = result.errorType || "general"
      const errorMsg = result.error || "Error al procesar el formulario"
      store.setLoading(false)
      store.setErrorStep(errorType, errorMsg)
    }
  } catch (error) {
    console.error("Error submitting form:", error)
    const errorMsg = error instanceof Error ? error.message : "Error desconocido al enviar el formulario"
    store.setLoading(false)
    store.setErrorStep("general", errorMsg)
  }
}

/**
 * Handler for Step 2: Payment token validation and processing with PAQgo
 */
export async function handleStep2Submit(
  phone: string,
  token: string,
  store: Pick<WizardState, "goToStepAsync" | "updateFormData" | "setLoading" | "setErrorStep" | "formData" | "comercio">,
) {
  // Validate that comercio is available
  if (!store.comercio) {
    console.error("❌ Comercio not found in store")
    store.setLoading(false)
    store.setErrorStep("general", "Error: Comercio no encontrado")
    return
  }

  // Validate that requested amount is available
  if (!store.formData.requestedAmount || store.formData.requestedAmount <= 0) {
    console.error("❌ Requested amount not found")
    store.setLoading(false)
    store.setErrorStep("general", "Error: Monto no encontrado")
    return
  }

  // Activate global loader
  store.setLoading(true)

  try {
    // Prepare data for server action (PAQgo payment)
    const formDataToSubmit = {
      phone: phone.replace(/\s/g, ""),
      token: token,
      autorizacion: store.formData.autorizacion,
      usuario: store.comercio.user,
      password: store.comercio.password,
      rep_id: store.comercio.rep_id,
      requestedAmount: store.formData.requestedAmount,
    }

    // Call server action to process payment with PAQgo
    const result = await submitStep2Form(formDataToSubmit)

    if (result.success) {
      // Update transaction data from response
      store.updateFormData({
        approvedAmount: result.approvedAmount || store.formData.requestedAmount,
        transaccion: result.transaccion || null,
        codret: result.codret || null,
        hasCode99Flag: result.hasCode99Flag || false,
        token: token.replace(/\s/g, "").toUpperCase(), // Save the token entered by user
      })

      // If successful, go directly to step 4 (success/payment confirmation)
      store.setLoading(false)
      await store.goToStepAsync(4)
    } else {
      // Use setErrorStep to analyze and decide where to go
      const errorType = result.errorType || "token"
      const errorMsg = result.error || "Error procesando el pago"
      store.setLoading(false)
      store.setErrorStep(errorType, errorMsg)
    }
  } catch (error) {
    console.error("Error submitting payment:", error)
    const errorMsg = error instanceof Error ? error.message : "Unknown error processing payment"
    store.setLoading(false)
    store.setErrorStep("token", errorMsg)
  }
}

/**
 * Handler for resending payment token in Step 2
 * Uses emiteToken to regenerate the payment token
 */
export async function handleResendToken(
  phone: string,
  store: Pick<WizardState, "setLoading" | "setErrorStep" | "formData" | "comercio">,
  onSuccess?: () => void,
) {
  // Validate that comercio is available
  if (!store.comercio) {
    console.error("❌ Comercio not found in store")
    store.setLoading(false)
    store.setErrorStep("general", "Error: Comercio no encontrado")
    return
  }

  // Validate that we have the required data
  if (!store.formData.requestedAmount || store.formData.requestedAmount <= 0) {
    console.error("❌ Requested amount not found")
    store.setLoading(false)
    store.setErrorStep("general", "Error: Monto no encontrado")
    return
  }

  // Prevent resend if already processing
  store.setLoading(true)

  try {
    const cleanPhone = phone.replace(/\s/g, "")

    // Generate new reference for the resend
    const timestamp = Date.now().toString()
    const shortCode = timestamp.slice(-6)
    const referencia = `REF-${shortCode}`

    // Generate authorization if not exists
    const autorizacion = store.formData.autorizacion || generateAutorizacion()

    const formDataToSubmit = {
      phone: cleanPhone,
      requestedAmount: store.formData.requestedAmount,
      usuario: store.comercio.user,
      password: store.comercio.password,
      rep_id: store.comercio.rep_id,
      autorizacion: autorizacion,
    }

    // Call server action to emit token (same as step 0)
    const result = await submitStep0Form(formDataToSubmit)

    if (result.success) {
      console.log("✅ Token re-emitted successfully")
      // Reset countdown callback
      if (onSuccess) {
        onSuccess()
      }
    } else {
      // If error, go to fallback
      const errorType = result.errorType || "general"
      const errorMsg = result.error || "Error al reenviar el token de pago"
      console.error("❌ Error re-emitting token:", errorMsg)
      store.setLoading(false)
      store.setErrorStep(errorType, errorMsg)
    }
  } catch (error) {
    console.error("Error resending token:", error)
    const errorMsg = error instanceof Error ? error.message : "Unknown error resending token"
    store.setLoading(false)
    store.setErrorStep("token", errorMsg)
  } finally {
    store.setLoading(false)
  }
}


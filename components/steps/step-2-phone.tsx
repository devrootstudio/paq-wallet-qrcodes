"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useWizardStore } from "@/lib/store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ErrorTooltip } from "./step-1-form"
import { handleStep2Submit, handleResendToken } from "@/lib/step-handlers"

export default function Step2Phone() {
  const { formData, updateFormData, setLoading, setErrorStep, isLoading, nextStepAsync } = useWizardStore()
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState<string | null>(null)
  const [isTouched, setIsTouched] = useState(false)
  const [countdown, setCountdown] = useState(10) // 10 seconds countdown
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (isTouched) {
      validateOtp(otp)
    }
  }, [otp, isTouched])

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const validateOtp = (value: string) => {
    if (value.length !== 6) {
      setOtpError("El código debe tener 6 dígitos")
      return false
    }
    setOtpError(null)
    return true
  }

  const handleResendTokenClick = async () => {
    // Prevent resend if countdown is active or already resending
    if (countdown > 0 || isResending) {
      return
    }

    setIsResending(true)

    // Use centralized handler
    await handleResendToken(
      formData.phone,
      {
        setLoading,
        setErrorStep,
      },
      () => {
        // Reset countdown to 10 seconds on success
        setCountdown(10)
        setIsResending(false)
      },
    )

    setIsResending(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsTouched(true)

    // Validate OTP format first
    if (!validateOtp(otp)) {
      return
    }

    // Use centralized handler
    await handleStep2Submit(
      formData.phone,
      otp,
      {
        nextStepAsync,
        updateFormData,
        setLoading,
        setErrorStep,
      },
    )
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col justify-center min-h-[50vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-lg text-white text-center">
            Ingresa el código enviado por SMS al teléfono registrado:
          </label>
          <div className="relative">
            <Input
              placeholder="000000"
              type="text"
              maxLength={6}
              className={`h-14 text-lg tracking-widest text-center ${otpError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "")
                setOtp(val)
              }}
              autoFocus
            />
            {otpError && <ErrorTooltip message={otpError} />}
          </div>
        </div>

        <div className="flex flex-col gap-3 items-center">
          <Button type="submit" variant="paqPrimary" className="px-10 w-full max-w-xs" disabled={isLoading}>
            {isLoading ? "VALIDANDO..." : "ENVIAR"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="px-10 w-full max-w-xs bg-paq-yellow text-paq-green hover:bg-paq-yellow/90 border-paq-green font-semibold"
            onClick={handleResendTokenClick}
            disabled={countdown > 0 || isResending || isLoading}
          >
            {isResending
              ? "REENVIANDO..."
              : countdown > 0
                ? `Reenviar código (${countdown}s)`
                : "Reenviar código"}
          </Button>
        </div>
      </form>
    </div>
  )
}

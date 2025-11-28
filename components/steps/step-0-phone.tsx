"use client"

import type React from "react"
import { useState } from "react"
import { useWizardStore } from "@/lib/store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ErrorTooltip } from "./step-1-form"
import { handleStep0Submit } from "@/lib/step-handlers"

export default function Step0Phone() {
  const { updateFormData, setLoading, setErrorStep, isLoading, goToStepAsync, formData, comercio } = useWizardStore()
  const [phone, setPhone] = useState("")
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [amountError, setAmountError] = useState<string | null>(null)
  const [isTouched, setIsTouched] = useState(false)
  const [isAmountTouched, setIsAmountTouched] = useState(false)

  const validatePhone = (value: string) => {
    const cleanPhone = value.replace(/\s/g, "")
    if (cleanPhone.length !== 8) {
      setPhoneError("El teléfono debe tener 8 dígitos")
      return false
    }
    setPhoneError(null)
    return true
  }

  const validateAmount = (value: string) => {
    if (!value || value === "0.00" || value === "Q 0.00") {
      setAmountError("El monto es requerido")
      return false
    }
    const num = Number.parseFloat(value.replace(/[^\d.]/g, ""))
    if (isNaN(num) || num <= 0) {
      setAmountError("El monto debe ser mayor a Q0.00")
      return false
    }
    if (num < 1) {
      setAmountError("El monto mínimo es Q1.00")
      return false
    }
    setAmountError(null)
    return true
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 8) value = value.slice(0, 8)
    setPhone(value)
    if (isTouched) {
      validatePhone(value)
    }
  }

  const formatPhone = (value: string) => {
    if (!value) return ""
    const part1 = value.slice(0, 4)
    const part2 = value.slice(4, 8)
    let formatted = part1
    if (part2) formatted += " " + part2
    return formatted
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "")
    if (!val) {
      setAmount("")
      updateFormData({ requestedAmount: 0 })
      if (isAmountTouched) {
        validateAmount("")
      }
      return
    }
    const num = Number.parseInt(val, 10) / 100
    const formatted = num.toFixed(2)
    setAmount(formatted)
    updateFormData({ requestedAmount: num })
    if (isAmountTouched) {
      validateAmount(formatted)
    }
  }

  const formatAmountDisplay = (value: string) => {
    if (!value || value === "0.00") return "Q 0.00"
    const num = Number.parseFloat(value)
    if (isNaN(num)) return "Q 0.00"
    return new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency: "GTQ",
      minimumFractionDigits: 2,
    }).format(num)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsTouched(true)
    setIsAmountTouched(true)

    // Validate phone format first
    const isPhoneValid = validatePhone(phone)
    const isAmountValid = validateAmount(amount)

    if (!isPhoneValid || !isAmountValid) {
      return
    }

    // Verify that comercio is available
    if (!comercio) {
      setErrorStep("general", "Error: Comercio no encontrado. Por favor, recarga la página.")
      return
    }

    // Parse amount to number
    const amountNum = Number.parseFloat(amount)
    
    // Use centralized handler
    await handleStep0Submit(phone, amountNum, {
      updateFormData,
      setLoading,
      setErrorStep,
      goToStepAsync,
      formData,
      comercio,
    })
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col justify-center min-h-[50vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            Realiza tu pago
          </h1>
          <label className="block text-lg text-white text-center">
            Ingresa tu número de teléfono celular registrado en PAQ Wallet
          </label>
          <div className="relative">
            <Input
              placeholder="5201 8854"
              type="tel"
              maxLength={9}
              className={`h-14 text-lg tracking-widest text-center ${phoneError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              value={formatPhone(phone)}
              onChange={handlePhoneChange}
              onBlur={() => {
                setIsTouched(true)
                validatePhone(phone)
              }}
              autoFocus
            />
            {phoneError && <ErrorTooltip message={phoneError} />}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-lg text-white text-center">
            Ingresa el monto que deseas pagar
          </label>
          <div className="relative">
            <Input
              placeholder="Q 0.00"
              type="text"
              inputMode="numeric"
              className={`h-14 text-lg tracking-widest text-center ${amountError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              value={formatAmountDisplay(amount)}
              onChange={handleAmountChange}
              onBlur={() => {
                setIsAmountTouched(true)
                validateAmount(amount)
              }}
            />
            {amountError && <ErrorTooltip message={amountError} />}
          </div>
        </div>

        <div className="flex justify-center">
          <Button type="submit" variant="paqPrimary" className="px-10 w-full max-w-xs" disabled={isLoading}>
            {isLoading ? "ENVIANDO..." : "ENVIAR"}
          </Button>
        </div>
      </form>
    </div>
  )
}


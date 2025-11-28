"use client"

import { useEffect } from "react"
import { useWizardStore } from "@/lib/store"
import { Spinner } from "@/components/ui/spinner"
import Step0Phone from "@/components/steps/step-0-phone"
import Step1Form from "@/components/steps/step-1-form"
import Step2Phone from "@/components/steps/step-2-phone"
import Step3Approval from "@/components/steps/step-3-approval"
import Step4Success from "@/components/steps/step-4-success"
import Step5Error from "@/components/steps/step-5-error"
import type { Comercio } from "@/lib/comercios"

interface PosPageClientProps {
  comercio: Comercio
}

export default function PosPageClient({ comercio }: PosPageClientProps) {
  const { step, isLoading, setComercio, comercio: storeComercio } = useWizardStore()

  // Inicializar el comercio en el store de forma síncrona si no está ya inicializado
  if (!storeComercio || storeComercio.id !== comercio.id) {
    setComercio(comercio)
  }

  // También usar useEffect como respaldo para asegurar que se actualice si cambia
  useEffect(() => {
    setComercio(comercio)
  }, [comercio, setComercio])

  const renderStep = () => {
    switch (step) {
      case 0:
        return <Step0Phone />
      case 1:
        return <Step1Form />
      case 2:
        return <Step2Phone />
      case 3:
        return <Step3Approval />
      case 4:
        return <Step4Success />
      case 5:
        return <Step5Error />
      default:
        return <Step0Phone />
    }
  }

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-paq-green relative overflow-hidden">
      {/* Header con información del punto de venta - Card estilo Instagram */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-4 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-white/20 p-4 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              {/* Logo del comercio - foto de perfil circular con borde */}
              {comercio.logo ? (
                <div className="w-24 h-24 rounded-full border-4 border-paq-yellow overflow-hidden bg-white shadow-lg ring-4 ring-white/50">
                  <img
                    src={comercio.logo}
                    alt={`Logo de ${comercio.name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide image on error
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-paq-yellow bg-paq-yellow/20 flex items-center justify-center">
                  <span className="text-paq-yellow text-2xl font-bold">
                    {comercio.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* Información del punto de venta */}
              <div className="text-center">
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Punto de venta</p>
                <p className="text-gray-900 text-xl font-bold">{comercio.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`w-full max-w-md relative z-10 flex justify-center ${comercio.logo ? 'pt-40' : 'pt-36'}`}>{isLoading ? <Spinner /> : renderStep()}</div>
    </main>
  )
}


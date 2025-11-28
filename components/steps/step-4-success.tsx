"use client"

import { useWizardStore } from "@/lib/store"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Step4Success() {
  const { formData, comercio, goToStepAsync } = useWizardStore()

  const handleNewPayment = async () => {
    await goToStepAsync(0)
  }
  const currentDate = new Date()
  const formattedDate = currentDate.toLocaleDateString("es-GT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const formattedTime = currentDate.toLocaleTimeString("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col justify-center items-center min-h-[60vh] animate-in zoom-in-95 duration-500">
      {/* Success Message */}
      <div className="bg-white rounded-2xl p-6 w-full mb-4 mt-8 shadow-xl text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-paq-green leading-snug mb-2">
          ¡Pago Exitoso!
        </h2>
        <p className="text-gray-600 text-sm">
          Tu pago ha sido procesado correctamente
        </p>
      </div>

      {/* Digital Voucher */}
      <div className="bg-white rounded-2xl p-6 w-full shadow-xl border-2 border-gray-200">
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-1">VOUCHER DIGITAL</h3>
          <p className="text-xs text-gray-500">Conserve este comprobante</p>
        </div>

        <div className="space-y-4 border-t border-b border-gray-200 py-4">
          {/* Merchant Info */}
          {comercio && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Comercio</p>
              <p className="text-sm font-semibold text-gray-800">{comercio.name}</p>
            </div>
          )}

          {/* Transaction ID from emiteToken */}
          {formData.tokenTransactionId && (
            <div>
              <p className="text-xs text-gray-500 mb-1">ID de Transacción (Token)</p>
              <p className="text-sm font-mono font-bold text-paq-green">{formData.tokenTransactionId}</p>
            </div>
          )}

          {/* Transaction ID from PAQgo */}
          {formData.transaccion && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Número de Transacción (Pago)</p>
              <p className="text-sm font-mono font-bold text-paq-green">{formData.transaccion}</p>
            </div>
          )}

          {/* Response Code */}
          {formData.codret !== null && formData.codret !== undefined && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Código de Respuesta</p>
              <p className="text-sm font-mono font-bold text-gray-800">{formData.codret}</p>
            </div>
          )}

          {/* Amount */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Monto Pagado</p>
            <p className="text-2xl font-bold text-paq-green">Q{formData.requestedAmount?.toFixed(2) || "0.00"}</p>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Fecha</p>
              <p className="text-sm font-semibold text-gray-800">{formattedDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Hora</p>
              <p className="text-sm font-semibold text-gray-800">{formattedTime}</p>
            </div>
          </div>

          {/* Authorization */}
          {formData.autorizacion && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Autorización</p>
              <p className="text-xs font-mono text-gray-600">{formData.autorizacion}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Gracias por su compra
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Este comprobante es válido como recibo de pago
          </p>
        </div>
      </div>

      {/* Realizar otro pago button */}
      <div className="w-full mt-6 flex justify-center">
        <Button
          onClick={handleNewPayment}
          variant="paqPrimary"
          className="w-full max-w-xs"
        >
          Realizar otro pago
        </Button>
      </div>

      {/* Download App Section */}
      <div className="w-full mt-6">
        <p className="text-sm text-white font-semibold text-center mb-3">
          Descarga la App PAQ Wallet
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a
            href="https://apps.apple.com/gt/app/paq-wallet/id6450115741"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-black text-white rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors"
          >
            <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <div className="text-left">
              <div className="text-sm font-semibold leading-tight">App Store</div>
            </div>
          </a>

          <a
            href="https://play.google.com/store/apps/details?id=com.paqwallet.app&hl=es_419"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-black text-white rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors"
          >
            <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
            <div className="text-left">
              <div className="text-sm font-semibold leading-tight">Google Play</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

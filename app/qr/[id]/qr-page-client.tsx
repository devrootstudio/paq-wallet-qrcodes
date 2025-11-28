"use client"

import QRCode from 'react-qr-code'
import type { Comercio } from '@/lib/comercios'

interface QRCodePageClientProps {
  comercio: Comercio
  posUrl: string
}

export default function QRCodePageClient({ comercio, posUrl }: QRCodePageClientProps) {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-paq-green p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Header con información del comercio */}
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-white/20 p-6 mb-6">
          <div className="flex flex-col items-center gap-4">
            {/* Logo del comercio */}
            {comercio.logo ? (
              <div className="w-20 h-20 rounded-full border-4 border-paq-yellow overflow-hidden bg-white shadow-lg ring-4 ring-white/50">
                <img
                  src={comercio.logo}
                  alt={`Logo de ${comercio.name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-paq-yellow bg-paq-yellow/20 flex items-center justify-center">
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

        {/* QR Code con logo en el centro */}
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-white/20 p-8 flex flex-col items-center">
          <div className="relative inline-flex items-center justify-center">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg">
              <QRCode
                value={posUrl}
                size={280}
                level="H"
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>
            
            {/* Logo en el centro del QR - posicionado absolutamente */}
            {comercio.logo && (
              <div className="absolute bg-white rounded-full p-2 shadow-lg">
                <div className="w-16 h-16 rounded-full border-2 border-paq-yellow overflow-hidden bg-white">
                  <img
                    src={comercio.logo}
                    alt={`Logo de ${comercio.name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Instrucciones */}
          <div className="mt-6 text-center">
            <p className="text-gray-800 text-sm font-semibold mb-2">
              Escanea este código QR
            </p>
            <p className="text-gray-600 text-xs">
              Para realizar un pago rápido en {comercio.name}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}


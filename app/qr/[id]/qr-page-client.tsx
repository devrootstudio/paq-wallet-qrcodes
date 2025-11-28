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
            <p className="text-gray-800 text-base font-semibold mb-2">
              Escanea el QR y utiliza tu PAQ Wallet para pagar en este punto de venta
            </p>
          </div>
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
    </main>
  )
}


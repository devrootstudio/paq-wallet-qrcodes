"use client"

import Link from 'next/link'
import QRCode from 'react-qr-code'
import type { Comercio } from '@/lib/comercios'

interface ComercioCardProps {
  comercio: Comercio
  baseUrl: string
}

export default function ComercioCard({ comercio, baseUrl }: ComercioCardProps) {
  const qrUrl = `${baseUrl}/pos/${comercio.id}`
  
  return (
    <Link
      href={`/qr/${comercio.id}`}
      className="bg-white rounded-2xl shadow-xl border-2 border-white/20 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Logo del comercio */}
        {comercio.logo ? (
          <div className="w-24 h-24 rounded-full border-4 border-paq-yellow overflow-hidden bg-white shadow-lg ring-4 ring-white/50">
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
          <div className="w-24 h-24 rounded-full border-4 border-paq-yellow bg-paq-yellow/20 flex items-center justify-center">
            <span className="text-paq-yellow text-2xl font-bold">
              {comercio.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Nombre del comercio */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{comercio.name}</h2>
          <p className="text-gray-500 text-sm">Punto de venta</p>
        </div>

        {/* Mini QR Preview */}
        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
          <div className="relative inline-block w-[120px] h-[120px] flex items-center justify-center">
            <QRCode
              value={qrUrl}
              size={120}
              level="H"
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
            {comercio.logo && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1 shadow-md z-10">
                <div className="w-8 h-8 rounded-full border border-paq-yellow overflow-hidden bg-white">
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
        </div>

        {/* Link text */}
        <p className="text-paq-green text-sm font-semibold mt-2">
          Ver código QR →
        </p>
      </div>
    </Link>
  )
}


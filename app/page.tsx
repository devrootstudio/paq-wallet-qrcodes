import { headers } from 'next/headers'
import { getComercios } from '@/lib/comercios'
import ComercioCard from '@/app/comercio-card'

export default async function Home() {
  const comercios = await getComercios()
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
  
  return (
    <main className="min-h-screen w-full bg-paq-green p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-white mb-2">PAQ Wallet QR Codes</h1>
          <p className="text-white/80 text-lg">
            Selecciona un comercio para ver su código QR
          </p>
        </div>

        {/* Listado de comercios */}
        {comercios.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <p className="text-gray-600">No hay comercios disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comercios.map((comercio) => (
              <ComercioCard
                key={comercio.id}
                comercio={comercio}
                baseUrl={baseUrl}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

import { headers } from 'next/headers'
import { getComercios, type Comercio } from '@/lib/comercios'
import ComercioCard from '@/app/comercio-card'

async function getBaseUrl(): Promise<string> {
  // Priority: NEXT_PUBLIC_BASE_URL > VERCEL_URL > headers().get('host')
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Try to get from headers
  try {
    const headersList = await headers()
    const host = headersList.get('host')
    if (host) {
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      return `${protocol}://${host}`
    }
  } catch (error) {
    console.warn('Could not get headers:', error)
  }
  
  // Fallback
  return process.env.NODE_ENV === 'production' 
    ? 'https://paq-wallet-qrcodes-mhzp.vercel.app'
    : 'http://localhost:3000'
}

export default async function Home() {
  let comercios: Comercio[] = []
  let baseUrl = await getBaseUrl()
  
  try {
    comercios = await getComercios()
  } catch (error) {
    console.error('Error loading comercios:', error)
    // Continue rendering even if there's an error
  }
  
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
            <p className="text-gray-400 text-sm mt-2">
              Verifica que las variables de entorno estén configuradas correctamente.
            </p>
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

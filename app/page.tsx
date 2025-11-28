import { redirect } from 'next/navigation'

export default function Home() {
  // Redirigir a una página de instrucciones o mostrar un mensaje
  // Por ahora, mostramos un mensaje indicando que se requiere un ID
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-paq-green relative overflow-hidden">
      <div className="w-full max-w-lg relative z-10 flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">PAQ Wallet QR Codes</h1>
          <p className="text-white/80">
            Para acceder al sistema de pago, escanea el código QR del comercio.
          </p>
          <p className="text-white/60 text-sm">
            La URL debe tener el formato: /pos/[id]
          </p>
        </div>
      </div>
    </main>
  )
}

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-paq-green relative overflow-hidden">
      <div className="w-full max-w-lg relative z-10 flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">404</h1>
          <h2 className="text-2xl font-semibold text-white">Comercio no encontrado</h2>
          <p className="text-white/80">
            El comercio que estás buscando no existe o ha sido eliminado.
          </p>
        </div>
        <Button asChild variant="outline" className="bg-white text-paq-green hover:bg-white/90">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </main>
  )
}


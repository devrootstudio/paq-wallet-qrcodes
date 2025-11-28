export default function NotFound() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-paq-green p-4">
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-white/20 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">QR Code no encontrado</h1>
          <p className="text-gray-600">
            El código QR solicitado no existe o ha sido eliminado.
          </p>
        </div>
      </div>
    </main>
  )
}


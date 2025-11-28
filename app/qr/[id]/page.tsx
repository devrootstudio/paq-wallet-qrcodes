import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getComercioById } from '@/lib/comercios'
import QRCodePageClient from './qr-page-client'

interface QRPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: QRPageProps): Promise<Metadata> {
  const { id } = await params
  const comercio = await getComercioById(id)
  
  if (!comercio) {
    return {
      title: 'QR Code no encontrado',
    }
  }
  
  return {
    title: `QR Code - ${comercio.name}`,
    description: `Escanea el código QR para realizar un pago en ${comercio.name}`,
  }
}

export default async function QRPage({ params }: QRPageProps) {
  const { id } = await params
  
  // Validar que el comercio existe
  const comercio = await getComercioById(id)
  
  if (!comercio) {
    notFound()
  }
  
  // Generar la URL del POS (usar URL absoluta para que funcione al escanear)
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
  const posUrl = `${baseUrl}/pos/${id}`
  
  return <QRCodePageClient comercio={comercio} posUrl={posUrl} />
}


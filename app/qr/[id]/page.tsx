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
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  
  if (!baseUrl) {
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    } else {
      try {
        const headersList = await headers()
        const host = headersList.get('host')
        if (host) {
          const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
          baseUrl = `${protocol}://${host}`
        } else {
          baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://paq-wallet-qrcodes-mhzp.vercel.app'
            : 'http://localhost:3000'
        }
      } catch (error) {
        baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://paq-wallet-qrcodes-mhzp.vercel.app'
          : 'http://localhost:3000'
      }
    }
  }
  
  const posUrl = `${baseUrl}/pos/${id}`
  
  return <QRCodePageClient comercio={comercio} posUrl={posUrl} />
}


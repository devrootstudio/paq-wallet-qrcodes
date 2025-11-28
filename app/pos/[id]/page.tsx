import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getComercioById } from '@/lib/comercios'
import PosPageClient from './pos-page-client'

interface PosPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: PosPageProps): Promise<Metadata> {
  const { id } = await params
  const comercio = await getComercioById(id)
  
  if (!comercio) {
    return {
      title: 'Comercio no encontrado',
    }
  }
  
  return {
    title: `Punto de venta - ${comercio.name}`,
    description: `Solicita tu adelanto de salario en ${comercio.name}`,
  }
}

export default async function PosPage({ params }: PosPageProps) {
  const { id } = await params
  
  // Validar que el comercio existe
  const comercio = await getComercioById(id)
  
  if (!comercio) {
    notFound()
  }
  
  return <PosPageClient comercio={comercio} />
}


import Airtable from 'airtable'

// Airtable configuration from environment variables
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || ''
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appJiK2dDSL1lv9bd'
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'tblVsy8Ux7EIqGvja'

// Initialize Airtable base
const base = AIRTABLE_API_KEY ? new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID) : null

export interface Comercio {
  name: string
  user: string
  rep_id: string
  password: string
  id: string
  logo?: string // URL del logo desde Airtable
}

let comerciosCache: Comercio[] | null = null

/**
 * Obtiene todos los comercios desde Airtable
 * Usa caché para evitar múltiples llamadas a la API
 */
export async function getComercios(): Promise<Comercio[]> {
  if (comerciosCache) {
    return comerciosCache
  }

  if (!base) {
    console.error('❌ Airtable API key not configured. Set AIRTABLE_API_KEY environment variable.')
    return []
  }

  try {
    console.log('📡 Fetching comercios from Airtable...')
    const records = await base(AIRTABLE_TABLE_ID).select({
      view: 'viwOKqNS5VIDVydWK', // Optional: specify view
    }).all()

    const comercios: Comercio[] = records.map((record) => {
      const fields = record.fields as any
      
      // Handle logo - Airtable attachments come as arrays of objects with url property
      let logoUrl: string | undefined = undefined
      if (fields['logo']) {
        if (Array.isArray(fields['logo']) && fields['logo'].length > 0) {
          // Airtable attachment format: [{ url: "...", filename: "...", ... }]
          logoUrl = fields['logo'][0]?.url || fields['logo'][0]
        } else if (typeof fields['logo'] === 'string') {
          // If it's already a string URL
          logoUrl = fields['logo']
        }
      }
      
      return {
        id: fields['uid'] || record.id || '',
        name: fields['pos-name'] || '',
        user: fields['user'] || '',
        password: fields['password'] || '',
        rep_id: fields['rep-id'] || '',
        logo: logoUrl,
      }
    }).filter(comercio => comercio.id && comercio.name) // Filter out invalid records

    console.log(`✅ Loaded ${comercios.length} comercios from Airtable`)
    comerciosCache = comercios
    return comercios
  } catch (error) {
    console.error('❌ Error fetching comercios from Airtable:', error)
    return []
  }
}

/**
 * Busca un comercio por su ID (uid en Airtable)
 */
export async function getComercioById(id: string): Promise<Comercio | null> {
  if (!base) {
    console.error('❌ Airtable API key not configured.')
    return null
  }

  try {
    // Try cache first
    if (comerciosCache) {
      const cached = comerciosCache.find(comercio => comercio.id === id)
      if (cached) return cached
    }

    // If not in cache, fetch from Airtable
    const records = await base(AIRTABLE_TABLE_ID)
      .select({
        filterByFormula: `{uid} = "${id}"`,
        maxRecords: 1,
      })
      .firstPage()

    if (records.length === 0) {
      return null
    }

    const record = records[0]
    const fields = record.fields as any
    
    // Handle logo - Airtable attachments come as arrays of objects with url property
    let logoUrl: string | undefined = undefined
    if (fields['logo']) {
      if (Array.isArray(fields['logo']) && fields['logo'].length > 0) {
        // Airtable attachment format: [{ url: "...", filename: "...", ... }]
        logoUrl = fields['logo'][0]?.url || fields['logo'][0]
      } else if (typeof fields['logo'] === 'string') {
        // If it's already a string URL
        logoUrl = fields['logo']
      }
    }
    
    const comercio: Comercio = {
      id: fields['uid'] || record.id || '',
      name: fields['pos-name'] || '',
      user: fields['user'] || '',
      password: fields['password'] || '',
      rep_id: fields['rep-id'] || '',
      logo: logoUrl,
    }

    return comercio
  } catch (error) {
    console.error('❌ Error fetching comercio from Airtable:', error)
    return null
  }
}

/**
 * Limpia la caché (útil para desarrollo o cuando se actualiza Airtable)
 */
export function clearComerciosCache() {
  comerciosCache = null
}


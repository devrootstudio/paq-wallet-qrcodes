import Airtable from 'airtable'
import type { ComercioInternal } from './comercios'

// Airtable configuration from environment variables
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || ''
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appJiK2dDSL1lv9bd'
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'tblVsy8Ux7EIqGvja'

// Initialize Airtable base
const base = AIRTABLE_API_KEY ? new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID) : null

let comerciosCache: ComercioInternal[] | null = null

/**
 * Server-side only: Gets full comercio data including sensitive credentials
 * This should NEVER be exposed to the client
 */
export async function getComercioByIdServer(id: string): Promise<ComercioInternal | null> {
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
        logoUrl = fields['logo'][0]?.url || fields['logo'][0]
      } else if (typeof fields['logo'] === 'string') {
        logoUrl = fields['logo']
      }
    }
    
    const comercio: ComercioInternal = {
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
 * Server-side only: Loads all comercios with sensitive data for caching
 */
export async function loadComerciosCache(): Promise<void> {
  if (!base) {
    console.error('❌ Airtable API key not configured.')
    return
  }

  if (comerciosCache) {
    return // Already cached
  }

  try {
    console.log('📡 Loading comercios cache (server-side)...')
    const records = await base(AIRTABLE_TABLE_ID).select({
      view: 'viwOKqNS5VIDVydWK',
    }).all()

    comerciosCache = records.map((record) => {
      const fields = record.fields as any
      
      let logoUrl: string | undefined = undefined
      if (fields['logo']) {
        if (Array.isArray(fields['logo']) && fields['logo'].length > 0) {
          logoUrl = fields['logo'][0]?.url || fields['logo'][0]
        } else if (typeof fields['logo'] === 'string') {
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
    }).filter(comercio => comercio.id && comercio.name)

    console.log(`✅ Loaded ${comerciosCache.length} comercios to cache`)
  } catch (error) {
    console.error('❌ Error loading comercios cache:', error)
  }
}


import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Check localStorage first, then fall back to env variables
const getSupabaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('supabase_url')
    if (stored) return stored
  }
  return process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

const getSupabaseAnonKey = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('supabase_anon_key')
    if (stored) return stored
  }
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

let supabaseInstance: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient => {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  
  if (!supabaseInstance && url && key) {
    supabaseInstance = createClient(url, key)
  }
  
  return supabaseInstance || createClient('https://placeholder.supabase.co', 'placeholder')
}

export const reinitializeSupabase = (): SupabaseClient => {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  
  if (url && key) {
    supabaseInstance = createClient(url, key)
  }
  
  return supabaseInstance || createClient('https://placeholder.supabase.co', 'placeholder')
}

export const isConfigured = (): boolean => {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  return Boolean(url && key && url !== '' && key !== '')
}

// Server-side Supabase client (for API routes)
export const createServerSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, key)
}

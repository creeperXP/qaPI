import { createClient } from '@supabase/supabase-js'

// Vite exposes env vars prefixed with VITE_ via import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Optional helper to quickly validate connection from the browser/devtools
export async function testConnection() {
  try {
    const { data, error } = await supabase.rpc('version')
    // 'version' rpc may not exist; fallback to a safe table check
    if (error) {
      // try simple table list or a small query
      const tbl = await supabase.from('products_v1').select('id').limit(1)
      return { ok: !tbl.error, sample: tbl.data }
    }
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

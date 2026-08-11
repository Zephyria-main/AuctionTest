import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function requireAdminForExport(): Promise<{ ok: true } | { ok: false; status: number }> {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401 }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { ok: false, status: 403 }

  return { ok: true }
}

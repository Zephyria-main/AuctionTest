import 'server-only'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/** Redirects to /login unless the current user's profile has role = 'admin'. */
export async function requireAdmin() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/admin')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  return { userId: user.id, fullName: profile.full_name }
}

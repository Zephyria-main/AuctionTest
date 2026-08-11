'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/adminGuard'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function updateAuctionSettings(formData: FormData) {
  const admin = await requireAdmin()
  const supabaseAdmin = createAdminSupabaseClient()

  const extensionsEnabled = formData.get('extensionsEnabled') === 'on'
  const extensionTriggerMinutes = Number(formData.get('extensionTriggerMinutes'))
  const extensionMinutes = Number(formData.get('extensionMinutes'))

  const { error } = await supabaseAdmin
    .from('auction_settings')
    .update({
      extensions_enabled: extensionsEnabled,
      extension_trigger_minutes: extensionTriggerMinutes,
      extension_minutes: extensionMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true)

  if (error) throw new Error(error.message)

  await supabaseAdmin.from('audit_log').insert({
    actor_id: admin.userId,
    action: 'auction_settings_updated',
    target_type: 'auction_settings',
    metadata: { extensionsEnabled, extensionTriggerMinutes, extensionMinutes },
  })

  revalidatePath('/admin/settings')
}

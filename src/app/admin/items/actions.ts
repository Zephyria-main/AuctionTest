'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminGuard'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { dollarsToCents } from '@/lib/money'

interface ItemFormFields {
  title: string
  shortDescription: string
  fullDescription: string
  donorName: string
  estimatedValueDollars: string
  openingBidDollars: string
  minIncrementDollars: string
  closingTime: string
  extensionsEnabled: 'inherit' | 'true' | 'false'
  extensionTriggerMinutes: string
  extensionMinutes: string
  displayOrder: string
}

function parseFormFields(formData: FormData): ItemFormFields {
  return {
    title: String(formData.get('title') ?? ''),
    shortDescription: String(formData.get('shortDescription') ?? ''),
    fullDescription: String(formData.get('fullDescription') ?? ''),
    donorName: String(formData.get('donorName') ?? ''),
    estimatedValueDollars: String(formData.get('estimatedValueDollars') ?? '0'),
    openingBidDollars: String(formData.get('openingBidDollars') ?? '0'),
    minIncrementDollars: String(formData.get('minIncrementDollars') ?? '0'),
    closingTime: String(formData.get('closingTime') ?? ''),
    extensionsEnabled: (formData.get('extensionsEnabled') as ItemFormFields['extensionsEnabled']) ?? 'inherit',
    extensionTriggerMinutes: String(formData.get('extensionTriggerMinutes') ?? ''),
    extensionMinutes: String(formData.get('extensionMinutes') ?? ''),
    displayOrder: String(formData.get('displayOrder') ?? '0'),
  }
}

function toRow(fields: ItemFormFields) {
  return {
    title: fields.title,
    short_description: fields.shortDescription,
    full_description: fields.fullDescription,
    donor_name: fields.donorName,
    estimated_value_cents: dollarsToCents(Number(fields.estimatedValueDollars)),
    opening_bid_cents: dollarsToCents(Number(fields.openingBidDollars)),
    min_increment_cents: dollarsToCents(Number(fields.minIncrementDollars)),
    closing_time: new Date(fields.closingTime).toISOString(),
    extensions_enabled: fields.extensionsEnabled === 'inherit' ? null : fields.extensionsEnabled === 'true',
    extension_trigger_minutes: fields.extensionTriggerMinutes ? Number(fields.extensionTriggerMinutes) : null,
    extension_minutes: fields.extensionMinutes ? Number(fields.extensionMinutes) : null,
    display_order: Number(fields.displayOrder) || 0,
  }
}

export async function createItem(formData: FormData) {
  const admin = await requireAdmin()
  const supabaseAdmin = createAdminSupabaseClient()
  const fields = parseFormFields(formData)

  const { data, error } = await supabaseAdmin.from('items').insert(toRow(fields)).select('id').single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create item')

  await supabaseAdmin.from('audit_log').insert({
    actor_id: admin.userId,
    action: 'item_created',
    target_type: 'item',
    target_id: data.id,
    metadata: { title: fields.title },
  })

  revalidatePath('/admin/items')
  redirect(`/admin/items/${data.id}/edit`)
}

export async function updateItem(itemId: string, formData: FormData) {
  const admin = await requireAdmin()
  const supabaseAdmin = createAdminSupabaseClient()
  const fields = parseFormFields(formData)

  const { error } = await supabaseAdmin.from('items').update(toRow(fields)).eq('id', itemId)
  if (error) throw new Error(error.message)

  await supabaseAdmin.from('audit_log').insert({
    actor_id: admin.userId,
    action: 'item_updated',
    target_type: 'item',
    target_id: itemId,
    metadata: { title: fields.title },
  })

  revalidatePath('/admin/items')
  revalidatePath(`/admin/items/${itemId}/edit`)
}

export async function setItemStatus(itemId: string, status: 'draft' | 'open' | 'paused' | 'closed', reason: string) {
  await requireAdmin()
  // Uses the signed-in admin's own session (not the service-role client) so
  // the admin_set_item_status() function's is_admin()/auth.uid() check —
  // the same check that protects it from a non-admin caller — applies here too.
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.rpc('admin_set_item_status', {
    p_item_id: itemId,
    p_status: status,
    p_reason: reason,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/items')
  revalidatePath('/admin')
}

export async function addItemImage(itemId: string, storagePath: string, altText: string) {
  await requireAdmin()
  const supabaseAdmin = createAdminSupabaseClient()
  const { error } = await supabaseAdmin.from('item_images').insert({ item_id: itemId, storage_path: storagePath, alt_text: altText })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/items/${itemId}/edit`)
}

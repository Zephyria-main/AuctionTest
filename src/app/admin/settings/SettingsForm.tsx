'use client'

import { useFormStatus } from 'react-dom'
import { updateAuctionSettings } from './actions'
import type { Database } from '@/types/database'

type Settings = Database['public']['Tables']['auction_settings']['Row']

export function SettingsForm({ settings }: { settings: Settings }) {
  return (
    <form action={updateAuctionSettings} className="mt-6 flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-5">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="extensionsEnabled" defaultChecked={settings.extensions_enabled} className="focus-ring" />
        Enable closing-time extensions by default
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Trigger window (minutes before close)
        <input
          type="number"
          name="extensionTriggerMinutes"
          min={0}
          defaultValue={settings.extension_trigger_minutes}
          className="focus-ring rounded-lg border border-neutral-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Extension length (minutes)
        <input
          type="number"
          name="extensionMinutes"
          min={1}
          defaultValue={settings.extension_minutes}
          className="focus-ring rounded-lg border border-neutral-300 px-3 py-2"
        />
      </label>

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring w-fit rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save settings'}
    </button>
  )
}

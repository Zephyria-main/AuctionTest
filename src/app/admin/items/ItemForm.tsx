'use client'

import { useFormStatus } from 'react-dom'

export interface ItemFormValues {
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

export function ItemForm({ action, initial }: { action: (formData: FormData) => void; initial?: Partial<ItemFormValues> }) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField label="Title" name="title" defaultValue={initial?.title} required />
      <TextField label="Short description (catalogue card)" name="shortDescription" defaultValue={initial?.shortDescription} required />
      <TextAreaField label="Full description (item page)" name="fullDescription" defaultValue={initial?.fullDescription} required />
      <TextField label="Donor name" name="donorName" defaultValue={initial?.donorName} required />

      <div className="grid grid-cols-3 gap-3">
        <TextField label="Estimated value (AUD)" name="estimatedValueDollars" type="number" step="0.01" defaultValue={initial?.estimatedValueDollars} required />
        <TextField label="Opening bid (AUD)" name="openingBidDollars" type="number" step="0.01" defaultValue={initial?.openingBidDollars} required />
        <TextField label="Minimum increment (AUD)" name="minIncrementDollars" type="number" step="0.01" defaultValue={initial?.minIncrementDollars} required />
      </div>

      <TextField label="Closing time (Sydney)" name="closingTime" type="datetime-local" defaultValue={initial?.closingTime} required />

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Closing extensions
          <select name="extensionsEnabled" defaultValue={initial?.extensionsEnabled ?? 'inherit'} className="focus-ring rounded-lg border border-neutral-300 px-3 py-2">
            <option value="inherit">Use auction default</option>
            <option value="true">Enabled for this item</option>
            <option value="false">Disabled for this item</option>
          </select>
        </label>
        <TextField label="Trigger window (minutes)" name="extensionTriggerMinutes" type="number" defaultValue={initial?.extensionTriggerMinutes} placeholder="Default" />
        <TextField label="Extension length (minutes)" name="extensionMinutes" type="number" defaultValue={initial?.extensionMinutes} placeholder="Default" />
      </div>

      <TextField label="Display order" name="displayOrder" type="number" defaultValue={initial?.displayOrder ?? '0'} />

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
      {pending ? 'Saving...' : 'Save item'}
    </button>
  )
}

function TextField(props: {
  label: string
  name: string
  type?: string
  step?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
      {props.label}
      <input
        name={props.name}
        type={props.type ?? 'text'}
        step={props.step}
        defaultValue={props.defaultValue}
        placeholder={props.placeholder}
        required={props.required}
        className="focus-ring rounded-lg border border-neutral-300 px-3 py-2 text-base"
      />
    </label>
  )
}

function TextAreaField(props: { label: string; name: string; defaultValue?: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
      {props.label}
      <textarea
        name={props.name}
        defaultValue={props.defaultValue}
        required={props.required}
        rows={4}
        className="focus-ring rounded-lg border border-neutral-300 px-3 py-2 text-base"
      />
    </label>
  )
}

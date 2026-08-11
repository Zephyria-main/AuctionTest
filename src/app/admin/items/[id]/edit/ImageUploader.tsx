'use client'

import { useState, useTransition, type ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { itemImageUrl } from '@/lib/storage'
import { addItemImage } from '../../actions'

interface ExistingImage {
  id: string
  storage_path: string
  alt_text: string
}

export function ImageUploader({ itemId, existingImages }: { itemId: string; existingImages: ExistingImage[] }) {
  const [images, setImages] = useState(existingImages)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')

    try {
      const supabase = createClient()
      const path = `${itemId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from('item-images').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadError) throw uploadError

      startTransition(async () => {
        await addItemImage(itemId, path, file.name)
        setImages((prev) => [...prev, { id: path, storage_path: path, alt_text: file.name }])
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded images from Supabase Storage, intentionally not using next/image */}
            <img src={itemImageUrl(img.storage_path)} alt={img.alt_text} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>

      <label className="focus-ring mt-3 inline-block cursor-pointer rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
        {uploading ? 'Uploading...' : 'Upload image'}
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
      </label>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  )
}

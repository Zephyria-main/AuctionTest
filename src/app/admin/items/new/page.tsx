import { ItemForm } from '../ItemForm'
import { createItem } from '../actions'

export default function NewItemPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-neutral-900">Add item</h1>
      <p className="mt-1 text-sm text-neutral-600">
        New items are created as drafts. Open them from the Items list when ready.
      </p>
      <div className="mt-6">
        <ItemForm action={createItem} />
      </div>
    </div>
  )
}

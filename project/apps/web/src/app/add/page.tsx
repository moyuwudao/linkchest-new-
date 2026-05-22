'use client'

import { Suspense } from 'react'
import CollectionForm from '@/components/CollectionForm'

export default function AddPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollectionForm mode="add" />
    </Suspense>
  )
}
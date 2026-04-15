import { Suspense } from 'react'
import ConfirmacionClient from './ConfirmacionClient'

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
      </div>
    }>
      <ConfirmacionClient />
    </Suspense>
  )
}

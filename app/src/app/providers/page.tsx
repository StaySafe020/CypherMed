'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/store/authStore'
import { getPatientWithGrants, type ProviderGrant } from '@/lib/api'

export default function ProvidersPage() {
  const router = useRouter()
  const { isAuthenticated, walletAddress } = useAuthStore()
  const [providers, setProviders] = useState<ProviderGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (!walletAddress) return

    getPatientWithGrants(walletAddress)
      .then((patient) => setProviders(patient.AccessGrantOffchain || []))
      .catch(() => setError('Failed to load provider access grants'))
      .finally(() => setLoading(false))
  }, [isAuthenticated, walletAddress, router])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="/cyphermed-logo.png"
              alt="CypherMed Logo"
              width={32}
              height={32}
              className="rounded"
            />
            <span className="text-xl font-semibold text-gray-900">CypherMed</span>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-gray-900">Manage Provider Access</h2>
          <p className="text-gray-600 mt-1">View and control provider permissions</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading providers...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="border border-gray-200 rounded-lg p-12 text-center bg-gray-50">
            <p className="text-gray-600 mb-6">No providers have access yet</p>
            <Link href="/access-requests">
              <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                Review Access Requests
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map((provider: any) => (
              <div key={provider.id} className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{provider.provider}</h3>
                    <p className="text-sm text-gray-600">{provider.role}</p>
                  </div>
                  <button
                    disabled
                    className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                  >
                    Revoke
                  </button>
                </div>

                <div className="text-sm text-gray-600">
                  <p>Granted: {new Date(provider.grantedAt).toLocaleDateString()}</p>
                  <p>Allowed Types: {provider.allowedTypes}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

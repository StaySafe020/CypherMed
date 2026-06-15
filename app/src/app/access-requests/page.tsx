'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/store/authStore'
import { getAccessRequests, approveAccessRequest, denyAccessRequest } from '@/lib/api'

export default function AccessRequestsPage() {
  const router = useRouter()
  const { isAuthenticated, walletAddress } = useAuthStore()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (!walletAddress) return

    getAccessRequests(walletAddress)
      .then((data) => setRequests(data))
      .catch(() => setError('Failed to load access requests'))
      .finally(() => setLoading(false))
  }, [isAuthenticated, walletAddress, router])

  const handleApprove = async (id: string) => {
    await approveAccessRequest(id)
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'approved' } : r))
  }

  const handleDeny = async (id: string) => {
    await denyAccessRequest(id)
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'denied' } : r))
  }

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
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-gray-900">Access Requests</h2>
          <p className="text-gray-600 mt-1">Review and manage access requests from providers</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {['all', 'pending', 'approved', 'denied'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Empty State */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="border border-gray-200 rounded-lg p-12 text-center bg-gray-50">
            <p className="text-gray-600">No access requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests
              .filter((req) => statusFilter === 'all' || req.status === statusFilter)
              .map((req: any) => (
              <div key={req.id} className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{req.requester}</h3>
                    <p className="text-sm text-gray-600">{req.role}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    req.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : req.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4">{req.reason}</p>

                {req.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(req.id)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

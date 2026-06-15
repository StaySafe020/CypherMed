'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/store/authStore'
import { getRecordById, type MedicalRecord } from '@/lib/api'

export default function RecordDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { isAuthenticated, walletAddress } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<MedicalRecord | null>(null)

  const recordId = params.id as string

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (!walletAddress) return

    getRecordById(recordId, walletAddress)
      .then((data) => setRecord(data))
      .catch(() => setError('Failed to load record'))
      .finally(() => setLoading(false))
  }, [isAuthenticated, walletAddress, router, recordId])

  if (loading) return <div className="text-center py-12">Loading...</div>
  if (error) return <div className="text-center py-12 text-red-700">{error}</div>
  if (!record) return <div className="text-center py-12">Record not found</div>

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
          <Link href="/records">
            <button className="text-gray-600 hover:text-gray-900 font-medium">← Back</button>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Record Header */}
        <div className="border border-gray-200 rounded-lg p-8 mb-8 bg-white">
          <div className="mb-6">
            <h2 className="text-3xl font-semibold text-gray-900">{record.recordType}</h2>
            <p className="text-gray-600 mt-2">Created {new Date(record.createdAt).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2 break-all">Hash: {record.dataHash}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Edit
            </button>
            <button className="px-4 py-2 border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors text-sm">
              Delete
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Download
            </button>
          </div>
        </div>

        {/* Access Info */}
        <div className="border border-gray-200 rounded-lg p-8 bg-white">
          <h3 className="font-semibold text-gray-900 mb-4">Access</h3>
          <p className="text-sm text-gray-600 mb-4">No one has access to this record yet.</p>
          <Link href="/access-requests">
            <button className="text-blue-600 hover:underline font-medium text-sm">
              Share with provider →
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { getRecords, type MedicalRecord } from '@/lib/api'

export default function RecordsPage() {
  const router = useRouter()
  const { isAuthenticated, walletAddress } = useAuthStore()
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (!walletAddress) return

    getRecords(walletAddress)
      .then((data) => setRecords(data))
      .catch(() => setError('Failed to load records'))
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
          <Link href="/records/create">
            <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm">
              + New Record
            </button>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-gray-900">Medical Records</h2>
          <p className="text-gray-600 mt-1">All of your medical records in one place</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="border border-gray-200 rounded-lg p-12 text-center bg-gray-50">
            <p className="text-gray-600 mb-6">No records yet</p>
            <Link href="/records/create">
              <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                Create Your First Record
              </button>
            </Link>
          </div>
        ) : (
          <div>
            {/* Filters */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {['all', 'General', 'Prescription', 'LabResult', 'VisitSummary'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Records List */}
            <div className="space-y-3">
              {records
                .filter((record) => filterType === 'all' || record.recordType === filterType)
                .map((record) => (
                <Link key={record.id} href={`/records/${record.id}`}>
                  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{record.recordType}</h3>
                        <p className="text-sm text-gray-600 mt-1">Created: {new Date(record.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

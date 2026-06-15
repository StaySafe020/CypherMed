'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/store/authStore'
import { useWalletAuth } from '@/hooks/useWalletAuth'
import { getRecords, getAccessRequests, getNotifications, type Notification } from '@/lib/api'

interface Stats {
  recordCount: number
  pendingRequests: number
  recentNotifications: Notification[]
}

export default function DashboardPage() {
  const router = useRouter()
  const { walletAddress, isAuthenticated } = useAuthStore()
  const { logout } = useWalletAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({ recordCount: 0, pendingRequests: 0, recentNotifications: [] })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (!walletAddress) return

    Promise.all([
      getRecords(walletAddress).catch(() => []),
      getAccessRequests(walletAddress).catch(() => []),
      getNotifications(walletAddress).catch(() => []),
    ]).then(([records, requests, notifications]) => {
      setStats({
        recordCount: records.length,
        pendingRequests: requests.filter((r: any) => r.status === 'pending').length,
        recentNotifications: (notifications as Notification[]).slice(0, 3),
      })
      setLoading(false)
    })
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
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-500 font-mono">{walletAddress?.substring(0, 12)}...</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Welcome Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-semibold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Manage your medical records and permissions</p>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <Link href="/records/create">
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer bg-white">
              <div className="w-10 h-10 bg-blue-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-lg">+</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">New Record</h3>
              <p className="text-sm text-gray-600">Add medical record</p>
            </div>
          </Link>

          <Link href="/access-requests">
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer bg-white">
              <div className="w-10 h-10 bg-green-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-lg">✓</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Requests</h3>
              <p className="text-sm text-gray-600">Access requests</p>
            </div>
          </Link>

          <Link href="/records">
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer bg-white">
              <div className="w-10 h-10 bg-purple-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-lg">📄</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Records</h3>
              <p className="text-sm text-gray-600">View all records</p>
            </div>
          </Link>

          <Link href="/providers">
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer bg-white">
              <div className="w-10 h-10 bg-orange-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-lg">👥</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Access</h3>
              <p className="text-sm text-gray-600">Manage access</p>
            </div>
          </Link>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <p className="text-3xl font-bold text-gray-900">{stats.recordCount}</p>
              <p className="text-sm text-gray-600 mt-1">Medical Records</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <p className="text-3xl font-bold text-yellow-600">{stats.pendingRequests}</p>
              <p className="text-sm text-gray-600 mt-1">Pending Requests</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <p className="text-3xl font-bold text-blue-600">{stats.recentNotifications.length}</p>
              <p className="text-sm text-gray-600 mt-1">New Notifications</p>
            </div>
          </div>
        )}

        {/* Recent Notifications */}
        {!loading && stats.recentNotifications.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {stats.recentNotifications.map((n) => (
                <div key={n.id} className="border border-gray-200 rounded-lg p-4 bg-white flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-sm text-blue-900">
            All your medical records are encrypted and secure. You have complete control over who accesses your data.
          </p>
        </div>
      </div>
    </div>
  )
}

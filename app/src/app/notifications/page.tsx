'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/store/authStore'
import { getNotifications, markNotificationRead, type Notification } from '@/lib/api'

export default function NotificationsPage() {
  const router = useRouter()
  const { isAuthenticated, walletAddress } = useAuthStore()
  const [filter, setFilter] = useState<'all' | 'access' | 'audit' | 'system'>('all')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (!walletAddress) return

    getNotifications(walletAddress)
      .then((data) => setNotifications(data))
      .finally(() => setLoading(false))
  }, [isAuthenticated, walletAddress, router])

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true
    if (filter === 'access') return n.type.includes('access')
    if (filter === 'audit') return n.type.includes('audit')
    return n.type === 'system'
  })

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

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-gray-900">Notifications</h2>
          <p className="text-gray-600 mt-1">Activity and updates</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {(['all', 'access', 'audit', 'system'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filter === type
                  ? 'bg-blue-100 text-blue-700'
                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {type === 'all' && 'All'}
              {type === 'access' && 'Access Requests'}
              {type === 'audit' && 'Audit Logs'}
              {type === 'system' && 'System'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12"><p className="text-gray-600">Loading...</p></div>
        ) : filtered.length === 0 ? (
          <div className="border border-gray-200 rounded-lg p-12 text-center bg-white">
            <p className="text-gray-600">No notifications</p>
            <p className="text-sm text-gray-500 mt-1">Activity will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => (
              <div key={n.id} className={`border rounded-lg p-4 bg-white transition-colors ${
                n.read ? 'border-gray-200' : 'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs text-blue-600 hover:underline ml-4 shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

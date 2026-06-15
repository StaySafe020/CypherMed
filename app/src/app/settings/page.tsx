'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/store/authStore'
import { useWalletAuth } from '@/hooks/useWalletAuth'

export default function SettingsPage() {
  const router = useRouter()
  const { isAuthenticated, walletAddress } = useAuthStore()
  const { logout } = useWalletAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
  }, [isAuthenticated, router])

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

      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Page Header */}
        <div className="mb-12">
          <h2 className="text-3xl font-semibold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>

        {/* Wallet Info */}
        <div className="border border-gray-200 rounded-lg p-8 mb-8 bg-white">
          <h3 className="font-semibold text-gray-900 mb-6">Wallet Connection</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2">Connected Wallet</p>
            <p className="font-mono text-gray-900 text-sm break-all">{walletAddress}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>

        {/* Security */}
        <div className="border border-gray-200 rounded-lg p-8 bg-white">
          <h3 className="font-semibold text-gray-900 mb-6">Security & Privacy</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
              <span className="text-gray-700">AES-256-GCM Encryption</span>
              <span className="text-green-600 font-semibold">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
              <span className="text-gray-700">Wallet Verification</span>
              <span className="text-green-600 font-semibold">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
              <span className="text-gray-700">Audit Logs</span>
              <button className="text-blue-600 hover:underline font-medium">View</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

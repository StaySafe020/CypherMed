'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useWalletAuth } from '@/hooks/useWalletAuth'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const { setVisible } = useWalletModal()
  const wallet = useWallet()
  const { signAndVerify } = useWalletAuth()
  const { error, isLoading, walletAddress } = useAuthStore()

  const handleConnectWallet = async () => {
    if (!wallet.publicKey) {
      setVisible(true)
      return
    }

    const success = await signAndVerify()
    if (success) {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Image
              src="/cyphermed-logo.png"
              alt="CypherMed Logo"
              width={120}
              height={120}
              priority
              className="rounded-lg"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">CypherMed</h1>
          <p className="text-gray-600 mt-2">Decentralized medical records on Solana</p>
        </div>

        {/* Form */}
        <div className="border border-gray-200 rounded-xl p-8 bg-white">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Sign In</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {walletAddress && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 break-all">Connected: {walletAddress}</p>
            </div>
          )}

          <p className="text-gray-600 text-sm mb-6">
            Connect your Solana wallet to sign in securely. No passwords required.
          </p>

          <button
            onClick={handleConnectWallet}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
          >
            {isLoading
              ? 'Authenticating...'
              : wallet.publicKey
              ? 'Sign & Verify'
              : 'Connect Solana Wallet'}
          </button>

          {wallet.publicKey && (
            <button
              onClick={() => wallet.disconnect?.()}
              className="w-full px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Disconnect Wallet
            </button>
          )}

          <p className="text-xs text-gray-500 text-center mt-6">
            You will be asked to sign a message. No transactions will be made.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            By signing in, you agree to our
            <Link href="#" className="text-blue-600 hover:underline mx-1">
              Terms of Service
            </Link>
            and
            <Link href="#" className="text-blue-600 hover:underline mx-1">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

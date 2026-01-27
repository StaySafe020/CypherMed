'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [wallet, setWallet] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // API call would go here
    setTimeout(() => setLoading(false), 1000)
  }

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // API call would go here
    setTimeout(() => setLoading(false), 1000)
  }

  const connectWallet = async () => {
    setLoading(true)
    // Phantom wallet connection would go here
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      {/* Background elements */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-hospital-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10"></div>
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-hospital-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10"></div>

      <div className="max-w-md w-full">
        {/* Header */}
        <Link href="/">
          <div className="text-center mb-8 cursor-pointer hover:opacity-80 transition-smooth">
            <div className="text-4xl font-bold bg-gradient-to-r from-hospital-blue-600 to-hospital-teal-600 bg-clip-text text-transparent">
              CypherMed
            </div>
          </div>
        </Link>

        {/* Tab Navigation */}
        <div className="glass-sm mb-6 p-1 flex gap-2">
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 rounded-lg font-semibold transition-smooth ${
              tab === 'signup'
                ? 'bg-white/50 text-hospital-blue-700 shadow-md'
                : 'text-gray-600'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => setTab('signin')}
            className={`flex-1 py-2 rounded-lg font-semibold transition-smooth ${
              tab === 'signin'
                ? 'bg-white/50 text-hospital-blue-700 shadow-md'
                : 'text-gray-600'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Sign Up Form */}
        {tab === 'signup' && (
          <form onSubmit={handleSignup} className="glass-dark p-8 space-y-6 animate-slide-up">
            <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-glass"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-glass"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Minimum 8 characters with mix of letters and numbers
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 glass-sm">Or continue with wallet</span>
              </div>
            </div>

            <button
              type="button"
              onClick={connectWallet}
              disabled={loading}
              className="w-full btn-secondary disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>🔌</span> Connect Solana Wallet
            </button>
          </form>
        )}

        {/* Sign In Form */}
        {tab === 'signin' && (
          <form onSubmit={handleSignin} className="glass-dark p-8 space-y-6 animate-slide-up">
            <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email or Wallet
              </label>
              <input
                type="text"
                value={email || wallet}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com or wallet address"
                className="input-glass"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-glass"
                required
              />
              <Link href="/forgot-password">
                <p className="text-xs text-hospital-blue-600 mt-2 hover:underline cursor-pointer">
                  Forgot password?
                </p>
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 glass-sm">Or use wallet</span>
              </div>
            </div>

            <button
              type="button"
              onClick={connectWallet}
              disabled={loading}
              className="w-full btn-secondary disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>🔌</span> Connect Solana Wallet
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-gray-600 text-sm">
          <p>
            {tab === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => setTab(tab === 'signup' ? 'signin' : 'signup')}
              className="text-hospital-blue-600 font-semibold hover:underline"
            >
              {tab === 'signup' ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        <div className="text-center mt-8 text-gray-500 text-xs">
          <p>By continuing, you agree to our Terms and Privacy Policy</p>
        </div>
      </div>
    </div>
  )
}

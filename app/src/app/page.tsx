'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: 'Your Medical Records, Your Control',
      description: 'Take complete ownership of your medical history. Grant or revoke access anytime.',
      icon: '🔐',
      color: 'from-hospital-blue-500 to-hospital-blue-600',
    },
    {
      title: 'Immutable Access Logs',
      description: 'Every access to your records is permanently logged on the blockchain. Complete transparency.',
      icon: '⛓️',
      color: 'from-hospital-teal-500 to-hospital-teal-600',
    },
    {
      title: 'Time-Based Permissions',
      description: 'Set expiration dates on access grants. Full control over who sees what, for how long.',
      icon: '⏰',
      color: 'from-hospital-green-500 to-hospital-green-600',
    },
    {
      title: 'Records for Life',
      description: 'From birth to retirement—your complete medical history, never lost, always accessible.',
      icon: '📋',
      color: 'from-hospital-blue-600 to-hospital-teal-600',
    },
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const slide = slides[currentSlide]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Background blur elements */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-hospital-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10"></div>
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-hospital-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10"></div>

      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="text-5xl font-bold bg-gradient-to-r from-hospital-blue-600 to-hospital-teal-600 bg-clip-text text-transparent mb-2">
            CypherMed
          </div>
          <p className="text-gray-600 text-lg">Decentralized Medical Records</p>
        </div>

        {/* Slide Container */}
        <div className="glass-dark h-96 flex items-center justify-center mb-8 animate-slide-up">
          <div className="text-center px-8">
            <div className={`text-7xl mb-6 animate-float`}>{slide.icon}</div>
            <h2 className="text-4xl font-bold text-gray-800 mb-4">{slide.title}</h2>
            <p className="text-xl text-gray-600 leading-relaxed">{slide.description}</p>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-smooth ${
                idx === currentSlide
                  ? `w-8 bg-gradient-to-r ${slide.color}`
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mb-8 animate-slide-up">
          <button
            onClick={prevSlide}
            className="flex-1 btn-secondary"
          >
            ← Previous
          </button>
          <button
            onClick={nextSlide}
            className="flex-1 btn-secondary"
          >
            Next →
          </button>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 animate-slide-up">
          <Link href="/login" className="w-full text-center">
            <button className="w-full btn-primary">
              Get Started
            </button>
          </Link>
          <Link href="/login?tab=signin" className="w-full text-center">
            <button className="w-full btn-secondary">
              I already have an account
            </button>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Powered by @Solana • Built with @Rust</p>
        </div>
      </div>
    </div>
  )
}

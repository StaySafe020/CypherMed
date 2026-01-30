'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';

export default function ConnectPage() {
  const { connected, publicKey, disconnect } = useWallet();
  const router = useRouter();
  const { profile, setProfile } = useUserStore();
  
  const [step, setStep] = useState<'connect' | 'role' | 'provider-details'>('connect');
  const [providerType, setProviderType] = useState<'doctor' | 'nurse' | 'hospital_admin' | 'insurer'>('doctor');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    licenseNumber: '',
    specialty: '',
    institution: '',
  });

  // Check if user already has a profile
  useEffect(() => {
    if (connected && publicKey && profile?.walletAddress === publicKey.toBase58()) {
      // Returning user - go to dashboard
      if (profile.role === 'patient') {
        router.push('/dashboard/patient');
      } else {
        router.push('/dashboard/provider');
      }
    } else if (connected && publicKey) {
      // New user - show role selection
      setStep('role');
    }
  }, [connected, publicKey, profile, router]);

  const handleRoleSelect = (role: 'patient' | 'provider') => {
    if (role === 'patient') {
      // Create patient profile immediately
      if (publicKey) {
        setProfile({
          walletAddress: publicKey.toBase58(),
          role: 'patient',
          verificationStatus: 'none',
          createdAt: new Date().toISOString(),
        });
        router.push('/dashboard/patient');
      }
    } else {
      // Show provider details form
      setStep('provider-details');
    }
  };

  const handleProviderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (publicKey) {
      setProfile({
        walletAddress: publicKey.toBase58(),
        role: providerType,
        name: formData.name,
        email: formData.email,
        licenseNumber: formData.licenseNumber,
        specialty: formData.specialty,
        institution: formData.institution,
        verificationStatus: 'pending',
        createdAt: new Date().toISOString(),
      });
      router.push('/dashboard/provider');
    }
  };

  const specialties = [
    'General Practice',
    'Cardiology',
    'Dermatology',
    'Emergency Medicine',
    'Endocrinology',
    'Family Medicine',
    'Gastroenterology',
    'Neurology',
    'Obstetrics & Gynecology',
    'Oncology',
    'Ophthalmology',
    'Orthopedics',
    'Pediatrics',
    'Psychiatry',
    'Radiology',
    'Surgery',
    'Urology',
    'Other',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-hospital-blue-500 to-hospital-teal-500 flex items-center justify-center shadow-lg">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">CypherMed</h1>
          <p className="text-gray-600 mt-2">Your Medical Records, Your Control</p>
        </div>

        {/* Step: Connect Wallet */}
        {step === 'connect' && (
          <div className="glass-card p-8 rounded-3xl">
            <h2 className="text-xl font-semibold text-gray-800 text-center mb-6">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Use your Solana wallet to securely access your medical records. No passwords needed.
            </p>
            
            <div className="flex justify-center">
              <WalletMultiButton className="!bg-gradient-to-r !from-hospital-blue-500 !to-hospital-teal-500 !rounded-xl !py-3 !px-6 !font-medium !text-base hover:!opacity-90 !transition-all" />
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Don&apos;t have a wallet?{' '}
                <a 
                  href="https://phantom.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-hospital-blue-600 hover:underline"
                >
                  Get Phantom
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Step: Role Selection */}
        {step === 'role' && (
          <div className="glass-card p-8 rounded-3xl">
            <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">
              Welcome to CypherMed
            </h2>
            <p className="text-gray-600 text-center mb-8">
              How will you be using the platform?
            </p>

            <div className="space-y-4">
              {/* Patient Option */}
              <button
                onClick={() => handleRoleSelect('patient')}
                className="w-full p-6 rounded-2xl border-2 border-gray-200 hover:border-hospital-blue-400 hover:bg-hospital-blue-50/50 transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-hospital-blue-100 flex items-center justify-center group-hover:bg-hospital-blue-200 transition-colors">
                    <svg className="w-7 h-7 text-hospital-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">I&apos;m a Patient</h3>
                    <p className="text-gray-500 text-sm">Manage your medical records and control access</p>
                  </div>
                </div>
              </button>

              {/* Provider Option */}
              <button
                onClick={() => handleRoleSelect('provider')}
                className="w-full p-6 rounded-2xl border-2 border-gray-200 hover:border-hospital-teal-400 hover:bg-hospital-teal-50/50 transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-hospital-teal-100 flex items-center justify-center group-hover:bg-hospital-teal-200 transition-colors">
                    <svg className="w-7 h-7 text-hospital-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">I&apos;m a Healthcare Provider</h3>
                    <p className="text-gray-500 text-sm">Doctor, Nurse, Hospital, or Insurer</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                disconnect();
                setStep('connect');
              }}
              className="w-full mt-6 text-gray-500 hover:text-gray-700 text-sm"
            >
              Use a different wallet
            </button>
          </div>
        )}

        {/* Step: Provider Details */}
        {step === 'provider-details' && (
          <div className="glass-card p-8 rounded-3xl">
            <button
              onClick={() => setStep('role')}
              className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Provider Verification
            </h2>

            <form onSubmit={handleProviderSubmit} className="space-y-5">
              {/* Provider Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I am a...
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'doctor', label: 'Doctor', icon: '👨‍⚕️' },
                    { id: 'nurse', label: 'Nurse', icon: '👩‍⚕️' },
                    { id: 'hospital_admin', label: 'Hospital', icon: '🏥' },
                    { id: 'insurer', label: 'Insurer', icon: '🏢' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setProviderType(type.id as any)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        providerType === type.id
                          ? 'border-hospital-teal-500 bg-hospital-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <p className="text-sm font-medium mt-1">{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-hospital-teal-400 focus:ring-2 focus:ring-hospital-teal-100 outline-none transition-all"
                  placeholder="Dr. Jane Smith"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-hospital-teal-400 focus:ring-2 focus:ring-hospital-teal-100 outline-none transition-all"
                  placeholder="jane.smith@hospital.org"
                />
              </div>

              {/* License Number - Only for doctors and nurses */}
              {(providerType === 'doctor' || providerType === 'nurse') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical License Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-hospital-teal-400 focus:ring-2 focus:ring-hospital-teal-100 outline-none transition-all"
                    placeholder="MD12345678"
                  />
                </div>
              )}

              {/* Specialty - Only for doctors */}
              {providerType === 'doctor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialty
                  </label>
                  <select
                    required
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-hospital-teal-400 focus:ring-2 focus:ring-hospital-teal-100 outline-none transition-all"
                  >
                    <option value="">Select specialty...</option>
                    {specialties.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Institution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {providerType === 'insurer' ? 'Company Name' : 'Hospital / Clinic'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-hospital-teal-400 focus:ring-2 focus:ring-hospital-teal-100 outline-none transition-all"
                  placeholder={providerType === 'insurer' ? 'BlueCross Insurance' : 'City General Hospital'}
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-hospital-teal-500 to-hospital-blue-500 text-white font-semibold hover:opacity-90 transition-all mt-6"
              >
                Submit for Verification
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Your credentials will be verified within 24-48 hours. You&apos;ll have limited access until verification is complete.
              </p>
            </form>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          Secured by Solana blockchain
        </p>
      </div>
    </div>
  );
}

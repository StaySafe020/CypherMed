'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUserStore } from '@/store/userStore';

export default function ProviderDashboard() {
  const { connected, publicKey, disconnect } = useWallet();
  const { profile, clearProfile, isProvider, isVerified } = useUserStore();
  const router = useRouter();

  // Redirect if not connected or wrong role
  useEffect(() => {
    if (!connected || !profile) {
      router.push('/connect');
    } else if (profile.role === 'patient') {
      router.push('/dashboard/patient');
    }
  }, [connected, profile, router]);

  const handleDisconnect = () => {
    clearProfile();
    disconnect();
    router.push('/connect');
  };

  if (!profile) return null;

  const shortAddress = publicKey?.toBase58().slice(0, 4) + '...' + publicKey?.toBase58().slice(-4);
  const isPending = profile.verificationStatus === 'pending';
  const isVerifiedProvider = profile.verificationStatus === 'verified';

  const roleLabels: Record<string, string> = {
    doctor: 'Doctor',
    nurse: 'Nurse',
    hospital_admin: 'Hospital Admin',
    insurer: 'Insurance Provider',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hospital-teal-50 via-white to-hospital-blue-50">
      {/* Header */}
      <header className="glass-card rounded-none border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hospital-teal-500 to-hospital-blue-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-800">CypherMed</span>
            <span className="text-sm text-gray-400 hidden md:inline">| Provider Portal</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Verification Badge */}
            {isPending && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pending Verification
              </span>
            )}
            {isVerifiedProvider && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verified
              </span>
            )}

            {/* Notifications */}
            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile */}
            <button 
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">{shortAddress}</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Pending Verification Banner */}
      {isPending && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <span className="text-yellow-600 text-2xl">⏳</span>
            <div>
              <p className="font-medium text-yellow-800">Your account is pending verification</p>
              <p className="text-sm text-yellow-600">You have limited access until your credentials are verified. This usually takes 24-48 hours.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {profile.name || roleLabels[profile.role || 'doctor']}!
          </h1>
          <p className="text-gray-600 mt-1">
            {profile.institution && `${profile.institution} • `}
            {profile.specialty && `${profile.specialty} • `}
            {roleLabels[profile.role || 'doctor']}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'My Patients', value: isPending ? '--' : '24', icon: '👥', color: 'teal' },
            { label: 'Active Grants', value: isPending ? '--' : '18', icon: '✅', color: 'green' },
            { label: 'Pending Requests', value: isPending ? '--' : '5', icon: '📩', color: 'yellow' },
            { label: 'Records Accessed', value: isPending ? '--' : '156', icon: '📋', color: 'blue' },
          ].map((stat, i) => (
            <div key={i} className={`glass-card p-6 rounded-2xl ${isPending ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{stat.icon}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Request Access', icon: '🔐', href: '/request-access', disabled: isPending },
              { label: 'View Patients', icon: '👥', href: '/patients', disabled: isPending },
              { label: 'Create Record', icon: '📝', href: '/create-record', disabled: isPending },
              { label: 'Emergency Access', icon: '🚨', href: '/emergency', disabled: false },
            ].map((action, i) => (
              <button 
                key={i} 
                disabled={action.disabled}
                className={`glass-card p-6 rounded-2xl text-center transition-transform ${
                  action.disabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:scale-[1.02]'
                }`}
              >
                <span className="text-3xl block mb-3">{action.icon}</span>
                <span className="text-gray-700 font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Patient Access Requests (Pending approval from patients) */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Pending Access Requests</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {isPending ? '0' : '5'} waiting
            </span>
          </div>
          
          {isPending ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl block mb-3">🔒</span>
              <p>Access requests will be available after verification</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { name: 'Alice Johnson', id: 'PAT-001', type: 'Lab Results', time: '30 min ago', status: 'Pending patient approval' },
                { name: 'Bob Smith', id: 'PAT-002', type: 'Full History', time: '2 hours ago', status: 'Pending patient approval' },
                { name: 'Carol Williams', id: 'PAT-003', type: 'Prescriptions', time: '1 day ago', status: 'Pending patient approval' },
              ].map((request, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-hospital-blue-100 flex items-center justify-center">
                      <span className="text-lg font-semibold text-hospital-blue-600">
                        {request.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{request.name}</p>
                      <p className="text-sm text-gray-500">{request.id} • Requested: {request.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">{request.time}</span>
                    <span className="text-xs text-yellow-600">{request.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Patients */}
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Patients</h2>
          
          {isPending ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl block mb-3">🔒</span>
              <p>Patient list will be available after verification</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Alice Johnson', lastVisit: 'Today', records: 12, status: 'Active' },
                { name: 'Bob Smith', lastVisit: 'Yesterday', records: 8, status: 'Active' },
                { name: 'Carol Williams', lastVisit: '3 days ago', records: 15, status: 'Active' },
                { name: 'David Brown', lastVisit: '1 week ago', records: 5, status: 'Inactive' },
                { name: 'Eve Davis', lastVisit: '2 weeks ago', records: 22, status: 'Active' },
                { name: 'Frank Wilson', lastVisit: '1 month ago', records: 3, status: 'Inactive' },
              ].map((patient, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-hospital-teal-100 flex items-center justify-center">
                      <span className="font-semibold text-hospital-teal-600">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{patient.name}</p>
                      <p className="text-xs text-gray-500">Last visit: {patient.lastVisit}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{patient.records} records</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      patient.status === 'Active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {patient.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

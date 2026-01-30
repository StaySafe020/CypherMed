'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUserStore } from '@/store/userStore';

export default function PatientDashboard() {
  const { connected, publicKey, disconnect } = useWallet();
  const { profile, clearProfile } = useUserStore();
  const router = useRouter();

  // Redirect if not connected or wrong role
  useEffect(() => {
    if (!connected || !profile) {
      router.push('/connect');
    } else if (profile.role !== 'patient') {
      router.push('/dashboard/provider');
    }
  }, [connected, profile, router]);

  const handleDisconnect = () => {
    clearProfile();
    disconnect();
    router.push('/connect');
  };

  if (!profile) return null;

  const shortAddress = publicKey?.toBase58().slice(0, 4) + '...' + publicKey?.toBase58().slice(-4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-hospital-blue-50 via-white to-hospital-teal-50">
      {/* Header */}
      <header className="glass-card rounded-none border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hospital-blue-500 to-hospital-teal-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-800">CypherMed</span>
          </div>

          <div className="flex items-center gap-4">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-gray-600 mt-1">Here&apos;s an overview of your medical records</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Medical Records', value: '12', icon: '📋', color: 'blue' },
            { label: 'Active Grants', value: '3', icon: '✅', color: 'green' },
            { label: 'Pending Requests', value: '2', icon: '⏳', color: 'yellow' },
            { label: 'Access Logs', value: '47', icon: '📊', color: 'purple' },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-6 rounded-2xl">
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
              { label: 'View Records', icon: '📋', href: '/records' },
              { label: 'Manage Access', icon: '🔐', href: '/access' },
              { label: 'Access Requests', icon: '📩', href: '/requests' },
              { label: 'Audit Logs', icon: '📊', href: '/audit' },
            ].map((action, i) => (
              <button key={i} className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform text-center">
                <span className="text-3xl block mb-3">{action.icon}</span>
                <span className="text-gray-700 font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pending Requests Section */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Pending Access Requests</h2>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">2 pending</span>
          </div>
          
          <div className="space-y-4">
            {[
              { name: 'Dr. Sarah Johnson', role: 'Cardiologist', hospital: 'City General Hospital', time: '2 hours ago' },
              { name: 'MedLife Insurance', role: 'Insurer', hospital: 'Claims Department', time: '1 day ago' },
            ].map((request, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-hospital-teal-100 flex items-center justify-center">
                    <span className="text-xl">{request.role === 'Insurer' ? '🏢' : '👨‍⚕️'}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{request.name}</p>
                    <p className="text-sm text-gray-500">{request.role} • {request.hospital}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{request.time}</span>
                  <button className="px-4 py-2 bg-hospital-teal-500 text-white rounded-lg text-sm font-medium hover:bg-hospital-teal-600 transition-colors">
                    Approve
                  </button>
                  <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { action: 'Record accessed', actor: 'Dr. Michael Chen', type: 'Lab Results', time: '10 min ago', icon: '👁️' },
              { action: 'New record created', actor: 'City General Hospital', type: 'Visit Summary', time: '2 hours ago', icon: '📝' },
              { action: 'Access granted', actor: 'You', type: 'To Dr. Sarah Johnson', time: '1 day ago', icon: '✅' },
              { action: 'Access request denied', actor: 'You', type: 'PharmaCorp Inc.', time: '3 days ago', icon: '❌' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <span className="text-2xl">{activity.icon}</span>
                <div className="flex-1">
                  <p className="text-gray-800"><span className="font-medium">{activity.action}</span> - {activity.type}</p>
                  <p className="text-sm text-gray-500">By {activity.actor}</p>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

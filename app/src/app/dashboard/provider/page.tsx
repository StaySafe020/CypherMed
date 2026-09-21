'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { useUserStore } from '@/store/userStore';

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M16 5l3 3M14 7l3 3" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
    pulse: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function ProviderDashboard() {
  const { connected, publicKey, disconnect } = useWallet();
  const { profile, clearProfile } = useUserStore();
  const router = useRouter();
  useEffect(() => {
    if (!connected || !profile) router.push('/connect');
    else if (profile.role === 'patient') router.push('/dashboard/patient');
  }, [connected, profile, router]);
  if (!profile) return null;

  const shortAddress = publicKey?.toBase58().slice(0, 5) + '...' + publicKey?.toBase58().slice(-4);
  const pending = profile.verificationStatus === 'pending';
  const roleLabels: Record<string, string> = { doctor: 'Doctor', nurse: 'Nurse', hospital_admin: 'Hospital admin', insurer: 'Insurance provider' };
  const handleDisconnect = () => { clearProfile(); disconnect(); router.push('/connect'); };

  return (
    <div className="app-grid min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-[#dfe8e2] bg-[#fbfdfb] px-5 py-7 lg:flex lg:flex-col">
        <Link href="/dashboard/provider" className="mb-12 flex items-center gap-3 px-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#176b52] text-white"><Icon name="pulse" size={21} /></span><span className="text-lg font-bold tracking-tight text-[#17221f]">Cypher<span className="text-[#176b52]">Med</span></span></Link>
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa9a1]">Provider workspace</p>
        <nav className="space-y-1"><Link href="/dashboard/provider" className="sidebar-link sidebar-link-active"><Icon name="grid" />Overview</Link><Link href="/providers" className="sidebar-link"><Icon name="users" />My patients</Link><Link href="/access-requests" className="sidebar-link"><Icon name="key" />Access requests</Link><Link href="/records" className="sidebar-link"><Icon name="file" />Accessible records</Link></nav>
        <div className="mt-auto rounded-2xl bg-[#eaf4eb] p-4"><p className="text-sm font-semibold text-[#214d3c]">Privacy by default</p><p className="mt-1 text-xs leading-5 text-[#668275]">Patient access is always scoped, encrypted, and logged.</p></div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-[#dfe8e2] bg-[#fbfdfb]/85 px-5 py-4 backdrop-blur-md sm:px-8"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a9b92]">Provider workspace</p><p className="mt-1 text-sm text-[#53655c]">Care coordination, with consent built in</p></div><div className="flex items-center gap-3"><button aria-label="Notifications" className="relative rounded-xl border border-[#dfe8e2] bg-white p-2.5 text-[#607168]"><Icon name="bell" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#d8794f]" /></button><button onClick={handleDisconnect} className="flex items-center gap-2 rounded-xl border border-[#dfe8e2] bg-white px-3 py-2 text-xs font-semibold text-[#53655c]"><span className="h-6 w-6 rounded-full bg-[#d9eee0] text-center leading-6 text-[#176b52]">{(profile.name || 'D').slice(0, 1)}</span><span className="hidden sm:inline">{shortAddress}</span></button></div></header>
        <div className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          {pending && <div className="mb-7 flex items-start gap-3 rounded-2xl border border-[#f0d6ad] bg-[#fff8ea] p-4 text-[#805d29]"><span className="mt-0.5 h-2 w-2 rounded-full bg-[#d69b42]" /><div><p className="text-sm font-semibold">Verification in progress</p><p className="mt-1 text-xs leading-5">Your account has limited access until your credentials are verified.</p></div></div>}
          <section className="animate-reveal mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-3 text-sm font-semibold text-[#176b52]">{roleLabels[profile.role || 'doctor']}{profile.institution ? ` · ${profile.institution}` : ''}</p><h1 className="text-3xl font-bold tracking-[-0.04em] text-[#17221f] sm:text-4xl">Good morning{profile.name ? `, ${profile.name.split(' ')[0]}` : ''}.</h1><p className="mt-3 max-w-xl text-[15px] leading-7 text-[#6d7d75]">Review patient requests and work only with the records they have shared.</p></div><Link href="/access-requests" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#176b52] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(23,107,82,0.2)] hover:bg-[#105541]"><Icon name="key" size={16} /> Review requests</Link></section>
          <section className="mb-8 grid gap-4 sm:grid-cols-3">{[['24', 'Connected patients', 'Across active care'], ['18', 'Active permissions', 'Patient-approved'], ['156', 'Records accessed', 'Audited this month']].map(([value, label, detail], index) => <div key={label} className="glass-card animate-reveal rounded-2xl p-5" style={{ animationDelay: `${index * 70}ms` }}><p className="text-3xl font-bold tracking-[-0.04em] text-[#17221f]">{pending ? '--' : value}</p><p className="mt-1 text-sm font-semibold text-[#45564e]">{label}</p><p className="mt-2 text-xs text-[#91a098]">{pending ? 'Available after verification' : detail}</p></div>)}</section>
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]"><section className="glass-card animate-reveal rounded-2xl p-6 sm:p-7" style={{ animationDelay: '220ms' }}><div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8a9b92]">Needs your attention</p><h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#17221f]">Patient requests</h2></div><Link href="/access-requests" className="text-sm font-semibold text-[#176b52]">View all <span aria-hidden="true">↗</span></Link></div>{pending ? <div className="rounded-xl bg-[#f7faf7] p-8 text-center text-sm text-[#819088]">Requests will appear after verification.</div> : <div className="space-y-3">{[['Alice Johnson', 'Lab results', '30 min ago'], ['Bob Smith', 'Full history', '2 hours ago'], ['Carol Williams', 'Prescriptions', 'Yesterday']].map(([name, scope, time]) => <div key={name} className="flex items-center gap-4 rounded-xl border border-[#e6eee8] bg-[#fbfdfb] p-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dcebf2] text-sm font-bold text-[#3d7085]">{name.split(' ').map((part) => part[0]).join('')}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#263831]">{name}</p><p className="mt-1 text-xs text-[#819088]">Requested access to <span className="font-semibold text-[#53655c]">{scope}</span></p></div><span className="text-[11px] text-[#a0ada6]">{time}</span></div>)}</div>}</section><section className="animate-reveal rounded-2xl bg-[#17372d] p-6 text-white shadow-[0_18px_45px_rgba(23,55,45,0.14)]" style={{ animationDelay: '280ms' }}><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8bc4a0]">Compliance snapshot</p><h2 className="mt-2 text-xl font-bold">Every view is accountable.</h2><p className="mt-4 text-sm leading-6 text-[#aac6b5]">CypherMed records who accessed a patient record, what they viewed, and when access ended.</p><div className="mt-8 border-t border-white/10 pt-4"><p className="text-2xl font-bold">100%</p><p className="mt-1 text-xs text-[#aac6b5]">of access events logged</p></div></section></div>
          <section className="glass-card animate-reveal mt-6 rounded-2xl p-6 sm:p-7" style={{ animationDelay: '340ms' }}><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8a9b92]">Care team</p><h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#17221f]">Recently connected</h2></div><Link href="/providers" className="flex items-center gap-2 text-sm font-semibold text-[#176b52]">Open directory <Icon name="arrow" size={15} /></Link></div><div className="grid gap-3 md:grid-cols-3">{['Alice Johnson', 'Bob Smith', 'Carol Williams'].map((name) => <div key={name} className="flex items-center gap-3 rounded-xl bg-[#f7faf7] p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d9eee0] text-xs font-bold text-[#176b52]">{name.split(' ').map((part) => part[0]).join('')}</span><div><p className="text-sm font-semibold text-[#34483e]">{name}</p><p className="mt-0.5 text-xs text-[#819088]">Active permission</p></div></div>)}</div></section>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { useUserStore } from '@/store/userStore';

const navItems = [
  { label: 'Overview', href: '/dashboard/patient', icon: 'grid' },
  { label: 'My records', href: '/records', icon: 'file' },
  { label: 'Access & sharing', href: '/access-requests', icon: 'key' },
  { label: 'Audit activity', href: '/notifications', icon: 'pulse' },
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M16 5l3 3M14 7l3 3" /></>,
    pulse: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    shield: <><path d="M12 3 4 6v5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6z" /><path d="m8 12 2.5 2.5L16 9" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function PatientDashboard() {
  const { connected, publicKey, disconnect } = useWallet();
  const { profile, clearProfile } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    if (!connected || !profile) router.push('/connect');
    else if (profile.role !== 'patient') router.push('/dashboard/provider');
  }, [connected, profile, router]);

  if (!profile) return null;

  const shortAddress = publicKey?.toBase58().slice(0, 5) + '...' + publicKey?.toBase58().slice(-4);
  const handleDisconnect = () => { clearProfile(); disconnect(); router.push('/connect'); };

  return (
    <div className="app-grid min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-[#dfe8e2] bg-[#fbfdfb] px-5 py-7 lg:flex lg:flex-col">
        <Link href="/dashboard/patient" className="mb-12 flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#176b52] text-white"><Icon name="shield" size={21} /></span>
          <span className="text-lg font-bold tracking-tight text-[#17221f]">Cypher<span className="text-[#176b52]">Med</span></span>
        </Link>
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa9a1]">Workspace</p>
        <nav className="space-y-1">
          {navItems.map((item, index) => <Link key={item.href} href={item.href} className={`sidebar-link ${index === 0 ? 'sidebar-link-active' : ''}`}><Icon name={item.icon} />{item.label}</Link>)}
        </nav>
        <div className="mt-auto rounded-2xl bg-[#eaf4eb] p-4">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#176b52]"><Icon name="shield" size={16} /></div>
          <p className="text-sm font-semibold text-[#214d3c]">Your data is private</p>
          <p className="mt-1 text-xs leading-5 text-[#668275]">Only people you approve can read your encrypted records.</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-[#dfe8e2] bg-[#fbfdfb]/85 px-5 py-4 backdrop-blur-md sm:px-8">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a9b92]">Patient workspace</p><p className="mt-1 text-sm text-[#53655c]">Monday, September 14, 2026</p></div>
          <div className="flex items-center gap-3">
            <button aria-label="Notifications" className="relative rounded-xl border border-[#dfe8e2] bg-white p-2.5 text-[#607168] hover:text-[#176b52]"><Icon name="bell" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#d8794f]" /></button>
            <button onClick={handleDisconnect} className="flex items-center gap-2 rounded-xl border border-[#dfe8e2] bg-white px-3 py-2 text-xs font-semibold text-[#53655c] hover:border-[#a9c8b1]"><span className="h-6 w-6 rounded-full bg-[#cfe7d5] text-center leading-6 text-[#176b52]">P</span><span className="hidden sm:inline">{shortAddress}</span></button>
          </div>
        </header>

        <div className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          <section className="animate-reveal mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div><p className="mb-3 text-sm font-semibold text-[#176b52]">Good morning, patient</p><h1 className="max-w-2xl text-3xl font-bold tracking-[-0.04em] text-[#17221f] sm:text-4xl">Your health data, on your terms.</h1><p className="mt-3 max-w-xl text-[15px] leading-7 text-[#6d7d75]">One place to see what is shared, who has access, and every time your records are viewed.</p></div>
            <Link href="/records/create" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#176b52] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(23,107,82,0.2)] transition hover:bg-[#105541]"><span className="text-lg leading-none">+</span> Add a record</Link>
          </section>

          <section className="mb-8 grid gap-4 sm:grid-cols-3">
            {[['12', 'Total records', 'Across 4 categories'], ['3', 'Active permissions', '2 providers · 1 lab'], ['47', 'Audited events', 'Last 30 days']].map(([value, label, detail], index) => <div key={label} className="glass-card animate-reveal rounded-2xl p-5" style={{ animationDelay: `${index * 70}ms` }}><p className="text-3xl font-bold tracking-[-0.04em] text-[#17221f]">{value}</p><p className="mt-1 text-sm font-semibold text-[#45564e]">{label}</p><p className="mt-2 text-xs text-[#91a098]">{detail}</p></div>)}
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <section className="glass-card animate-reveal rounded-2xl p-6 sm:p-7" style={{ animationDelay: '220ms' }}>
              <div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8a9b92]">Sharing now</p><h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#17221f]">Active permissions</h2></div><Link href="/access-requests" className="text-sm font-semibold text-[#176b52] hover:underline">Manage access <span aria-hidden="true">↗</span></Link></div>
              <div className="space-y-3">
                {[['Dr. Sarah Johnson', 'Cardiology · City General', 'Lab results, visit summaries', 'Active'], ['MedLab Diagnostics', 'Laboratory · Central network', 'Lab results', 'Active'], ['Dr. Michael Chen', 'Primary care · North Clinic', 'Full record', 'Expires in 18 days']].map(([name, place, scope, status], index) => <div key={name} className="flex items-center gap-4 rounded-xl border border-[#e6eee8] bg-[#fbfdfb] p-4"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index === 1 ? 'bg-[#f7e6d9] text-[#a75f3b]' : 'bg-[#d9eee0] text-[#176b52]'}`}>{name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#263831]">{name}</p><p className="mt-0.5 truncate text-xs text-[#819088]">{place}</p><p className="mt-2 text-xs text-[#53655c]">Can view: <span className="font-semibold">{scope}</span></p></div><span className={`hidden rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline ${status === 'Active' ? 'bg-[#e4f3e7] text-[#28734d]' : 'bg-[#fff0d9] text-[#a26924]'}`}>{status}</span></div>)}
              </div>
            </section>

            <section className="animate-reveal rounded-2xl bg-[#17372d] p-6 text-white shadow-[0_18px_45px_rgba(23,55,45,0.14)]" style={{ animationDelay: '280ms' }}><div className="mb-10 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8bc4a0]">Protection status</p><h2 className="mt-2 text-xl font-bold">Everything is secure</h2></div><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2e624e] text-[#a6dfb5]"><Icon name="shield" size={19} /></span></div><div className="mb-7 flex items-center gap-4"><div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#75ba8a] text-center"><span className="text-2xl font-bold">100</span><span className="absolute -bottom-3 bg-[#17372d] px-1 text-[10px] text-[#a6dfb5]">%</span></div><div><p className="font-semibold">Access is controlled</p><p className="mt-1 max-w-[170px] text-xs leading-5 text-[#aac6b5]">No unauthorized access detected this month.</p></div></div><div className="border-t border-white/10 pt-4 text-xs text-[#aac6b5]"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#75ba8a]" /> Encryption and audit logging are active</div></section>
          </div>

          <section className="glass-card animate-reveal mt-6 rounded-2xl p-6 sm:p-7" style={{ animationDelay: '340ms' }}><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8a9b92]">Audit trail</p><h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#17221f]">Recent activity</h2></div><Link href="/notifications" className="flex items-center gap-2 text-sm font-semibold text-[#176b52]">View full log <Icon name="arrow" size={15} /></Link></div><div className="grid gap-0 md:grid-cols-3">{[['Record viewed', 'Dr. Sarah Johnson viewed Lab Results', '10 min ago', 'bg-[#d9eee0]'], ['Access granted', 'You granted access to MedLab Diagnostics', 'Yesterday', 'bg-[#dcebf2]'], ['Record added', 'New Visit Summary was added', 'Sep 11, 2026', 'bg-[#f7e6d9]']].map(([title, detail, time, color]) => <div key={title} className="flex gap-3 border-b border-[#e6eee8] py-3 first:pt-0 last:border-0 md:border-b-0 md:border-r md:px-5 md:first:pl-0 md:last:border-0 md:last:pr-0"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color} text-[#176b52]`}><Icon name="pulse" size={15} /></span><div><p className="text-sm font-semibold text-[#34483e]">{title}</p><p className="mt-1 text-xs leading-5 text-[#819088]">{detail}</p><p className="mt-1 text-[11px] text-[#a0ada6]">{time}</p></div></div>)}</div></section>
        </div>
      </main>
    </div>
  );
}

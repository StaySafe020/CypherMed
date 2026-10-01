'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { getAuditLogs, getNotifications, getPatientWithGrants, getRecords, type AuditEvent, type Notification, type ProviderGrant } from '@/lib/api';

const navItems = [['Overview', '/dashboard/patient'], ['My records', '/records'], ['Access & sharing', '/providers'], ['Audit activity', '/notifications']];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M16 5l3 3M14 7l3 3" /></>,
    pulse: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    shield: <><path d="M12 3 4 6v5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6z" /><path d="m8 12 2.5 2.5L16 9" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function PatientDashboard() {
  const { connected, publicKey, disconnect } = useWallet();
  const { profile, clearProfile } = useUserStore();
  const router = useRouter();
  const walletAddress = publicKey?.toBase58();
  const [records, setRecords] = useState<any[]>([]);
  const [grants, setGrants] = useState<ProviderGrant[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || !profile) { router.push('/connect'); return; }
    if (profile.role !== 'patient') { router.push('/dashboard/provider'); return; }
    if (!walletAddress) return;
    Promise.all([getRecords(walletAddress), getPatientWithGrants(walletAddress), getAuditLogs(walletAddress), getNotifications(walletAddress)])
      .then(([loadedRecords, patient, loadedAudit, loadedNotifications]) => { setRecords(loadedRecords); setGrants(patient.AccessGrantOffchain || []); setAuditEvents(loadedAudit); setNotifications(loadedNotifications); })
      .catch(() => setError('We could not load your current health workspace.'))
      .finally(() => setLoading(false));
  }, [connected, profile, router, walletAddress]);

  if (!profile) return null;
  const shortAddress = walletAddress ? `${walletAddress.slice(0, 5)}...${walletAddress.slice(-4)}` : '';
  const handleDisconnect = () => { clearProfile(); disconnect(); router.push('/connect'); };
  const activity = auditEvents.slice(0, 3);
  const unread = notifications.filter((item) => !item.read).length;

  return <div className="app-grid min-h-screen lg:flex">
    <aside className="hidden w-64 shrink-0 border-r border-[#dfe8e2] bg-[#fbfdfb] px-5 py-7 lg:flex lg:flex-col">
      <Link href="/dashboard/patient" className="mb-12 flex items-center gap-3 px-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#176b52] text-white"><Icon name="shield" size={21} /></span><span className="text-lg font-bold tracking-tight text-[#17221f]">Cypher<span className="text-[#176b52]">Med</span></span></Link>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa9a1]">Workspace</p>
      <nav className="space-y-1">{navItems.map(([label, href], index) => <Link key={href} href={href} className={`sidebar-link ${index === 0 ? 'sidebar-link-active' : ''}`}><Icon name={index === 0 ? 'grid' : index === 1 ? 'file' : index === 2 ? 'key' : 'pulse'} />{label}</Link>)}</nav>
      <div className="mt-auto rounded-2xl bg-[#eaf4eb] p-4"><div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#176b52]"><Icon name="shield" size={16} /></div><p className="text-sm font-semibold text-[#214d3c]">Your data is private</p><p className="mt-1 text-xs leading-5 text-[#668275]">Only people you approve can read your encrypted records.</p></div>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="flex items-center justify-between border-b border-[#dfe8e2] bg-[#fbfdfb]/85 px-5 py-4 backdrop-blur-md sm:px-8"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a9b92]">Patient workspace</p><p className="mt-1 text-sm text-[#53655c]">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p></div><div className="flex items-center gap-3"><Link href="/notifications" aria-label="Notifications" className="relative rounded-xl border border-[#dfe8e2] bg-white p-2.5 text-[#607168]"><Icon name="bell" />{unread > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#d8794f]" />}</Link><button onClick={handleDisconnect} className="flex items-center gap-2 rounded-xl border border-[#dfe8e2] bg-white px-3 py-2 text-xs font-semibold text-[#53655c]"><span className="h-6 w-6 rounded-full bg-[#cfe7d5] text-center leading-6 text-[#176b52]">P</span><span className="hidden sm:inline">{shortAddress}</span></button></div></header>
      <div className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <section className="animate-reveal mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-3 text-sm font-semibold text-[#176b52]">Patient workspace</p><h1 className="max-w-2xl text-3xl font-bold tracking-[-0.04em] text-[#17221f] sm:text-4xl">Your health data, on your terms.</h1><p className="mt-3 max-w-xl text-[15px] leading-7 text-[#6d7d75]">See what is shared, who has access, and every recorded activity.</p></div><Link href="/records/create" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#176b52] px-4 py-3 text-sm font-semibold text-white">+ Add a record</Link></section>
        {error && <div className="mb-6 rounded-xl border border-[#f0c9c0] bg-[#fff3f0] p-4 text-sm text-[#9a4938]">{error}</div>}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">{[[records.length, 'Total records'], [grants.length, 'Active permissions'], [auditEvents.length, 'Audited events']].map(([value, label]) => <div key={label as string} className="glass-card rounded-2xl p-5"><p className="text-3xl font-bold tracking-[-0.04em] text-[#17221f]">{loading ? '...' : value}</p><p className="mt-1 text-sm font-semibold text-[#45564e]">{label}</p><p className="mt-2 text-xs text-[#91a098]">Live from your account</p></div>)}</section>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <section className="glass-card rounded-2xl p-6 sm:p-7"><div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8a9b92]">Sharing now</p><h2 className="mt-2 text-xl font-bold text-[#17221f]">Active permissions</h2></div><Link href="/providers" className="text-sm font-semibold text-[#176b52]">Manage access ↗</Link></div>{loading ? <p className="text-sm text-[#819088]">Loading permissions...</p> : grants.length === 0 ? <p className="rounded-xl bg-[#f7faf7] p-6 text-sm text-[#819088]">No providers currently have access to your records.</p> : <div className="space-y-3">{grants.map((grant) => <div key={grant.id} className="flex items-center gap-4 rounded-xl border border-[#e6eee8] bg-[#fbfdfb] p-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d9eee0] text-sm font-bold text-[#176b52]">{grant.provider.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#263831]">{grant.provider}</p><p className="mt-1 text-xs text-[#819088]">{grant.role} · Can view: {grant.allowedTypes}</p></div><span className="rounded-full bg-[#e4f3e7] px-2.5 py-1 text-[11px] font-semibold text-[#28734d]">Active</span></div>)}</div>}</section>
          <section className="rounded-2xl bg-[#17372d] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8bc4a0]">Protection status</p><h2 className="mt-2 text-xl font-bold">Access is controlled</h2><p className="mt-4 text-sm leading-6 text-[#aac6b5]">Permission checks and audit events are loaded from the API for this account.</p><div className="mt-8 border-t border-white/10 pt-4 text-xs text-[#aac6b5]"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#75ba8a]" />{unread} unread notifications</div></section>
        </div>
        <section className="glass-card mt-6 rounded-2xl p-6 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8a9b92]">Audit trail</p><h2 className="mt-2 text-xl font-bold text-[#17221f]">Recent activity</h2></div><Link href="/notifications" className="text-sm font-semibold text-[#176b52]">View full log ↗</Link></div>{loading ? <p className="text-sm text-[#819088]">Loading activity...</p> : activity.length === 0 ? <p className="rounded-xl bg-[#f7faf7] p-6 text-sm text-[#819088]">No audit activity yet.</p> : <div className="grid gap-3 md:grid-cols-3">{activity.map((event) => <div key={event.id} className="rounded-xl bg-[#f7faf7] p-4"><p className="text-sm font-semibold text-[#34483e]">{event.action}</p><p className="mt-1 text-xs text-[#819088]">{event.success ? 'Completed' : 'Denied'} · {new Date(event.createdAt).toLocaleString()}</p><p className="mt-1 truncate text-xs text-[#a0ada6]">{event.accessor}</p></div>)}</div>}</section>
      </div>
    </main>
  </div>;
}

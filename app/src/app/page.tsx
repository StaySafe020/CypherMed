'use client'

import Link from 'next/link'
import { useState } from 'react'

const GITHUB_URL = 'https://github.com/StaySafe020/CypherMed'
const DEMO_URL = '/connect'

function ArrowIcon() {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}

function ShieldIcon() {
  return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4.5 6v5c0 4.8 3.2 8.3 7.5 10 4.3-1.7 7.5-5.2 7.5-10V6z" /><path d="m8.5 12 2.3 2.3 4.7-5" /></svg>
}

function FlowNode({ label, sublabel, tone = 'light' }: { label: string; sublabel: string; tone?: 'light' | 'dark' }) {
  return <div className={`flow-node ${tone === 'dark' ? 'flow-node-dark' : ''}`}><span className="flow-node-dot" /><div><p>{label}</p><span>{sublabel}</span></div></div>
}

export default function LandingPage() {
  const [architectureOpen, setArchitectureOpen] = useState(false)

  return <main className="landing-page">
    <nav className="landing-nav" aria-label="Main navigation">
      <Link href="/" className="brand"><span className="brand-mark"><ShieldIcon /></span><span>Cypher<span>Med</span></span></Link>
      <div className="nav-links"><a href="#how-it-works">How it works</a><a href="#architecture">Architecture</a><a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a></div>
      <Link href={DEMO_URL} className="nav-cta">Try the demo <ArrowIcon /></Link>
    </nav>

    <section className="landing-hero">
      <div className="hero-copy">
        <p className="eyebrow"><span className="status-dot" /> Patient-controlled health data</p>
        <h1>Privacy-first medical records <em>on Solana.</em></h1>
        <p className="hero-lede">CypherMed gives patients control over who can access their medical records through encrypted storage and verifiable authorization.</p>
        <div className="hero-actions"><Link href={DEMO_URL} className="button button-primary">Try the demo <ArrowIcon /></Link><a href={GITHUB_URL} target="_blank" rel="noreferrer" className="button button-secondary">View on GitHub</a></div>
        <p className="hero-note">Working prototype · Solana Devnet · Do not use real patient data</p>
      </div>
      <div className="hero-visual" aria-label="Patient authorization flow visualization">
        <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-core"><span className="core-ring" /><ShieldIcon /><small>CONTROLLED<br />ACCESS</small></div>
        <div className="flow-track"><FlowNode label="Patient" sublabel="owns the record" /><span className="flow-line" /><FlowNode label="Authorization" sublabel="scoped permission" tone="dark" /><span className="flow-line" /><FlowNode label="Doctor" sublabel="approved viewer" /><span className="flow-line" /><FlowNode label="Record" sublabel="encrypted off-chain" tone="dark" /></div>
      </div>
    </section>

    <section className="trust-strip"><p>Built around a simple principle</p><strong>Health data should move by consent, not default.</strong><span>Next.js <i /> Express <i /> PostgreSQL <i /> Anchor / Solana</span></section>

    <section className="section problem-section"><div className="section-kicker">The problem</div><div className="split-heading"><h2>Medical data is deeply personal.</h2><p>Records carry intimate details about a person’s life, but access is often fragmented across organizations and systems. Patients deserve a clear view of who can see their information.</p></div><div className="problem-grid"><div><span className="index">01</span><h3>Sensitive by nature</h3><p>Medical records contain information that should not be shared casually or invisibly.</p></div><div><span className="index">02</span><h3>Fragmented by default</h3><p>Care can span providers, labs, and institutions with different systems and workflows.</p></div><div><span className="index">03</span><h3>Consent should be visible</h3><p>Patients need a practical way to understand and change access to their records.</p></div></div></section>

    <section className="section solution-section"><div className="section-kicker">The approach</div><div className="split-heading"><h2>Put access control in the patient’s hands.</h2><p>CypherMed separates the medical record from the authorization layer: records stay off-chain and encrypted, while permissions and access events are handled through the application and Solana program.</p></div><div className="feature-grid"><article><span className="feature-number">01</span><div className="feature-icon"><ShieldIcon /></div><h3>Encrypted records</h3><p>Record content is kept off-chain. The application is designed around encrypted storage rather than putting sensitive clinical data on a public ledger.</p></article><article><span className="feature-number">02</span><div className="feature-icon key-icon">⌁</div><h3>Patient-controlled access</h3><p>Patients can review access requests, grant scoped permissions, and revoke an active provider grant.</p></article><article><span className="feature-number">03</span><div className="feature-icon">◌</div><h3>Authorization state</h3><p>Solana is used as the protocol layer for authorization-related state and the project’s audit direction.</p></article><article><span className="feature-number">04</span><div className="feature-icon">↗</div><h3>Auditable actions</h3><p>Access requests, decisions, and record access are represented in the backend audit model for review.</p></article></div></section>

    <section className="section flow-section" id="how-it-works"><div className="section-kicker">How it works</div><div className="split-heading"><h2>Consent is the workflow.</h2><p>A permission is explicit, scoped, and checked when a record is requested. Revocation changes the authorization boundary immediately.</p></div><div className="large-flow"><div className="large-flow-line" /><div className="large-flow-step"><span>01</span><b>Patient creates a record</b><small>Encrypted data stays off-chain.</small></div><div className="large-flow-step"><span>02</span><b>Provider requests access</b><small>The request is tied to a wallet identity.</small></div><div className="large-flow-step active"><span>03</span><b>Patient grants permission</b><small>Scope what the provider can view.</small></div><div className="large-flow-step"><span>04</span><b>Access is checked</b><small>Every read is evaluated against the active grant.</small></div><div className="large-flow-step"><span>05</span><b>Patient can revoke</b><small>Future reads are denied after revocation.</small></div></div></section>

    <section className="architecture-section" id="architecture"><div className="architecture-inner"><div className="section-kicker light-kicker">Technical architecture</div><div className="architecture-heading"><h2>Infrastructure for consent.</h2><button className="architecture-toggle" onClick={() => setArchitectureOpen((open) => !open)} aria-expanded={architectureOpen}>{architectureOpen ? 'Hide details' : 'View details'} <ArrowIcon /></button></div><p className="architecture-intro">Sensitive record content and authorization state have different jobs. CypherMed keeps those layers distinct.</p><div className="architecture-stack"><div><span>01</span><strong>Frontend</strong><small>Next.js / React / Wallet Adapter</small></div><i>↓</i><div><span>02</span><strong>Backend API</strong><small>Node.js / Express / Prisma</small></div><i>↓</i><div><span>03</span><strong>Encryption + database</strong><small>Off-chain records / PostgreSQL</small></div><i>↓</i><div><span>04</span><strong>Solana program</strong><small>Rust / Anchor / authorization state</small></div><i>↓</i><div><span>05</span><strong>Solana Devnet</strong><small>Protocol environment</small></div></div>{architectureOpen && <div className="architecture-detail"><span>RPC layer</span><b>Helius is configured as the Solana RPC provider for the application environment.</b></div>}</div></section>

    <section className="section solana-section"><div className="section-kicker">Why Solana</div><div className="split-heading"><h2>Blockchain as an infrastructure layer.</h2><p>CypherMed does not put medical record content on-chain. Solana provides a programmable environment for authorization-related protocol state and a foundation for verifiable activity, while the backend handles encrypted off-chain data.</p></div><div className="solana-callout"><span className="solana-mark">◎</span><div><strong>Devnet prototype</strong><p>The current project is built and tested around Solana Devnet. This is an experimental prototype, not a production healthcare system.</p></div></div></section>

    <section className="demo-section"><div className="demo-card"><div><div className="section-kicker light-kicker">Try the workflow</div><h2>See CypherMed in action.</h2><p>Connect a wallet, choose a patient or provider role, and explore the consent-driven application flow.</p></div><Link href={DEMO_URL} className="button button-light">Open the demo <ArrowIcon /></Link></div></section>

    <section className="section open-section"><div className="open-copy"><div className="section-kicker">Open source</div><h2>Built in the open.</h2><p>Explore the application, Solana program, backend, and documentation on GitHub.</p><a className="text-link" href={GITHUB_URL} target="_blank" rel="noreferrer">View CypherMed on GitHub <ArrowIcon /></a></div><div className="repo-card"><span>github.com</span><strong>StaySafe020 / CypherMed</strong><small>Solana · Next.js · Express · PostgreSQL</small><a href={GITHUB_URL} target="_blank" rel="noreferrer">Open repository <ArrowIcon /></a></div></section>

    <footer className="landing-footer"><Link href="/" className="brand"><span className="brand-mark"><ShieldIcon /></span><span>Cypher<span>Med</span></span></Link><p>Privacy-first medical records on Solana.</p><div><a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a><Link href={DEMO_URL}>Demo</Link></div></footer>
  </main>
}

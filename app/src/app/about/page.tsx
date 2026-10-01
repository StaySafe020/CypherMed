import Link from "next/link";

const GITHUB_URL = "https://github.com/StaySafe020/CypherMed";

export const metadata = {
  title: "About CypherMed | Privacy-first medical records",
  description:
    "Learn about CypherMed, an experimental Solana-based medical records prototype focused on patient-controlled access.",
};

export default function AboutPage() {
  return (
    <main className="about-page">
      <nav className="about-nav">
        <Link href="/" className="about-brand">
          <span>◈</span> CypherMed
        </Link>
        <div>
          <Link href="/">Home</Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/connect" className="about-cta">
            Try the demo
          </Link>
        </div>
      </nav>
      <section className="about-hero">
        <p className="about-kicker">About the project</p>
        <h1>Building clearer consent around medical records.</h1>
        <p>
          CypherMed is an experimental open-source application built around a
          simple idea: patients should be able to see and control who can access
          their records.
        </p>
      </section>
      <section className="about-content">
        <article>
          <p className="about-kicker">What CypherMed is</p>
          <h2>A working prototype on Solana Devnet.</h2>
          <p>
            The project combines a Next.js frontend, a Node.js and Express API,
            PostgreSQL-backed off-chain records, and an Anchor program for
            Solana. It is designed to explore patient-controlled permissions,
            wallet-based identity, and auditable access events.
          </p>
        </article>
        <article>
          <p className="about-kicker">What it is not</p>
          <h2>Not a production healthcare system.</h2>
          <p>
            CypherMed is not approved for clinical use and should not receive
            real patient data. Production deployment would require additional
            security review, privacy controls, operational safeguards, and
            applicable healthcare compliance work.
          </p>
        </article>
      </section>
      <section className="about-principles">
        <p className="about-kicker">Project principles</p>
        <div>
          <span>01</span>
          <strong>Patient control</strong>
          <p>Access should be explicit, scoped, and revocable.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Separated data layers</strong>
          <p>
            Medical record content belongs off-chain; protocol state has a
            different job.
          </p>
        </div>
        <div>
          <span>03</span>
          <strong>Open development</strong>
          <p>
            The code, documentation, and current limitations are available for
            inspection.
          </p>
        </div>
      </section>
      <section className="about-links">
        <h2>Explore the work.</h2>
        <div>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            View the repository ↗
          </a>
          <Link href="/connect">Open the demo ↗</Link>
          <a
            href="https://cyphermed.onrender.com/"
            target="_blank"
            rel="noreferrer"
          >
            View API status ↗
          </a>
        </div>
      </section>
      <footer className="about-footer">
        <Link href="/">CypherMed</Link>
        <span>Privacy-first medical records on Solana.</span>
        <Link href="/">Back to home</Link>
      </footer>
    </main>
  );
}

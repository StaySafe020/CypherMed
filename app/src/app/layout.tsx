import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CypherMed - Your Medical Records, Your Control',
  description: 'Decentralized medical records on Solana. Patient sovereignty, immutable audit trails.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-hospital-blue-50 via-white to-hospital-teal-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}

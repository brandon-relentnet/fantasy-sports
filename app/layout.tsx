import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Yahoo Fantasy Baseball',
  description: 'View your Yahoo Fantasy Baseball data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-zinc-800 text-zinc-100 antialiased flex items-center justify-center">
        <Providers>
          <div className="w-[800px] h-[600px] bg-zinc-900/80 backdrop-blur rounded-2xl shadow-2xl border border-zinc-700 p-4">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}

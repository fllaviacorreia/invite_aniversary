import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Theo faz 5 | Convite especial',
  description: 'Abra o convite e venha celebrar uma aventura no fundo do mar.',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#073f53',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className="bg-[#edf7f3]"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}

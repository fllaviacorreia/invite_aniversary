import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Convites especiais | Crie e compartilhe',
  description: 'Crie, personalize e compartilhe um convite digital especial para sua celebração.',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#073f53',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className="bg-[#edf7f3]"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}

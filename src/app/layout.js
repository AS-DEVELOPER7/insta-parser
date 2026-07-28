import './globals.css';
import ReduxProvider from '@/components/providers/ReduxProvider';

export const metadata = {
  title: {
    default: 'InstaVault • Instagram Archive Analytics',
    template: '%s • InstaVault',
  },
  description: 'View, search, and manage your official Instagram export archive in an authentic Instagram interface.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className="bg-black text-white antialiased font-sans selection:bg-ig-primary selection:text-white">
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}

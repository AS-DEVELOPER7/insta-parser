import './globals.css';
import ReduxProvider from '@/components/providers/ReduxProvider';

export const metadata = {
  title: {
    default: 'InstaVault • Instagram Archive Analytics',
    template: '%s • InstaVault',
  },
  description: 'View, search, and manage your official Instagram export archive in an authentic Instagram interface.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
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
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="bg-black text-white antialiased font-sans selection:bg-ig-primary selection:text-white">
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}

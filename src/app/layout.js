import './globals.css';
import ReduxProvider from '@/components/providers/ReduxProvider';

export const metadata = {
  title: 'InstaVault - View Instagram Exported Archives',
  description: 'View, search, and manage your official Instagram export archive in an authentic Instagram interface.',
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
      <body className="bg-black text-white antialiased font-sans selection:bg-ig-primary selection:text-white">
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Procura PMS', template: '%s · Procura PMS' },
  description: 'Procurement Management System: Purchase Request, Purchase Order, Vendor, Tracking, Tagihan & Jurnal.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

// Applies the saved theme before first paint to avoid a light/dark flash.
const themeScript = `try{var t=localStorage.getItem('procura.theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

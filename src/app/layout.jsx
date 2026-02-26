import './globals.css';

export const metadata = {
  title: 'Piramit - Günlük Türkçe Kelime Oyunu',
  description: 'Piramit - Günlük Türkçe kelime oyunu. Her gün yeni bir piramit bulmacası çöz ve puan kazanabilirsiniz!',
  keywords: 'oyun, kelime, türkçe, günlük, bulmaca, piramit',
  openGraph: {
    type: 'website',
    title: 'Piramit - Günlük Türkçe Kelime Oyunu',
    description: 'Her gün yeni bir piramit kelime bulmacası çözün. Sayıları harflere eşleyin, stratejik düşünün, puan kazanın!',
    siteName: 'Piramit',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Piramit - Günlük Türkçe Kelime Oyunu',
    description: 'Her gün yeni bir piramit kelime bulmacası çözün. Sayıları harflere eşleyin, stratejik düşünün, puan kazanın!',
  },
  other: {
    'theme-color': '#1A1A2E',
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
    <html lang="tr">
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75' fill='%23F39C12'>🔺</text></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}

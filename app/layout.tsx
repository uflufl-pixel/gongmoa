import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '공모아 - 대한민국 공모사업 통합 탐색',
  description: '정부 부처, 위원회, 공사·공단, 지방자치단체 공모사업을 한곳에서 확인하세요.',
  openGraph: {
    title: '공모아 - 대한민국 공모사업 통합 탐색',
    description: '흩어진 공모사업, 한곳에서 놓치지 않게.',
    images: ['/og.png'],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '공모아', description: '흩어진 공모사업, 한곳에서 놓치지 않게.', images: ['/og.png'] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

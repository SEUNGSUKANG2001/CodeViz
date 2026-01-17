import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CodeViz',
  description: 'Visualize your code in 3D',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

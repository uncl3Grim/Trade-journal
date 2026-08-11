import './globals.css';

export const metadata = {
  title: 'Trade Journal',
  description: 'Track and analyze your trades',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

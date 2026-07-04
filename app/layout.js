export const metadata = {
  title: 'OTS Desk — Track. Manage. Profit.',
  description: 'Order Management & Profit Tracking for eCommerce sellers.',
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}

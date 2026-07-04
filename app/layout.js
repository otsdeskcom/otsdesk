import './globals.css';

export const metadata = {
  title: 'OTS Desk — Track. Manage. Profit.',
  description: 'Order Management & Profit Tracking for eCommerce sellers on Walmart, TikTok Shop, Amazon, eBay, Etsy and Shopify.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

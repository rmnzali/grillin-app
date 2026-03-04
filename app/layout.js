export const metadata = {
  title: "Grillin' Restaurant",
  description: "Order delicious food from Grillin' Restaurant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tastybytes Global",
  description: "Global food truck analytics, powered by Snowflake Cortex",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

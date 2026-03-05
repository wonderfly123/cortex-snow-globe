import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cortex Snow Globe",
  description: "Interactive 3D globe data explorer powered by Snowflake Cortex",
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

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnFlow — Interactive AI Learning Platform",
  description:
    "An AI-powered learning platform with interactive visual outputs. Learn through diagrams, maps, charts, and live code — not just text.",
  keywords: ["AI learning", "interactive education", "visual learning", "LLM", "diagrams"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}

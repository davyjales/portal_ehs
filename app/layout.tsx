import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "EHS — Meio Ambiente, Saúde e Segurança",
  description: "Portal EHS para colaboradores — informativos, pendências e gamificação 1UP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${dmSans.variable} font-sans antialiased text-slate-800`}>
        {children}
      </body>
    </html>
  );
}

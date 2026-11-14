import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Otti – Schichtübergabe",
  description: "Sprach-Übergabe für die Pflege mit Otti, dem Otter.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* App-Spalte in der Mitte */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-white shadow-[0_0_0_1px_var(--color-linie)]">
          {children}
        </div>
      </body>
    </html>
  );
}

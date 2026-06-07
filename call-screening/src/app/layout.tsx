import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Call Screening",
  description: "Filtrage des appels entrants par liste noire de préfixes",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          background: "#0b1020",
          color: "#e7ebf5",
        }}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import "./premium.css";

export const metadata: Metadata = {
  title: "PermaDrop — almacenamiento permanente",
  description: "Publica, consulta y comparte archivos mediante enlaces permanentes y códigos QR.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

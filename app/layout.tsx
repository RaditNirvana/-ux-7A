import type { Metadata } from "next";
import { Inter, Poppins, Port_Lligat_Slab } from "next/font/google";
import "./globals.css";
import "./auth.css";
import "./customer.css";
import "./landing.css";
import "./role-selector.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const portLligatSlab = Port_Lligat_Slab({
  variable: "--font-port-lligat-slab",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Mitra Jaya Servis",
  description:
    "Servis kendaraan lebih mudah dan transparan bersama Mitra Jaya Servis.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${poppins.variable} ${portLligatSlab.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

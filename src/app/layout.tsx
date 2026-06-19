import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Brand fonts. Exposed as CSS variables, wired to semantic --font-* tokens in globals.css.
const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});
const sans = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "mims · dashboard",
  description: "Panel de gestión del agente de reservas mims.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // data-theme="dark" is the only active theme for now. The light token set exists in
  // globals.css, ready for a future toggle that flips this attribute — no rework needed.
  return (
    <html
      lang="es"
      data-theme="dark"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        {/* Set the saved theme before paint (no flash). Default dark. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'dark';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-bg text-text font-sans flex min-h-full flex-col">{children}</body>
    </html>
  );
}

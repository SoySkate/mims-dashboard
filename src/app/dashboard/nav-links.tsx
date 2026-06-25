"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Inicio", exact: true },
  { href: "/dashboard/calendario", label: "Calendario" },
  { href: "/dashboard/mensajes", label: "Mensajes" },
  { href: "/dashboard/llamadas", label: "Llamadas" },
  { href: "/dashboard/cuenta", label: "Cuenta" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${
              active
                ? "border-accent text-text"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

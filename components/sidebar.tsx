"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: "📊" },
  { href: "/chauffeurs", label: "Chauffeurs", icon: "👤" },
  { href: "/vehicules", label: "Véhicules", icon: "🚛" },
  { href: "/transports", label: "Ordres de transport", icon: "📋" },
  { href: "/facturation", label: "Facturation", icon: "💶" },
  { href: "/tachygraphe", label: "Tachygraphe", icon: "⏱️" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold">ERP Transport</h1>
        <p className="text-slate-400 text-sm mt-1">Gestion de flotte</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-slate-700 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <p className="text-slate-500 text-xs">v1.0.0</p>
      </div>
    </aside>
  )
}

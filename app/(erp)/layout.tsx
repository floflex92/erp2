import { Sidebar } from "@/components/sidebar"

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-slate-50 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}

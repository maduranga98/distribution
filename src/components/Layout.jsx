import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Boxes, PieChart, LayoutDashboard, Receipt, Route, Truck, Wallet } from "lucide-react";
import { useData } from "../context/DataContext";
import { Spinner } from "./ui";
import BusinessSwitcher from "./BusinessSwitcher";
import { cn } from "../lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/daily", label: "Daily", icon: Truck },
  { to: "/routes", label: "Routes", icon: Route },
  { to: "/analytics", label: "Analytics", icon: PieChart },
  { to: "/stock", label: "Inventory", icon: Boxes },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/accounting", label: "Accounts", icon: Wallet },
];

export default function Layout() {
  const { loading } = useData();
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-neutral-200 bg-white p-4 md:flex">
        <div className="mb-4 flex items-center gap-2 px-2 text-base font-semibold"><BarChart3 size={18} /> Distro</div>
        <BusinessSwitcher className="mb-6" />
        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", isActive ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100")}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8">
        <div className="mx-auto max-w-5xl">
          <BusinessSwitcher className="mb-5 md:hidden" />{loading ? <Spinner /> : <Outlet />}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t border-neutral-200 bg-white md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) => cn("flex flex-col items-center gap-0.5 py-2 text-[10px]", isActive ? "text-neutral-900" : "text-neutral-400")}>
            <Icon size={18} />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

import { NavLink, Outlet } from "react-router-dom";
import { Boxes, PieChart, LayoutDashboard, Receipt, Route, Truck, Wallet } from "lucide-react";
import { useData } from "../context/DataContext";
import { Spinner } from "./ui";
import BusinessSwitcher from "./BusinessSwitcher";
import { cn } from "../lib/utils";
import logo from "../assets/logo.png";

const NAV = [
  { to: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { to: "/daily", label: "Daily", icon: Truck },
  { to: "/routes", label: "Routes", icon: Route },
  { to: "/analytics", label: "Analytics", short: "Stats", icon: PieChart },
  { to: "/stock", label: "Inventory", short: "Stock", icon: Boxes },
  { to: "/expenses", label: "Expenses", short: "Spend", icon: Receipt },
  { to: "/accounting", label: "Accounts", short: "Books", icon: Wallet },
];

export default function Layout() {
  const { loading } = useData();
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white p-4 md:sticky md:top-0 md:flex md:h-dvh lg:w-60">
        <img src={logo} alt="Lakbima Distributors" className="mb-5 w-full px-1" />
        <BusinessSwitcher className="mb-6" />
        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", isActive ? "bg-brand text-white" : "text-neutral-600 hover:bg-brand-50 hover:text-brand")}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-6 md:p-6 md:pb-8 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <img src={logo} alt="Lakbima Distributors" className="mb-4 h-10 md:hidden" />
          <BusinessSwitcher className="mb-5 md:hidden" />{loading ? <Spinner /> : <Outlet />}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ to, label, short, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} aria-label={label}
            className={({ isActive }) => cn("flex min-w-0 flex-col items-center gap-0.5 py-2 text-[11px]", isActive ? "text-accent" : "text-neutral-400")}>
            <Icon size={20} /><span className="max-w-full truncate px-0.5">{short || label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

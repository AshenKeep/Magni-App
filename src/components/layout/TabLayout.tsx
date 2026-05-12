import { Outlet, NavLink } from "react-router-dom";

const TABS = [
  { to: "/",          label: "Dashboard", icon: "⊞" },
  { to: "/workouts",  label: "Workouts",  icon: "◈" },
  { to: "/exercises", label: "Exercises", icon: "⊕" },
  { to: "/templates", label: "Templates", icon: "◧" },
  { to: "/activity",  label: "Activity",  icon: "♡" },
  { to: "/settings",  label: "Settings",  icon: "⚙" },
];

export function TabLayout() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <nav className="border-t border-border bg-surface flex shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {TABS.map(tab => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === "/"} className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${isActive ? "text-blue" : "text-secondary"}`
          }>
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[10px] leading-none">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

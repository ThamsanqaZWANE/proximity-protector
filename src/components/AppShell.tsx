import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useSafety } from "@/lib/safety";
import { AlertOverlay } from "@/components/AlertOverlay";

const TABS = [
  { to: "/", label: "SOS" },
  { to: "/track", label: "Track" },
  { to: "/shake", label: "Shake" },
  { to: "/team", label: "Team" },
] as const;

function SessionClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <p className="font-mono text-[13px] text-slate-200">{now ?? "--:--:--"}</p>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { tracking } = useSafety();

  return (
    <div className="min-h-screen bg-ink text-foreground selection:bg-alarm/30">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-ink">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 pt-6 pb-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-panel ring-1 ring-line">
              <div className={`size-2.5 rounded-full bg-alarm ${tracking ? "tick-blink" : ""}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold tracking-tight">A.A Private Security</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel/70">
                Security console
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel/60">Session</p>
            <SessionClock />
          </div>
        </header>

        <main className="flex-1 pb-4">{children}</main>

        <nav className="sticky bottom-0 bg-ink px-4 pt-3 pb-6">
          <div className="grid grid-cols-4 gap-1 rounded-[15px] bg-panel p-1 ring-1 ring-line">
            {TABS.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                activeOptions={{ exact: tab.to === "/" }}
                className="flex flex-col items-center gap-1 rounded-[10px] py-3 text-steel"
                activeProps={{ className: "bg-panel2 text-alarm" }}
              >
                {({ isActive }) => (
                  <>
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
                      {tab.label}
                    </span>
                    <span
                      className={`size-1.5 rounded-full ${isActive ? "bg-alarm" : "bg-steel/40"}`}
                    />
                  </>
                )}
              </Link>
            ))}
          </div>
        </nav>
      </div>
      <AlertOverlay />
    </div>
  );
}

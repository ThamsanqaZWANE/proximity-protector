import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Disc, LocateFixed, Triangle, Users, Waves } from "lucide-react";
import { useSafety } from "@/lib/safety";
import { AlertOverlay } from "@/components/AlertOverlay";

const TABS = [
  { to: "/", label: "sos", Icon: Triangle },
  { to: "/track", label: "track", Icon: LocateFixed },
  { to: "/shake", label: "shake", Icon: Waves },
  { to: "/record", label: "record", Icon: Disc },
  { to: "/team", label: "team", Icon: Users },
] as const;


function SessionClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <p className="text-[17px] font-bold tabular-nums text-slate-50">{now ?? "--:--:--"}</p>;
}

export function AppShell({ children }: { children: ReactNode }) {


  return (
    <div className="min-h-screen bg-ink text-foreground selection:bg-alarm/30">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-ink">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 px-6 pt-7 pb-5">
          <div className="min-w-0">
            <p className="truncate text-[26px] font-bold lowercase tracking-tight text-slate-50">
              a.a security
            </p>
            <p className="text-[13px] lowercase text-steel/70">security console</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] lowercase text-steel/60">session</p>
            <SessionClock />
          </div>
        </header>

        <main className="flex-1 pb-4">{children}</main>

        <nav className="sticky bottom-0 bg-ink px-6 pt-4 pb-7">
          <div className="grid grid-cols-5 gap-1 border-t border-line pt-4">
            {TABS.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex flex-col items-center gap-2 rounded-[10px] py-1 text-steel"
                activeProps={{ className: "text-alarm" }}
              >
                <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
                <span className="text-[12px] lowercase">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <AlertOverlay />
    </div>
  );
}

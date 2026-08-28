import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type FakeCaller = { name: string; role: string; number: string };

type FakeCallValue = {
  active: boolean;
  answered: boolean;
  caller: FakeCaller;
  setCaller: (c: FakeCaller) => void;
  start: (delaySeconds?: number) => void;
  pending: number | null;
  end: () => void;
};

const DEFAULT_CALLER: FakeCaller = {
  name: "Marcus Kane",
  role: "Field lead",
  number: "+27 82 441 0192",
};

const FakeCallContext = createContext<FakeCallValue | null>(null);

function useRingtone(playing: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!playing) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = ctxRef.current ?? new Ctor();
    ctxRef.current = ctx;
    void ctx.resume();

    const burst = (at: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.16, at + 0.03);
      gain.gain.setValueAtTime(0.16, at + 0.38);
      gain.gain.linearRampToValueAtTime(0, at + 0.42);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.45);
    };

    const cycle = () => {
      if (stopped) return;
      const now = ctx.currentTime;
      burst(now);
      burst(now + 0.6);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([400, 200, 400]);
      }
      timer = setTimeout(cycle, 3000);
    };
    cycle();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(0);
    };
  }, [playing]);
}

export function FakeCallProvider({ children }: { children: ReactNode }) {
  const [caller, setCaller] = useState<FakeCaller>(DEFAULT_CALLER);
  const [active, setActive] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    if (pending === null) return;
    if (pending <= 0) {
      setPending(null);
      setAnswered(false);
      setActive(true);
      return;
    }
    const id = window.setTimeout(() => setPending((p) => (p === null ? null : p - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [pending]);

  const start = useCallback((delaySeconds = 0) => {
    if (delaySeconds > 0) {
      setPending(delaySeconds);
      return;
    }
    setAnswered(false);
    setActive(true);
  }, []);

  const end = useCallback(() => {
    setActive(false);
    setAnswered(false);
    setPending(null);
  }, []);

  const value = useMemo<FakeCallValue>(
    () => ({ active, answered, caller, setCaller, start, pending, end }),
    [active, answered, caller, start, pending, end],
  );

  return (
    <FakeCallContext.Provider value={value}>
      {children}
      <FakeCallScreen onAnswer={() => setAnswered(true)} />
    </FakeCallContext.Provider>
  );
}

export function useFakeCall() {
  const ctx = useContext(FakeCallContext);
  if (!ctx) throw new Error("useFakeCall must be used inside FakeCallProvider");
  return ctx;
}

function CallTimer() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setS((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p className="font-mono text-[13px] tabular-nums text-steel">
      {String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}
    </p>
  );
}

function FakeCallScreen({ onAnswer }: { onAnswer: () => void }) {
  const { active, answered, caller, end } = useFakeCall();
  useRingtone(active && !answered);

  if (!active) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Incoming call"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-ink px-6 pt-16 pb-12"
    >
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-steel/70">
          {answered ? "Call in progress" : "Incoming call"}
        </p>
        <p className="mt-6 text-3xl font-semibold tracking-tight text-slate-50">{caller.name}</p>
        <p className="mt-2 font-mono text-[13px] text-steel">{caller.number}</p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-steel/60">
          {caller.role}
        </p>
        <div className="mt-6 flex justify-center">{answered ? <CallTimer /> : null}</div>
      </div>

      <div className="grid place-items-center">
        <div
          className={`grid size-28 place-items-center rounded-full bg-panel ring-1 ring-line ${
            answered ? "" : "sos-pulse"
          }`}
        >
          <span className="font-mono text-xl text-steel">
            {caller.name
              .split(" ")
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={end}
          className="rounded-[14px] bg-alarm py-4 text-sm font-semibold text-alarm-foreground ring-1 ring-alarm/40"
        >
          {answered ? "End call" : "Decline"}
        </button>
        <button
          onClick={answered ? end : onAnswer}
          className="rounded-[14px] bg-panel2 py-4 text-sm font-semibold text-slate-100 ring-1 ring-line"
        >
          {answered ? "Speaker" : "Answer"}
        </button>
      </div>
    </div>
  );
}

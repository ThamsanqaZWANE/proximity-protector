import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSafety, mapsLink } from "@/lib/safety";
import { useFakeCall } from "@/components/FakeCallOverlay";

export const Route = createFileRoute("/record")({
  head: () => ({
    meta: [
      { title: "Evidence Recorder & Decoy Call — A.A Private Security" },
      {
        name: "description",
        content:
          "Capture audio or video evidence with a location stamp, and trigger a realistic decoy incoming call to exit an uncomfortable situation safely.",
      },
      { property: "og:title", content: "Evidence Recorder & Decoy Call — A.A Private Security" },
      {
        property: "og:description",
        content:
          "Discreet audio/video evidence capture with GPS stamping plus a fake incoming call for safe exits.",
      },
    ],
  }),
  component: RecordScreen,
});

type Clip = {
  id: string;
  url: string;
  mode: "audio" | "video";
  seconds: number;
  at: number;
  place: string | null;
};

function RecordScreen() {
  const { coords } = useSafety();
  const { start, pending, caller } = useFakeCall();

  const [mode, setMode] = useState<"audio" | "video">("audio");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [level, setLevel] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const teardown = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLevel(0);
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const meter = (stream: MediaStream) => {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
      setLevel(peak);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const startRecording = async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This device cannot capture audio or video.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        mode === "video" ? { audio: true, video: { facingMode: "environment" } } : { audio: true },
      );
      streamRef.current = stream;
      if (mode === "video" && videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      meter(stream);

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const startedMode = mode;
      const startedPlace = mapsLink(coords);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setClips((prev) =>
          [
            {
              id: `${Date.now()}`,
              url: URL.createObjectURL(blob),
              mode: startedMode,
              seconds,
              at: Date.now(),
              place: startedPlace,
            },
            ...prev,
          ].slice(0, 10),
        );
        teardown();
      };
      recorder.start();
      setSeconds(0);
      setRecording(true);
    } catch {
      setError("Microphone or camera access was denied.");
      teardown();
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <AppShell>
      <div className="px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel/70">
          Evidence capture
        </p>

        <div className="mt-3 grid grid-cols-2 gap-1 rounded-[13px] bg-panel p-1 ring-1 ring-line">
          {(["audio", "video"] as const).map((m) => (
            <button
              key={m}
              onClick={() => !recording && setMode(m)}
              disabled={recording}
              className={`rounded-[10px] py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] ${
                mode === m ? "bg-panel2 text-alarm" : "text-steel"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-[13px] bg-panel p-4 ring-1 ring-line">
          {mode === "video" ? (
            <div className="mb-3 aspect-video overflow-hidden rounded-[11px] bg-ink ring-1 ring-line">
              <video ref={videoRef} muted playsInline className="size-full object-cover" />
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${recording ? "bg-alarm tick-blink" : "bg-steel/50"}`}
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel">
                {recording ? "Recording" : "Standby"}
              </span>
            </span>
            <span className="font-mono text-lg tabular-nums text-slate-100">
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")}
            </span>
          </div>

          <div className="mt-3 flex h-8 items-end gap-1" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className={`flex-1 rounded-sm ${recording ? "bg-alarm/70" : "bg-steel/30"}`}
                style={{
                  height: `${Math.max(8, Math.min(100, level * 130 * (0.6 + ((i * 7) % 10) / 12)))}%`,
                }}
              />
            ))}
          </div>

          <p className="mt-3 font-mono text-[11px] text-steel/60">
            {coords ? `Stamped at ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : "No GPS stamp — start tracking for location"}
          </p>
          {error ? <p className="mt-2 font-mono text-[11px] text-alarm">{error}</p> : null}

          <button
            onClick={recording ? stopRecording : startRecording}
            className={`mt-4 w-full rounded-[11px] py-3.5 text-sm font-semibold tracking-wide ring-1 ${
              recording
                ? "bg-panel2 text-slate-100 ring-line"
                : "bg-alarm text-alarm-foreground ring-alarm/40"
            }`}
          >
            {recording ? "Stop and save clip" : `Start ${mode} recording`}
          </button>
        </div>
      </div>

      <div className="mt-5 px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel/70">
          Decoy incoming call
        </p>
        <div className="mt-2.5 rounded-[13px] bg-panel2 p-4 ring-1 ring-line">
          <p className="text-[13px] text-slate-200">
            Ring your phone as {caller.name} to leave a situation without confrontation.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => start(0)}
              className="rounded-[11px] bg-alarm py-3 text-sm font-semibold text-alarm-foreground ring-1 ring-alarm/40"
            >
              Ring now
            </button>
            <button
              onClick={() => start(10)}
              className="rounded-[11px] bg-panel py-3 text-sm font-semibold text-slate-100 ring-1 ring-line"
            >
              {pending !== null ? `Ringing in ${pending}s` : "Ring in 10 s"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 px-6">
        <p className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-steel/70">
          Saved clips ({clips.length})
        </p>
        {clips.length === 0 ? (
          <p className="rounded-[13px] bg-panel p-4 font-mono text-[11px] text-steel/60 ring-1 ring-line">
            No clips yet. Recordings stay on this device until you share them.
          </p>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-[13px] bg-panel ring-1 ring-line">
            {clips.map((c) => (
              <div key={c.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.14em] text-steel">
                    {c.mode} · {c.seconds}s ·{" "}
                    {new Date(c.at).toLocaleTimeString("en-GB", { hour12: false })}
                  </p>
                  <a
                    href={c.url}
                    download={`aa-evidence-${c.at}.${c.mode === "video" ? "webm" : "webm"}`}
                    className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-200 ring-1 ring-line"
                  >
                    Save
                  </a>
                </div>
                {c.mode === "video" ? (
                  <video src={c.url} controls className="mt-2 w-full rounded-[10px]" />
                ) : (
                  <audio src={c.url} controls className="mt-2 w-full" />
                )}
                {c.place ? (
                  <a
                    href={c.place}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block font-mono text-[11px] text-amber"
                  >
                    Location stamp
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

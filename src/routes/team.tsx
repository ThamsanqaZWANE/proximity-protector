import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { initials, mapsLink, useSafety } from "@/lib/safety";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Emergency Contacts — A.A Private Security" },
      {
        name: "description",
        content:
          "Manage the contacts who receive a notification and your live location whenever you raise an alert with A.A Private Security.",
      },
      { property: "og:title", content: "Emergency Contacts — A.A Private Security" },
      {
        property: "og:description",
        content:
          "Your response team: contacts notified with your live location the moment an alert is raised.",
      },
    ],
  }),
  component: TeamScreen,
});

function TeamScreen() {
  const { contacts, addContact, removeContact, coords, raise } = useSafety();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");

  const link = mapsLink(coords);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    addContact({ name: name.trim(), role: role.trim() || "Contact", phone: phone.trim() });
    setName("");
    setRole("");
    setPhone("");
  };

  const inputClass =
    "w-full rounded-[11px] bg-ink px-3 py-3 font-mono text-[13px] text-slate-100 ring-1 ring-line outline-none placeholder:text-steel/50 focus:ring-alarm/60";

  return (
    <AppShell>
      <div className="space-y-5 px-6">
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel/70">
              Emergency contacts
            </p>
            <span className="font-mono text-[11px] text-steel/60">{contacts.length} ready</span>
          </div>
          <div className="divide-y divide-line overflow-hidden rounded-[13px] bg-panel ring-1 ring-line">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-panel2 font-mono text-[11px] text-steel ring-1 ring-line">
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-slate-100">{c.name}</p>
                  <p className="truncate font-mono text-[11px] text-steel/60">
                    {c.role} · {c.phone}
                  </p>
                </div>
                <a
                  href={`sms:${c.phone.replace(/\s/g, "")}${
                    link ? `?&body=${encodeURIComponent(`I need help. My location: ${link}`)}` : ""
                  }`}
                  className="shrink-0 rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-amber ring-1 ring-amber/40"
                >
                  Alert
                </a>
                <button
                  onClick={() => removeContact(c.id)}
                  aria-label={`Remove ${c.name}`}
                  className="shrink-0 rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-steel ring-1 ring-line"
                >
                  Del
                </button>
              </div>
            ))}
            {contacts.length === 0 ? (
              <p className="p-4 font-mono text-[11px] text-steel/60">
                No contacts yet — add someone who should be alerted.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[13px] bg-panel p-4 ring-1 ring-line">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel/70">
            Add contact
          </p>
          <form onSubmit={submit} className="mt-3 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={inputClass}
            />
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role (e.g. Field lead)"
              className={inputClass}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              inputMode="tel"
              className={inputClass}
            />
            <button
              type="submit"
              className="w-full rounded-[11px] bg-alarm py-3.5 text-sm font-semibold tracking-wide text-alarm-foreground ring-1 ring-alarm/40"
            >
              Save contact
            </button>
          </form>
        </section>

        <section className="rounded-[13px] bg-panel2 p-4 ring-1 ring-line">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel/70">
            Notify everyone
          </p>
          <p className="mt-2 text-[13px] text-slate-200">
            Raises an alert and shares your live location with every contact and the on-call team.
          </p>
          <button
            onClick={() => raise("sos")}
            className="mt-4 w-full rounded-[11px] bg-alarm py-4 text-sm font-semibold tracking-wide text-alarm-foreground ring-1 ring-alarm/40"
          >
            Request help now
          </button>
        </section>
      </div>
    </AppShell>
  );
}

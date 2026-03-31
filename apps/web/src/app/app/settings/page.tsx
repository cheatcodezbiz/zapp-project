"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useCreditStore } from "@/stores/credit-store";
import { formatCredits } from "@/lib/format-credits";

// ---------------------------------------------------------------------------
// Settings Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const address = useAuthStore((s) => s.address);
  const disconnect = useAuthStore((s) => s.disconnect);
  const balance = useCreditStore((s) => s.balanceCents);

  const [displayName, setDisplayName] = useState("");
  const [notifications, setNotifications] = useState({
    deployments: true,
    generation: true,
    security: true,
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, wallet, and preferences.
        </p>
      </div>

      {/* Wallet Section */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Wallet
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Connected Wallet
              </p>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">
                {address ?? "Not connected"}
              </p>
            </div>
            {address && (
              <button
                type="button"
                onClick={disconnect}
                className="rounded-md border border-border bg-secondary px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary/80"
              >
                Disconnect
              </button>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Credit Balance
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Available credits for generation and deployment
              </p>
            </div>
            <span className="text-lg font-bold tabular-nums text-foreground">
              {formatCredits(balance)}
            </span>
          </div>
        </div>
      </section>

      {/* Profile Section */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Profile
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="display-name"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              placeholder="Enter a display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full max-w-md rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Optional. Shown in project attributions.
            </p>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Notifications
        </h2>
        <div className="space-y-4">
          <Toggle
            label="Deployment alerts"
            description="Get notified when deployments complete or fail"
            checked={notifications.deployments}
            onChange={(v) =>
              setNotifications((n) => ({ ...n, deployments: v }))
            }
          />
          <Toggle
            label="Generation updates"
            description="Get notified when code generation completes"
            checked={notifications.generation}
            onChange={(v) =>
              setNotifications((n) => ({ ...n, generation: v }))
            }
          />
          <Toggle
            label="Security alerts"
            description="Get notified about contract security findings"
            checked={notifications.security}
            onChange={(v) => setNotifications((n) => ({ ...n, security: v }))}
          />
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-lg border border-red-500/30 bg-red-500/5 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-red-400">
          Danger Zone
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Delete Account
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Permanently delete your account, projects, and credits.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-md border border-red-500/30 px-4 py-2 text-sm text-red-400 opacity-50 cursor-not-allowed"
          >
            Delete Account
          </button>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Save Changes
        </button>
        {saved && (
          <span className="text-sm text-green-400">Settings saved!</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle component
// ---------------------------------------------------------------------------

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary" : "bg-secondary"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

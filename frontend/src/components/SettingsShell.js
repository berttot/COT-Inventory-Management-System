import React from "react";

function getInitials(name) {
  const safe = (name || "").trim();
  if (!safe) return "U";
  const parts = safe.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase() || "U";
}

export default function SettingsShell({
  title = "Settings",
  subtitle = "Manage your account details and security.",
  roleLabel,
  user,
  activeTab,
  onTabChange,
  tabs,
  children,
}) {
  const name = user?.name || "";
  const email = user?.email || "";
  const accessID = user?.accessID || "";

  return (
    <div className="settings-shell">
      <div className="settings-bg-accent">
        <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-[#0a2a66]/10 blur-3xl" />
        <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-[#f97316]/10 blur-3xl" />
      </div>

      <div className="relative settings-shell-padding">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="settings-title">{title}</h1>
              <p className="settings-subtitle">{subtitle}</p>
            </div>
            {roleLabel && <span className="settings-badge">{roleLabel}</span>}
          </div>

          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            {/* Left: profile + tabs */}
            <aside className="settings-card">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--cot-primary)] text-sm font-bold text-white shadow-sm">
                  {getInitials(name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-slate-900">
                    {name || "Your account"}
                  </div>
                  <div className="truncate text-sm text-slate-600">
                    {email || "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Access ID
                </div>
                <div className="mt-1 font-mono text-sm text-slate-800">
                  {accessID || "—"}
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {tabs.map((t) => {
                  const isActive = t.id === activeTab;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onTabChange(t.id)}
                      className={`settings-tab ${
                        isActive ? "settings-tab-active" : "settings-tab-inactive"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{t.label}</span>
                        <span
                          className={`text-xs ${
                            isActive ? "text-white/70" : "text-slate-400"
                          }`}
                        >
                          →
                        </span>
                      </div>
                      {t.description ? (
                        <div
                          className={
                            isActive ? "settings-tab-desc" : "settings-tab-desc-muted"
                          }
                        >
                          {t.description}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Right: active pane */}
            <section className="settings-card">{children}</section>
          </div>
        </div>
      </div>
    </div>
  );
}


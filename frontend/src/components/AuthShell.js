import React from "react";
import cotLogo from "../image/cotlogo.jpg";

/**
 * Shared auth-page wrapper to keep Login/Forgot/Reset/Register consistent.
 * Styling only — pages keep their own submit/validation logic.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  showBrand = true,
  brandSubtitle = "Secure access to your inventory workspace",
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--cot-surface)] px-4 py-12">
      {/* subtle background accents (theme-matched) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-[#0a2a66]/10 blur-3xl" />
        <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-[#f97316]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-col items-stretch">
        {showBrand && (
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <img
                src={cotLogo}
                alt="COT Logo"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="text-[11px] font-semibold tracking-[0.22em] text-[#0a2a66]/75">
              COT INVENTORY SYSTEM
            </div>
            <div className="mt-1 text-sm text-slate-600">{brandSubtitle}</div>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200/70 bg-white p-7 shadow-[0_14px_50px_rgba(2,6,23,0.10)] sm:p-9">
          {(title || subtitle) && (
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 h-1 w-14 rounded-full bg-gradient-to-r from-[#0a2a66] to-[#f97316]" />
              {title && (
                <h1 className="text-[28px] font-bold tracking-tight text-[#0a2a66]">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
              )}
            </div>
          )}

          {children}

          {footer && (
            <div className="mt-7 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


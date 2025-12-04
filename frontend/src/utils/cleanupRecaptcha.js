export function cleanupRecaptcha() {
  const suppressHandler = (event) => {
    const msg =
      event?.reason?.message ||
      event?.message ||
      "";

    if (msg.includes("Timeout") || msg.includes("recaptcha")) {
      // stop React error overlay
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn("🧩 Silenced harmless reCAPTCHA error");
      return true;
    }
  };

  if (!window.__recaptchaSuppressed) {
    window.addEventListener("unhandledrejection", suppressHandler);
    window.addEventListener("error", suppressHandler);
    window.__recaptchaSuppressed = true;
  }

  console.log("🧹 reCAPTCHA suppression active");
}
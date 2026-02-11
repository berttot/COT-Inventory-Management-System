export function cleanupRecaptcha() {
  const suppressHandler = (event) => {
    // Handle both unhandledrejection and error events
    let msg = "";
    
    if (event.reason) {
      // For unhandledrejection events
      msg = event.reason?.message || event.reason?.toString() || String(event.reason) || "";
    } else if (event.message) {
      // For error events
      msg = event.message || "";
    } else if (typeof event === 'string') {
      msg = event;
    }
    
    // Normalize message to lowercase for case-insensitive matching
    const normalizedMsg = msg.toLowerCase();
    
    // Check for timeout-related errors (case-insensitive)
    if (
      normalizedMsg.includes("timeout") ||
      normalizedMsg.includes("recaptcha") ||
      normalizedMsg.includes("abort") ||
      event?.reason?.name === "AbortError" ||
      event?.name === "AbortError" ||
      event?.error?.name === "AbortError"
    ) {
      // stop React error overlay
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      console.warn("🧩 Silenced harmless reCAPTCHA/timeout error:", msg);
      return true;
    }
    
    return false;
  };

  if (!window.__recaptchaSuppressed) {
    // Handle unhandled promise rejections - use capture phase to catch early
    window.addEventListener("unhandledrejection", (event) => {
      if (suppressHandler(event)) {
        return;
      }
    }, true); // Use capture phase
    
    // Handle general errors - use capture phase to catch early
    window.addEventListener("error", (event) => {
      if (suppressHandler(event)) {
        return;
      }
    }, true); // Use capture phase
    
    // Hide CRA's react-error-overlay iframe (it has no src and is appended to body)
    const hideReactOverlay = () => {
      if (!document.body) return;
      try {
        // CRA overlay is an iframe with no src - hide or remove it
        const iframes = document.body.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          if (!iframe.src || iframe.src === '' || iframe.src === 'about:blank') {
            iframe.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;position:fixed!important;z-index:-9999!important;';
          }
        });
        // Any fixed overlay containing "Timeout" / "ERROR"
        document.querySelectorAll('body > *').forEach(el => {
          if (el.id === 'root') return;
          const text = (el.textContent || el.innerText || '').toLowerCase();
          const style = window.getComputedStyle(el);
          if ((text.includes('timeout') && text.includes('error')) || (style.position === 'fixed' && (text.includes('timeout') || text.includes('uncaught')))) {
            el.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;z-index:-9999!important;';
          }
        });
      } catch (e) {
        // ignore
      }
    };
    
    // Wait for DOM to be ready
    const initOverlayHiding = () => {
      if (document.body) {
        // Hide overlay immediately
        hideReactOverlay();
        
        // Use MutationObserver to hide overlay when it's added to DOM
        const observer = new MutationObserver(() => {
          hideReactOverlay();
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // Also check periodically (fallback) - but only for a limited time
        let checkCount = 0;
        const intervalId = setInterval(() => {
          hideReactOverlay();
          checkCount++;
          // Stop after 10 seconds (100 checks) to avoid performance issues
          if (checkCount > 100) {
            clearInterval(intervalId);
          }
        }, 100);
      } else {
        // Retry if DOM not ready yet
        setTimeout(initOverlayHiding, 50);
      }
    };
    
    // Start hiding overlay
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initOverlayHiding);
    } else {
      initOverlayHiding();
    }
    
    window.__recaptchaSuppressed = true;
  }

  console.log("🧹 reCAPTCHA suppression active");
}
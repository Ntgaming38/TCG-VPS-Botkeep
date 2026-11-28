import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const SHELL_HEAL_KEY = "tcg-shell-heal-attempted";

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch() {
    // A stale app shell — a cached index.html whose content-hashed build
    // assets no longer exist on the server after a deploy — surfaces here as
    // a failed lazy-chunk load, and pressing Reload can never heal it: the
    // service worker serves the same broken shell again. Recover once per
    // session by dropping every cache and the service worker registration,
    // then reloading so the app fetches one consistent shell. If the error
    // comes back after that, the normal error screen below stays (no loop).
    let alreadyAttempted = true;
    try {
      alreadyAttempted = sessionStorage.getItem(SHELL_HEAL_KEY) === "1";
      if (!alreadyAttempted) sessionStorage.setItem(SHELL_HEAL_KEY, "1");
    } catch {
      alreadyAttempted = true;
    }
    if (alreadyAttempted) return;
    void (async () => {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }
      } catch {
        // Reload regardless — a fresh fetch is the point of the heal.
      }
      window.location.reload();
    })();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">An unexpected error occurred.</h2>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.stack}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

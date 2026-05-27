import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
          <div className="max-w-lg w-full rounded-2xl border border-red-100 bg-white p-8 shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="mb-2 text-lg font-bold text-gray-900">Something went wrong</h2>
            <p className="mb-4 text-sm text-gray-500">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <pre className="mb-6 max-h-40 overflow-auto rounded-xl bg-gray-50 p-3 text-[11px] text-red-600 border border-red-100">
              {this.state.error?.stack?.slice(0, 600)}
            </pre>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/"; }}
              className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

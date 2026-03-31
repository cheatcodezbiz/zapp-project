"use client";

import React from "react";

// ---------------------------------------------------------------------------
// ErrorBoundary — catches render errors in the preview panel
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              Something went wrong in the preview
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Try asking Zapp AI to fix it, or click retry below.
            </p>
          </div>
          {this.state.error && (
            <pre className="max-w-md overflow-auto rounded-lg bg-gray-800 p-3 text-left text-xs text-red-300">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleRetry}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

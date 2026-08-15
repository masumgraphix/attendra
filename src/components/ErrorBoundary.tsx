import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  info: string | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, info: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Still log to console so it shows up in dev tools as before.
    console.error('Attendra crashed while rendering:', error, errorInfo);
    this.setState({ info: errorInfo.componentStack || null });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-xl w-full bg-white border border-rose-200 rounded-3xl shadow-xl p-6 space-y-4">
            <h1 className="text-lg font-extrabold text-rose-700">Something went wrong while rendering this page</h1>
            <p className="text-sm text-slate-600">
              An unexpected error occurred, so the app stopped instead of showing a blank screen. The details below
              will help fix the underlying bug — please copy this text when reporting the issue.
            </p>
            <pre className="text-xs bg-slate-900 text-rose-300 p-4 rounded-2xl overflow-auto max-h-64 whitespace-pre-wrap">
              {this.state.error?.name}: {this.state.error?.message}
              {this.state.info ? `\n\n${this.state.info}` : ''}
            </pre>
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

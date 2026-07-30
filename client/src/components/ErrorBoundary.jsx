import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl m-4 space-y-4">
          <h2 className="text-xl font-bold text-rose-400">⚠️ Component Render Notice</h2>
          <p className="text-sm text-slate-300">
            {this.state.error?.toString() || 'An error occurred while loading this view.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg"
          >
            Retry Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

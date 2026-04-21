import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFFCF5] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white border border-[#EADDCD] rounded-3xl p-8 shadow-premium text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-black text-[#2A0800] mb-2 font-display">Something went wrong.</h1>
            <p className="text-[#8E7B73] font-bold text-sm mb-6">
              We encountered an unexpected error while rendering this page. Our engineers have been notified.
            </p>
            
            {this.state.error && (
              <div className="bg-red-50 p-4 rounded-xl text-left mb-6 overflow-auto max-h-32 text-xs text-red-600 font-mono border border-red-100">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => window.location.reload()} 
                className="flex-1 bg-[#FFFCF5] border-2 border-[#EADDCD] hover:border-[#F7B538] text-[#2A0800] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <RefreshCcw size={16} /> Refresh
              </button>
              <button 
                onClick={() => window.location.href = '/'} 
                className="flex-1 bg-[#780116] hover:bg-[#A00320] text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-premium transition-all"
              >
                <Home size={16} /> Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render(): ReactNode {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      
      try {
        // Try to parse Firestore error JSON
        if (error?.message) {
          const parsed = JSON.parse(error.message);
          if (parsed.error && parsed.error.includes('permission-denied')) {
            errorMessage = 'Permissão insuficiente para realizar esta operação.';
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
          <div className="max-w-md w-full bg-white rounded-[40px] p-12 shadow-2xl border border-black/5 text-center space-y-8">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-zinc-900">Ups! Algo correu mal</h2>
              <p className="text-zinc-500">{errorMessage}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all flex items-center justify-center space-x-3"
            >
              <RefreshCw size={20} />
              <span>Recarregar Página</span>
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

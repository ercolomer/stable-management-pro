"use client";

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualiza el estado para que el siguiente renderizado muestre la UI de error
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Solo logear errores que no sean de DOM manipulation
    if (!error.message.includes('removeChild') && 
        !error.message.includes('insertBefore') &&
        !error.message.includes('The node to be removed is not a child')) {
      console.error('Error boundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Si es un error de DOM manipulation, simplemente renderiza los children sin error
      const error = this.state.error;
      if (error && (
        error.message.includes('removeChild') || 
        error.message.includes('insertBefore') ||
        error.message.includes('The node to be removed is not a child')
      )) {
        // Para errores de DOM, simplemente resetea y continúa
        this.setState({ hasError: false, error: undefined });
        return this.props.children;
      }

      // Para otros errores, muestra el fallback si existe
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={error!} 
            reset={() => this.setState({ hasError: false, error: undefined })}
          />
        );
      }

      // Fallback por defecto
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Algo salió mal</h2>
            <p className="text-muted-foreground mb-4">Ha ocurrido un error inesperado.</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 
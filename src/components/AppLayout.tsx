import React, { useState, useEffect } from 'react';
import { LandingPage } from './daw/LandingPage';
import { DAWInterface } from './daw/DAWInterface';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

const HERO_IMAGE = 'https://d64gsuwffb70l.cloudfront.net/6951db99354ded782498388f_1766972419220_cbbfdb2f.jpg';
const WAVE_IMAGE = 'https://d64gsuwffb70l.cloudfront.net/6951db99354ded782498388f_1766972438300_dbc886b2.png';

const AppLayout: React.FC = () => {
  const [showDAW, setShowDAW] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const handleStartProject = async () => {
    setIsLoading(true);
    setAudioError(null);
    
    try {
      // Initialize audio context (required for Web Audio API)
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        throw new Error('Web Audio API not supported in this browser');
      }
      
      // Simulate initialization delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setShowDAW(true);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Failed to initialize audio system');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLanding = () => {
    setShowDAW(false);
    setAudioError(null);
  };

  if (showDAW) {
    return (
      <ErrorBoundary 
        fallback={
          <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-2xl font-bold mb-4">Audio System Error</h2>
              <p className="text-gray-300 mb-4">Please refresh the page and try again.</p>
              <button 
                onClick={handleBackToLanding}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        }
      >
        <DAWInterface onBack={handleBackToLanding} />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-cyan-900">
      <LandingPage
        onStartProject={handleStartProject}
        heroImage={HERO_IMAGE}
        waveImage={WAVE_IMAGE}
        isLoading={isLoading}
        error={audioError}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
            <p className="text-white">Initializing Audio System...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;

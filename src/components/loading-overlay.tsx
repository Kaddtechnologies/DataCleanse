"use client";

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getRandomMessageFromAnyCategory } from '@/lib/waiting-messages';

interface LoadingOverlayProps {
  isVisible: boolean;
  estimatedTime?: { minutes: number; seconds: number; totalTimeSeconds: number } | null;
}

export function LoadingOverlay({ isVisible, estimatedTime }: LoadingOverlayProps) {
  const [message, setMessage] = useState("Processing your files, please wait...");
  const [showRandomMessages, setShowRandomMessages] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setShowRandomMessages(false);
      setMessage("Processing your files, please wait...");
      return;
    }

    // Start showing random messages after 10 seconds
    const initialDelay = setTimeout(() => {
      setShowRandomMessages(true);
      setMessage(getRandomMessageFromAnyCategory());
    }, 10000);

    // Update message every 10 seconds after initial delay
    let messageInterval: NodeJS.Timeout | null = null;
    if (showRandomMessages) {
      messageInterval = setInterval(() => {
        setMessage(getRandomMessageFromAnyCategory());
      }, 10000);
    }

    // Cleanup function
    return () => {
      clearTimeout(initialDelay);
      if (messageInterval) {
        clearInterval(messageInterval);
      }
    };
  }, [isVisible, showRandomMessages]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-center text-sm text-muted-foreground animate-fade-in">
            {message}
          </p>
          
          {estimatedTime && (
            <div className="mt-2 text-xs text-center">
              <p className="text-muted-foreground">
                Estimated time remaining:
                <span className="font-medium ml-1">
                  ~{estimatedTime.minutes > 0 ? `${estimatedTime.minutes} minute${estimatedTime.minutes !== 1 ? 's' : ''}` : ''}
                  {estimatedTime.seconds > 0 ? `${estimatedTime.minutes > 0 ? ' ' : ''}${estimatedTime.seconds} second${estimatedTime.seconds !== 1 ? 's' : ''}` : ''}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

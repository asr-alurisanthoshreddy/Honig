import React, { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

const BeforeUnloadWarning: React.FC = () => {
  const { isGuestMode, messages } = useChatStore();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only warn if user is in guest mode and has messages
      if (isGuestMode && messages.length > 0) {
        const message = 'You have unsaved conversations that will be lost if you leave. Sign in to save your progress.';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isGuestMode, messages.length]);

  return null; // This component doesn't render anything
};

export default BeforeUnloadWarning;
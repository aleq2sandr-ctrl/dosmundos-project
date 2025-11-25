import { useState, useEffect } from 'react';

// Peru is UTC-5
const PERU_OFFSET = -5;

const useLiveStatus = () => {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const checkLiveStatus = () => {
      // For now, use the same logic as LivePage
      // In the future, this could check an actual streaming endpoint
      const now = new Date();
      const currentUtc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const peruTime = new Date(currentUtc + (3600000 * PERU_OFFSET));

      // Check if it's Wednesday between 9:30 AM and 11:30 AM Peru time (2-hour window)
      if (peruTime.getDay() === 3) {
        const hours = peruTime.getHours();
        const minutes = peruTime.getMinutes();
        
        // 9:30 AM = 9 hours, 30 minutes
        // 11:30 AM = 11 hours, 30 minutes
        if ((hours === 9 && minutes >= 30) || (hours === 10) || (hours === 11 && minutes <= 30)) {
          setIsLive(true);
          return;
        }
      }
      
      setIsLive(false);
    };

    // Check immediately
    checkLiveStatus();
    
    // Check every minute
    const interval = setInterval(checkLiveStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  return isLive;
};

export default useLiveStatus;

// Service to check real stream status from VPS
class StreamStatusService {
  constructor() {
    this.vpsUrl = 'https://dosmundos.pe';
    this.checkInterval = 5000; // Check every 5 seconds
    this.isChecking = false;
    this.lastStatus = null;
    this.listeners = [];
  }

  // Add listener for status changes
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners of status change
  notifyListeners(status) {
    this.listeners.forEach(callback => callback(status));
  }

  // Check if HLS stream is actually available
  async checkHLSStream(streamKey = '1') {
    try {
      const hlsUrl = `${this.vpsUrl}/hls/${streamKey}.m3u8`;
      
      // Create a HEAD request to check if stream exists
      const response = await fetch(hlsUrl, { 
        method: 'HEAD',
        mode: 'no-cors' // This will handle CORS issues
      });
      
      // If no CORS error and response is ok, stream is likely active
      return true;
    } catch (error) {
      // Try alternative method - check if we can load the playlist
      try {
        const playlistResponse = await fetch(`${this.vpsUrl}/api/stream-status`);
        if (playlistResponse.ok) {
          const data = await playlistResponse.json();
          return data.isLive || data.active;
        }
      } catch (apiError) {
        console.log('API check failed, trying direct playlist check');
      }
      
      return false;
    }
  }

  // Check VPS stream manager API for status
  async checkVPSStatus() {
    try {
      // Try to get status from stream manager
      const response = await fetch(`${this.vpsUrl}/api/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const status = await response.json();
        return {
          isLive: status.isLive || status.streamActive,
          platforms: status.platforms || {},
          startTime: status.startTime,
          viewers: status.viewers
        };
      }
    } catch (error) {
      console.log('VPS API check failed:', error.message);
    }

    return null;
  }

  // Check YouTube stream status
  async checkYouTubeStatus() {
    try {
      // This would require YouTube API key
      // For now, return null - we'll rely on HLS check
      return null;
    } catch (error) {
      return null;
    }
  }

  // Main status check method
  async checkStreamStatus() {
    if (this.isChecking) return this.lastStatus;

    this.isChecking = true;

    try {
      // Check HLS stream first (most reliable)
      const hlsActive = await this.checkHLSStream();
      
      // Check VPS API for additional info
      const vpsStatus = await this.checkVPSStatus();

      const status = {
        isLive: hlsActive || (vpsStatus && vpsStatus.isLive),
        hlsActive,
        platforms: {
          dosmundos: hlsActive,
          youtube: vpsStatus?.platforms?.youtube || false,
          facebook: vpsStatus?.platforms?.facebook || false,
          restream: vpsStatus?.platforms?.restream || false
        },
        startTime: vpsStatus?.startTime || null,
        viewers: vpsStatus?.viewers || 0,
        lastChecked: new Date()
      };

      // Notify listeners if status changed
      if (JSON.stringify(status) !== JSON.stringify(this.lastStatus)) {
        this.notifyListeners(status);
      }

      this.lastStatus = status;
      return status;

    } catch (error) {
      console.error('Stream status check failed:', error);
      
      const errorStatus = {
        isLive: false,
        hlsActive: false,
        platforms: {},
        error: error.message,
        lastChecked: new Date()
      };

      this.lastStatus = errorStatus;
      return errorStatus;
    } finally {
      this.isChecking = false;
    }
  }

  // Start continuous checking
  startChecking() {
    if (this.checkTimer) return;

    this.checkTimer = setInterval(() => {
      this.checkStreamStatus();
    }, this.checkInterval);

    // Initial check
    this.checkStreamStatus();
  }

  // Stop continuous checking
  stopChecking() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  // Get current status without checking
  getCurrentStatus() {
    return this.lastStatus;
  }

  // Cleanup
  destroy() {
    this.stopChecking();
    this.listeners = [];
  }
}

export default StreamStatusService;

import { describe, it, expect, vi, beforeEach } from 'vitest';
import syncService from '../lib/syncService.js';

// Mock the dependencies
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn()
  }
}));

vi.mock('../lib/offlineDataService', () => ({
  default: {
    init: vi.fn(),
    saveTranscript: vi.fn(),
    getTranscript: vi.fn()
  }
}));

vi.mock('../lib/logger', () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('SyncService HTTP/2 Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retry on HTTP/2 protocol errors', async () => {
    const { supabase } = await import('../lib/supabaseClient');
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
    };
    
    supabase.from.mockReturnValue(mockQuery);

    // Simulate HTTP/2 error on first two attempts, success on third
    mockQuery.maybeSingle
      .mockRejectedValueOnce(new Error('ERR_HTTP2_PROTOCOL_ERROR'))
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce({
        data: {
          id: 1,
          episode_slug: '2025-10-22_ru',
          lang: 'ru',
          edited_transcript_data: { utterances: [], words: [], text: '' }
        },
        error: null
      });

    const result = await syncService.loadDataFromServer('transcript', {
      episodeSlug: '2025-10-22_ru',
      lang: 'ru'
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(mockQuery.maybeSingle).toHaveBeenCalledTimes(3);
  });

  it('should fall back to cache after max retries on HTTP/2 errors', async () => {
    const { supabase } = await import('../lib/supabaseClient');
    const { default: offlineDataService } = await import('../lib/offlineDataService');
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
    };
    
    supabase.from.mockReturnValue(mockQuery);
    
    // Always fail with HTTP/2 error
    mockQuery.maybeSingle.mockRejectedValue(new Error('ERR_HTTP2_PROTOCOL_ERROR'));
    
    // Mock cache data
    offlineDataService.getTranscript.mockResolvedValue({
      id: 1,
      utterances: [],
      words: [],
      text: 'Cached transcript'
    });

    const result = await syncService.loadData('transcript', {
      episodeSlug: '2025-10-22_ru',
      lang: 'ru'
    });

    expect(result.source).toBe('cache');
    expect(result.data.text).toBe('Cached transcript');
  });

  it('should handle non-HTTP/2 errors normally', async () => {
    const { supabase } = await import('../lib/supabaseClient');
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
    };
    
    supabase.from.mockReturnValue(mockQuery);
    
    // Fail with non-HTTP/2 error
    mockQuery.maybeSingle.mockRejectedValue(new Error('Database connection failed'));

    await expect(
      syncService.loadDataFromServer('transcript', {
        episodeSlug: '2025-10-22_ru',
        lang: 'ru'
      })
    ).rejects.toThrow('Database connection failed');

    expect(mockQuery.maybeSingle).toHaveBeenCalledTimes(1);
  });
});

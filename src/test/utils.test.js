import { formatTime, getFileExtension, getFileNameWithoutExtension } from '../lib/utils';

describe('utils', () => {
  describe('formatTime', () => {
    test('formats seconds to mm:ss', () => {
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(3661)).toBe('1:01:01');
    });

    test('handles invalid input', () => {
      expect(formatTime(NaN)).toBe('0:00');
      expect(formatTime(-1)).toBe('0:00');
    });
  });

  describe('getFileExtension', () => {
    test('returns file extension', () => {
      expect(getFileExtension('file.mp3')).toBe('mp3');
      expect(getFileExtension('file.wav')).toBe('wav');
      expect(getFileExtension('file')).toBe('');
    });
  });

  describe('getFileNameWithoutExtension', () => {
    test('removes extension from filename', () => {
      expect(getFileNameWithoutExtension('file.mp3')).toBe('file');
      expect(getFileNameWithoutExtension('file.wav')).toBe('file');
      expect(getFileNameWithoutExtension('file')).toBe('file');
    });
  });
});
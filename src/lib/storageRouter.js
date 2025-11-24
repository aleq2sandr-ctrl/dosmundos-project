// Упрощённый storageRouter - прямая загрузка на VPS
// Старая версия с S3/Hostinger перемещена в deprecated/

const ENV_API_URL_PRIMARY = import.meta.env.VITE_API_URL || 'https://api.dosmundos.pe/api';
const ENV_API_URL_BACKUP = import.meta.env.VITE_API_URL_BACKUP || null;
const AUDIO_PUBLIC_BASE = import.meta.env.VITE_AUDIO_PUBLIC_BASE || 'https://dosmundos.pe/files/audio';

// Максимально простой режим: используем только same-origin /api
const getApiBaseCandidates = () => ['/api'];

const isLikelyNetworkOrDnsError = (error) => {
  const message = (error && error.message) ? error.message : String(error || '');
  return (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('ERR_NAME_NOT_RESOLVED') ||
    message.includes('ERR_TUNNEL_CONNECTION_FAILED') ||
    message.includes('ERR_CONNECTION_REFUSED') ||
    message.includes('ERR_CONNECTION_RESET') ||
    message.includes('ERR_INTERNET_DISCONNECTED') ||
    message.includes('timeout') ||
    message.includes('aborted') ||
    (error && error.name === 'AbortError') ||
    (error && error.name === 'TypeError' && message.includes('fetch'))
  );
};

/**
 * Загрузка файла на VPS - упрощенная версия с fallback
 */
export const uploadFile = async (file, onProgress = null, currentLanguage = null, filename = null) => {
  const formData = new FormData();
  formData.append('file', file);

  // Сначала пытаемся загрузить через API сервер
  const bases = getApiBaseCandidates();
  let lastError = null;

  for (const base of bases) {
    try {
      console.log(`[uploadFile] Trying API upload to: ${base}/upload`);

      const xhr = new XMLHttpRequest();
      const result = await new Promise((resolve) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const percentComplete = (e.loaded / e.total) * 100;
            const details = { loaded: e.loaded, total: e.total, percent: percentComplete };
            onProgress(percentComplete, details);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({
                ok: true,
                value: {
                  fileUrl: response.file.url,
                  fileKey: response.file.filename,
                  bucketName: 'vps'
                }
              });
            } catch (err) {
              console.warn('[uploadFile] Failed to parse API response:', err);
              resolve({ ok: false, error: new Error('Failed to parse response') });
            }
          } else {
            console.warn(`[uploadFile] API upload failed with status ${xhr.status}: ${xhr.responseText}`);
            resolve({ ok: false, error: new Error(`Upload failed with status ${xhr.status}`) });
          }
        });

        xhr.addEventListener('error', () => {
          console.warn('[uploadFile] Network error during API upload');
          resolve({ ok: false, error: new Error('Network error during upload') });
        });

        xhr.open('POST', `${base}/upload`);
        xhr.send(formData);
      });

      if (result.ok) {
        console.log('[uploadFile] API upload successful:', result.value);
        return result.value;
      }

      lastError = result.error;
      if (!isLikelyNetworkOrDnsError(lastError)) break;
    } catch (error) {
      console.warn('[uploadFile] Exception during API upload:', error);
      lastError = error;
      if (!isLikelyNetworkOrDnsError(error)) break;
    }
  }

  // Fallback: если API недоступен, показываем понятное сообщение об ошибке
  console.error('[uploadFile] All API endpoints failed. Last error:', lastError);

  // Показываем пользователю понятную ошибку
  const errorMessage = lastError?.message?.includes('Failed to fetch') || lastError?.message?.includes('NetworkError')
    ? 'Сервер загрузки файлов недоступен. Проверьте подключение к интернету.'
    : lastError?.message || 'Неизвестная ошибка загрузки';

  throw new Error(`Загрузка файла не удалась: ${errorMessage}`);
};

/**
 * Получение списка файлов
 */
export const listFiles = async () => {
  const bases = getApiBaseCandidates();
  let lastError;
  for (const base of bases) {
    try {
      const response = await fetch(`${base}/upload/files`);
      if (!response.ok) {
        lastError = new Error(`Failed to list files: ${response.statusText}`);
        break;
      }
      const data = await response.json();
      return data.files || [];
    } catch (e) {
      lastError = e;
      if (!isLikelyNetworkOrDnsError(e)) break;
    }
  }
  throw lastError || new Error('Failed to list files');
};

/**
 * Удаление файла
 */
export const deleteFile = async (filename) => {
  const bases = getApiBaseCandidates();
  let lastError;
  for (const base of bases) {
    try {
      const response = await fetch(`${base}/upload/${filename}`, { method: 'DELETE' });
      if (!response.ok) {
        lastError = new Error(`Failed to delete file: ${response.statusText}`);
        break;
      }
      return await response.json();
    } catch (e) {
      lastError = e;
      if (!isLikelyNetworkOrDnsError(e)) break;
    }
  }
  throw lastError || new Error('Failed to delete file');
};

/**
 * Получение информации о файле
 */
export const getFileInfo = async (filename) => {
  // В dev режиме отключаем сетевые проверки информации о файле,
  // чтобы не плодить лишние 404 при предварительных проверках
  if (import.meta.env && import.meta.env.DEV) {
    throw new Error('File info check disabled in dev');
  }
  const bases = getApiBaseCandidates();
  let lastError;
  for (const base of bases) {
    try {
      const response = await fetch(`${base}/upload/info/${filename}`);
      if (!response.ok) {
        lastError = new Error(`Failed to get file info: ${response.statusText}`);
        break;
      }
      const data = await response.json();
      return data.file;
    } catch (e) {
      lastError = e;
      if (!isLikelyNetworkOrDnsError(e)) break;
    }
  }
  throw lastError || new Error('Failed to get file info');
};

/**
 * Проверка существования файла
 */
export const checkFileExists = async (filename) => {
  // В dev режиме не делаем сетевые запросы для проверки существования
  if (import.meta.env && import.meta.env.DEV) {
    return { exists: false, fileUrl: null, bucketName: null };
  }
  let timeoutId;
  const bases = getApiBaseCandidates();
  for (const base of bases) {
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${base}/upload/info/${encodeURIComponent(filename)}`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        return { exists: false, fileUrl: null, bucketName: null };
      }
      if (!response.ok) {
        console.warn(`File check failed with status ${response.status}: ${response.statusText}`);
        return { exists: false, fileUrl: null, bucketName: null };
      }

      const data = await response.json();
      const fileInfo = data.file;
      return { exists: true, fileUrl: fileInfo.url, bucketName: 'vps' };
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (isLikelyNetworkOrDnsError(error)) {
        console.warn(`File existence check failed on ${base} (network/DNS), trying next:`, error?.message || String(error));
        continue;
      }
      console.warn(`File existence check failed, assuming file doesn't exist:`, error?.message || String(error));
      return { exists: false, fileUrl: null, bucketName: null };
    }
  }
  return { exists: false, fileUrl: null, bucketName: null };
};


// Экспорт по умолчанию
export default {
  uploadFile,
  listFiles,
  deleteFile,
  getFileInfo,
  checkFileExists
};

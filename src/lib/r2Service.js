// Минимальный r2Service для совместимости
// Задача: вернуть корректный URL для аудио
// - Если в БД уже сохранен абсолютный audio_url — используем его
// - Fallback для совместимости со старыми записями: собрать URL по имени файла

const AUDIO_PUBLIC_BASE = import.meta.env.VITE_AUDIO_PUBLIC_BASE || 'https://dosmundos.pe/files/audio';

const getCompatibleUrl = (audioUrl, r2ObjectKey, _r2BucketName) => {
	if (audioUrl && typeof audioUrl === 'string') {
		return audioUrl;
	}
	if (r2ObjectKey && typeof r2ObjectKey === 'string') {
		return `${AUDIO_PUBLIC_BASE}/${encodeURIComponent(r2ObjectKey)}`;
	}
	return null;
};

const checkFileExists = async (r2ObjectKey) => {
	if (!r2ObjectKey) return { exists: false };
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 5000);
	try {
		const res = await fetch(`${AUDIO_PUBLIC_BASE}/${encodeURIComponent(r2ObjectKey)}`, {
			method: 'HEAD',
			signal: controller.signal
		});
		clearTimeout(timeout);
		return { exists: res.ok };
	} catch {
		clearTimeout(timeout);
		return { exists: false };
	}
};

export default {
	getCompatibleUrl,
	checkFileExists,
};



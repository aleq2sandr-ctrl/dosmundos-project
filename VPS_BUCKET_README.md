# VPS Transcript Storage Bucket

## Обзор
Приложение использует VPS для хранения транскриптов вместо Supabase Storage. Файлы хранятся в директории `/var/storage/transcript/` на сервере.

## Структура хранилища

### Локация
```
VPS Server: 72.61.186.175
Путь: /var/storage/transcript/
Пользователь: root
```

### Именование файлов
```
{episode_slug}-{lang}-full.json
Пример: episode-123-en-full.json
```

## Доступ к файлам

### Через веб-интерфейс
Файлы доступны по URL:
```
https://dosmundos.pe/files/transcript/{filename}
```

### Через SSH
```bash
# Подключение к серверу
ssh root@72.61.186.175

# Просмотр файлов
ls -la /var/storage/transcript/

# Скачивание файла
scp root@72.61.186.175:/var/storage/transcript/episode-123-en-full.json ./local-file.json

# Загрузка файла
scp ./local-file.json root@72.61.186.175:/var/storage/transcript/
```

### Через SFTP
```bash
sftp root@72.61.186.175
cd /var/storage/transcript/
ls
get episode-123-en-full.json
put local-file.json
```

## Программный доступ

### Через transcriptStorageService.js
```javascript
import { saveFullTranscriptToStorage } from '@/lib/transcriptStorageService';

// Сохранение транскрипта
const result = await saveFullTranscriptToStorage('episode-slug', 'en', transcriptData);
if (result.success) {
  console.log('Saved to:', result.url); // https://dosmundos.pe/files/transcript/episode-slug-en-full.json
}
```

### Ручная загрузка через SCP
```javascript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const uploadToVPS = async (localFilePath, remoteFileName) => {
  const scpCommand = `scp -o StrictHostKeyChecking=no "${localFilePath}" "root@72.61.186.175:/var/storage/transcript/${remoteFileName}"`;
  await execAsync(scpCommand);
  return `https://dosmundos.pe/files/transcript/${remoteFileName}`;
};
```

## Управление хранилищем

### Очистка старых temp файлов
Приложение автоматически очищает temp файлы старше 1 часа при запуске и каждый час во время работы.

### Мониторинг
```bash
# Проверка размера хранилища
ssh root@72.61.186.175 "du -sh /var/storage/transcript/"

# Количество файлов
ssh root@72.61.186.175 "ls /var/storage/transcript/ | wc -l"

# Поиск файлов по эпизоду
ssh root@72.61.186.175 "ls /var/storage/transcript/ | grep episode-123"
```

## Безопасность
- Файлы доступны только для чтения через веб
- SSH доступ защищен ключом
- Temp файлы автоматически очищаются

## Конфигурация
Настройки в `.env`:
```
VPS_IP=72.61.186.175
VPS_USER=root
SUPABASE_SERVICE_ROLE_KEY= # Требуется для обновления БД
```

## Миграция с Supabase
Если нужно перенести существующие файлы:
```bash
# Скачать из Supabase и загрузить на VPS
# Обновить storage_url в базе данных
```

## Техническая поддержка
При проблемах с доступом:
1. Проверить SSH соединение: `ssh root@72.61.186.175`
2. Проверить наличие файлов: `ls /var/storage/transcript/`
3. Проверить веб-доступ: открыть URL в браузере

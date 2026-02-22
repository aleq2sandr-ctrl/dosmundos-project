import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMissingEnglishTranscripts() {
  console.log('=== Проверка эпизодов с испанскими транскрибациями, но без английских ===\n');

  // Шаг 1: Получить все транскрибации из базы данных
  const { data: allTranscripts, error: transcriptsError } = await supabase
    .from('transcripts')
    .select('episode_slug, lang');

  if (transcriptsError) {
    console.error('Ошибка при получении транскрибаций из базы:', transcriptsError);
    return;
  }

  // Шаг 2: Группировать транскрибации по эпизодам и языкам
  const episodes = {};
  allTranscripts.forEach(t => {
    if (!episodes[t.episode_slug]) {
      episodes[t.episode_slug] = new Set();
    }
    episodes[t.episode_slug].add(t.lang);
  });

  // Шаг 3: Найти эпизоды с испанским, но без английского
  const missingEnTranscripts = [];
  Object.entries(episodes).forEach(([slug, langs]) => {
    if (langs.has('es') && !langs.has('en')) {
      missingEnTranscripts.push(slug);
    }
  });

  // Шаг 4: Проверить наличие файлов транскрибаций в локальных папках
  // Проверяю все папки, где могут быть транскрипты
  const searchPaths = [
    process.cwd(),
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'src'),
    path.join(process.cwd(), 'data')
  ];

  const localESFiles = [];
  const localENFiles = [];

  searchPaths.forEach(searchPath => {
    try {
      if (fs.existsSync(searchPath)) {
        const files = fs.readdirSync(searchPath, { recursive: true });
        files.forEach(file => {
          const fullPath = path.join(searchPath, file);
          if (file.endsWith('_ES.json') || file.includes('_ES_')) {
            localESFiles.push({ file, path: fullPath, slug: extractSlug(file) });
          } else if (file.endsWith('_EN.json') || file.includes('_EN_')) {
            localENFiles.push({ file, path: fullPath, slug: extractSlug(file) });
          }
        });
      }
    } catch (error) {
      // Игнорируем ошибки доступа к папкам
    }
  });

  // Создаем множества для быстрого поиска
  const localESSlugs = new Set(localESFiles.map(f => f.slug));
  const localENSlugs = new Set(localENFiles.map(f => f.slug));

  // Найти локальные ES файлы без соответствующих EN
  const missingLocalEN = [];
  localESFiles.forEach(file => {
    if (!localENSlugs.has(file.slug)) {
      missingLocalEN.push(file);
    }
  });

  // Шаг 5: Вывод результатов
  console.log('=== Результаты проверки в базе данных ===');
  if (missingEnTranscripts.length > 0) {
    console.log(`Найдено ${missingEnTranscripts.length} эпизодов с испанскими транскрибациями, но без английских:`);
    missingEnTranscripts.forEach(slug => console.log(`- ${slug}`));
  } else {
    console.log('Все эпизоды с испанскими транскрибациями имеют соответствующие английские версии в базе данных');
  }

  console.log('\n=== Результаты проверки локальных файлов ===');
  if (missingLocalEN.length > 0) {
    console.log(`Найдено ${missingLocalEN.length} локальных файлов с испанскими транскрибациями, но без английских:`);
    missingLocalEN.forEach(file => console.log(`- ${file.slug} (${file.file})`));
  } else {
    console.log('Все локальные файлы с испанскими транскрибациями имеют соответствующие английские версии');
  }

  // Шаг 6: Сравнить результаты
  console.log('\n=== Сравнение базы данных и локальных файлов ===');
  const dbSlugsSet = new Set(missingEnTranscripts);
  const localSlugsSet = new Set(missingLocalEN.map(f => f.slug));
  
  const onlyInDB = missingEnTranscripts.filter(slug => !localSlugsSet.has(slug));
  const onlyInLocal = missingLocalEN.filter(file => !dbSlugsSet.has(file.slug));
  
  if (onlyInDB.length > 0) {
    console.log(`В базе данных есть ${onlyInDB.length} эпизодов, которых нет в локальных файлах:`);
    onlyInDB.forEach(slug => console.log(`- ${slug}`));
  }
  
  if (onlyInLocal.length > 0) {
    console.log(`В локальных файлах есть ${onlyInLocal.length} эпизодов, которых нет в базе данных:`);
    onlyInLocal.forEach(file => console.log(`- ${file.slug}`));
  }
}

function extractSlug(filename) {
  // Извлекает slug из имени файла, например: 2019-06-26_ES_assemblyai_edit.json -> 2019-06-26
  let slug = filename;
  
  // Удалить суффиксы
  slug = slug.replace(/_ES\.json$|_ES_.*\.json$|_EN\.json$|_EN_.*\.json$/, '');
  
  // Удалить возможные префиксы
  slug = slug.replace(/.*[\\/]/, '');
  
  return slug;
}

checkMissingEnglishTranscripts().catch(error => {
  console.error('Произошла ошибка:', error);
});

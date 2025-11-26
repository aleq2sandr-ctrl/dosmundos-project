import { supabase } from '@/lib/supabaseClient';
import { getLocaleString } from '@/lib/locales';
import { getFileNameWithoutExtension, formatShortDate } from '@/lib/utils';

export const generateInitialItemData = async (file, targetLang, currentLanguage, toast, sourceLangForEnTimings = null, esTimingsForEn = null) => {
  const nameWithoutExt = getFileNameWithoutExtension(file.name);
  let dateFromFile = null;
  let titleBase = nameWithoutExt;
  let fileHasLangSuffix = false;

  const langSuffixMatch = nameWithoutExt.match(/_([RUruESesENen]{2})$/i);
  if (langSuffixMatch) {
    titleBase = nameWithoutExt.substring(0, nameWithoutExt.lastIndexOf(langSuffixMatch[0])).trim();
    fileHasLangSuffix = true;
  }
  
  // Handle both YYYY.MM.DD and DD.MM.YY formats
  const dateMatch = titleBase.match(/(?:(\d{4})\.(\d{2})\.(\d{2})|(\d{2})\.(\d{2})\.(\d{2}))/); 
  if (dateMatch) {
    if (dateMatch[1]) {
      // YYYY.MM.DD format
      dateFromFile = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    } else {
      // DD.MM.YY format
      const year = parseInt('20' + dateMatch[6], 10);
      dateFromFile = `${year}-${dateMatch[5]}-${dateMatch[4]}`;
    }
    titleBase = titleBase.replace(dateMatch[0], '').trim().replace(/^[-_]+|[-_]+$/g, '');
  } else {
    const strictDateMatch = titleBase.match(/^(\d{4})-(\d{2})-(\d{2})$/); 
    if (strictDateMatch) {
      dateFromFile = `${strictDateMatch[1]}-${strictDateMatch[2]}-${strictDateMatch[3]}`;
      titleBase = ''; 
    }
  }
  
  const meditationPrefix = getLocaleString('meditationTitlePrefix', targetLang);
  const episodeTitle = `${meditationPrefix} ${dateFromFile ? formatShortDate(dateFromFile, targetLang) : titleBase || getFileNameWithoutExtension(file.name)}`;
  const episodeSlug = dateFromFile ? `${dateFromFile}_${targetLang}` : `${getFileNameWithoutExtension(file.name)}_${targetLang}`;

  let timingsText = '';
  if (targetLang === 'en' && sourceLangForEnTimings === 'es' && esTimingsForEn) {
      timingsText = esTimingsForEn;
  } else if (dateFromFile) {
    try {
      const columnToFetch = targetLang === 'ru' ? 'timings_ru' : targetLang === 'es' ? 'timings_es' : null;
      if (columnToFetch) {
        // Try to fetch from timeOld, but handle if table doesn't exist
        try {
          const { data, error } = await supabase
            .from('timeOld')
            .select(columnToFetch)
            .eq('date', dateFromFile)
            .maybeSingle();
          
          if (error) {
            // If table doesn't exist (PGRST205), just ignore and continue without timings
            if (error.code === 'PGRST205' || error.code === '42P01') {
              console.warn('timeOld table not found, skipping timings fetch');
            } else {
              throw error;
            }
          } else if (data) {
            timingsText = data[columnToFetch] || '';
          }
        } catch (innerErr) {
           // Double check if it was a table missing error that was thrown
           if (innerErr.code === 'PGRST205' || innerErr.code === '42P01') {
             console.warn('timeOld table not found (caught), skipping timings fetch');
           } else {
             throw innerErr;
           }
        }
      }
    } catch (err) {
      console.error(`Error fetching timings for ${file.name} (${targetLang}):`, err);
      // Don't show toast for missing table error to avoid user confusion
      if (err.code !== 'PGRST205' && err.code !== '42P01') {
        toast({ title: getLocaleString('errorGeneric', currentLanguage), description: `Не удалось загрузить тайминги для ${file.name} (${targetLang}): ${err.message}`, variant: 'destructive' });
      }
    }
  }

  return {
    file,
    originalFileId: file.name + file.lastModified,
    id: `${file.name}-${targetLang}-${Date.now()}`, 
    parsedDate: dateFromFile,
    lang: targetLang,
    episodeTitle,
    episodeSlug,
    timingsText,
    uploadProgress: 0,
    isUploading: false,
    uploadError: null,
    uploadComplete: false,
    transcriptionStatus: null,
    transcriptionError: null,
    fileHasLangSuffix,
    sourceLangForEn: sourceLangForEnTimings,
    isTranslatingTimings: false,
    translationTriggered: false,
  };
};
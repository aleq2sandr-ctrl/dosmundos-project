import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Link, PlusCircle, Loader2 } from 'lucide-react';
import { getLocaleString } from '@/lib/locales';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { formatShortDate } from '@/lib/utils';

/**
 * Component for date-based file upload
 * Automatically generates URLs based on date and adds episodes to database
 */
const DateBasedUpload = ({ currentLanguage, onUploadComplete }) => {
  const [date, setDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const generateAudioUrls = (date) => {
    const baseUrl = 'https://silver-lemur-512881.hostingersite.com/wp-content/uploads/Audio';
    return {
      ru: `${baseUrl}/${date}_RU.mp3`,
      es: `${baseUrl}/${date}_ES.mp3`
    };
  };

  const generateEpisodeSlug = (date, lang) => {
    return `${date}_${lang.toUpperCase()}`;
  };

  const generateEpisodeTitle = (date, lang) => {
    const prefix = getLocaleString('meditationTitlePrefix', lang);
    const datePart = formatShortDate(date, lang);
    return datePart ? `${prefix} ${datePart}` : prefix;
  };

  const handleUpload = async () => {
    if (!date) {
      toast({
        title: getLocaleString('errorGeneric', currentLanguage),
        description: getLocaleString('dateRequired', currentLanguage),
        variant: 'destructive'
      });
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      toast({
        title: getLocaleString('errorGeneric', currentLanguage),
        description: getLocaleString('invalidDateFormat', currentLanguage),
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);

    try {
      const audioUrls = generateAudioUrls(date);
      
      // Check if files already exist
      const { data: existingEpisodes } = await supabase
        .from('episodes')
        .select('slug, lang')
        .or(`slug.eq.${generateEpisodeSlug(date, 'ru')},slug.eq.${generateEpisodeSlug(date, 'es')}`);

      if (existingEpisodes && existingEpisodes.length > 0) {
        const existingSlugs = existingEpisodes.map(ep => `${ep.slug} (${ep.lang.toUpperCase()})`).join(', ');
        toast({
          title: getLocaleString('episodesAlreadyExist', currentLanguage),
          description: `${existingSlugs}`,
          variant: 'destructive'
        });
        setIsUploading(false);
        return;
      }

      // Insert both RU and ES episodes
      const episodesToInsert = [
        {
          slug: generateEpisodeSlug(date, 'ru'),
          title: generateEpisodeTitle(date, 'ru'),
          lang: 'ru',
          date: date,
          audio_url: audioUrls.ru,
          r2_object_key: `Audio/${date}_RU.mp3`,
          r2_bucket_name: 'dosmundos',
          file_has_lang_suffix: true,
          duration: 0 // Set to 0 instead of null
        },
        {
          slug: generateEpisodeSlug(date, 'es'),
          title: generateEpisodeTitle(date, 'es'),
          lang: 'es',
          date: date,
          audio_url: audioUrls.es,
          r2_object_key: `Audio/${date}_ES.mp3`,
          r2_bucket_name: 'dosmundos',
          file_has_lang_suffix: true,
          duration: 0 // Set to 0 instead of null
        }
      ];

      const { data: insertedEpisodes, error } = await supabase
        .from('episodes')
        .insert(episodesToInsert)
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: getLocaleString('episodesAddedSuccessfully', currentLanguage),
        description: getLocaleString('episodesAddedDescription', currentLanguage, { 
          date: formatShortDate(date, currentLanguage),
          count: episodesToInsert.length 
        })
      });

      // Reset form
      setDate('');

      // Callback to refresh the episodes list
      if (onUploadComplete && typeof onUploadComplete === 'function') {
        onUploadComplete();
      }

    } catch (error) {
      console.error('Error adding episodes:', error);
      toast({
        title: getLocaleString('errorGeneric', currentLanguage),
        description: getLocaleString('errorAddingEpisodes', currentLanguage, { errorMessage: error.message }),
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    // Only allow valid date format
    const dateRegex = /^\d{0,4}-?\d{0,2}-?\d{0,2}$/;
    if (dateRegex.test(value)) {
      setDate(value);
    }
  };

  const handleLastWednesday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 3 = Wednesday
    const daysSinceWednesday = (dayOfWeek + 7 - 3) % 7; // Calculate days since last Wednesday
    const lastWednesday = new Date(today);
    lastWednesday.setDate(today.getDate() - (daysSinceWednesday || 7)); // If today is Wednesday, go back 7 days
    const formattedDate = lastWednesday.toISOString().split('T')[0];
    setDate(formattedDate);
  };

  const handleWednesdayTwoWeeksAgo = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 3 = Wednesday
    const daysSinceWednesday = (dayOfWeek + 7 - 3) % 7; // Calculate days since last Wednesday
    const wednesdayTwoWeeksAgo = new Date(today);
    wednesdayTwoWeeksAgo.setDate(today.getDate() - (daysSinceWednesday || 7) - 7); // Go back to last Wednesday, then 7 more days
    const formattedDate = wednesdayTwoWeeksAgo.toISOString().split('T')[0];
    setDate(formattedDate);
  };

  return (
    <div className="mb-8 p-6 rounded-lg bg-slate-700/50 border border-slate-600">
      <h2 className="text-xl font-bold text-purple-300 mb-4 flex items-center">
        <Calendar className="mr-2 h-5 w-5" />
        {getLocaleString('dateBasedUpload', currentLanguage)}
      </h2>
      
      <p className="text-sm text-slate-400 mb-6">
        {getLocaleString('dateBasedUploadDescription', currentLanguage)}
      </p>

      <div className="space-y-4">
        {/* Date Input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {getLocaleString('selectDate', currentLanguage)}
          </label>
          <Input
            type="date"
            value={date}
            onChange={handleDateChange}
            placeholder="YYYY-MM-DD"
            className="w-full h-11 px-4 rounded bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isUploading}
          />
        </div>

        {/* Quick Date Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleLastWednesday}
            disabled={isUploading}
            className="bg-slate-600 hover:bg-slate-500 border-slate-500 text-slate-300"
          >
            Последняя среда
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleWednesdayTwoWeeksAgo}
            disabled={isUploading}
            className="bg-slate-600 hover:bg-slate-500 border-slate-500 text-slate-300"
          >
            Среда 2 недели назад
          </Button>
        </div>

        {/* Preview URLs */}
        {date && /^\d{4}-\d{2}-\d{2}$/.test(date) && (
          <div className="space-y-2 p-4 rounded bg-slate-800/50 border border-slate-600">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              {getLocaleString('generatedUrls', currentLanguage)}:
            </h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-8">RU:</span>
                <a 
                  href={generateAudioUrls(date).ru}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 truncate flex-1"
                >
                  {generateAudioUrls(date).ru}
                </a>
                <Link className="h-3 w-3 text-slate-400 flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-8">ES:</span>
                <a 
                  href={generateAudioUrls(date).es}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 truncate flex-1"
                >
                  {generateAudioUrls(date).es}
                </a>
                <Link className="h-3 w-3 text-slate-400 flex-shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!date || isUploading}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {getLocaleString('addingEpisodes', currentLanguage)}
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              {getLocaleString('addEpisodes', currentLanguage)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DateBasedUpload;

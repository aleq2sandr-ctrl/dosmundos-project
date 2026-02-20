-- Проверка новых транскриптов (созданных 20.02.2026 и после)
SELECT 
  episode_slug,
  lang,
  status,
  created_at,
  jsonb_typeof(edited_transcript_data) as data_type,
  jsonb_path_query_array(edited_transcript_data, '$.utterances') as utterances,
  jsonb_array_length(jsonb_path_query_array(edited_transcript_data, '$.utterances')) as utterances_count,
  length(jsonb_path_query_first(edited_transcript_data, '$.text')::text) as text_length
FROM transcripts
WHERE created_at >= '2026-02-20'
ORDER BY created_at DESC;

-- Проверка всего набора для сравнения
SELECT 
  episode_slug,
  lang,
  status,
  created_at,
  jsonb_typeof(edited_transcript_data) as data_type,
  jsonb_array_length(edited_transcript_data->'utterances') as utterances_count,
  length(edited_transcript_data->>'text') as text_length
FROM transcripts
WHERE episode_slug IN ('2026-01-28', '2026-02-04', '2026-02-11')
ORDER BY episode_slug, lang;

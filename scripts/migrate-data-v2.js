import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CATEGORY_MAP = {
  'Растения Учителя и Процесс Диеты': {
    slug: 'teacher-plants-diet',
    translations: {
      ru: 'Растения Учителя и Процесс Диеты',
      en: 'Teacher Plants and Diet Process',
      es: 'Plantas Maestras y Proceso de Dieta'
    }
  },
  'Внутренние развитие': {
    slug: 'inner-development',
    translations: {
      ru: 'Внутренние развитие',
      en: 'Inner Development',
      es: 'Desarrollo Interior'
    }
  },
  'Целительство и Энергетические практики': {
    slug: 'healing-energy-practices',
    translations: {
      ru: 'Целительство и Энергетические практики',
      en: 'Healing and Energy Practices',
      es: 'Curación y Prácticas Energéticas'
    }
  },
  'Энергетическая защита и очищение': {
    slug: 'energy-protection-cleansing',
    translations: {
      ru: 'Энергетическая защита и очищение',
      en: 'Energy Protection and Cleansing',
      es: 'Protección y Limpieza Energética'
    }
  },
  'Взаимоотношения и семья': {
    slug: 'relationships-family',
    translations: {
      ru: 'Взаимоотношения и семья',
      en: 'Relationships and Family',
      es: 'Relaciones y Familia'
    }
  },
  'Здоровье и Питание': {
    slug: 'health-nutrition',
    translations: {
      ru: 'Здоровье и Питание',
      en: 'Health and Nutrition',
      es: 'Salud y Nutrición'
    }
  },
  'Медитации': {
    slug: 'meditations',
    translations: {
      ru: 'Медитации',
      en: 'Meditations',
      es: 'Meditaciones'
    }
  }
};

async function migrate() {
  console.log('Starting migration...');

  // 1. Migrate Categories
  console.log('Migrating categories...');
  const categoryIds = {}; // slug -> uuid

  for (const [originalName, data] of Object.entries(CATEGORY_MAP)) {
    // Insert Category
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .upsert({ slug: data.slug }, { onConflict: 'slug' })
      .select()
      .single();

    if (catError) {
      console.error(`Error inserting category ${data.slug}:`, catError);
      continue;
    }

    categoryIds[originalName] = catData.id;

    // Insert Translations
    for (const [lang, name] of Object.entries(data.translations)) {
      const { error: transError } = await supabase
        .from('category_translations')
        .upsert({
          category_id: catData.id,
          language_code: lang,
          name: name
        }, { onConflict: 'category_id, language_code' });

      if (transError) {
        console.error(`Error inserting translation for ${data.slug} (${lang}):`, transError);
      }
    }
  }

  // 2. Migrate Articles
  console.log('Fetching existing articles count...');
  const { count, error: countError } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error fetching count:', countError);
    return;
  }

  console.log(`Found ${count} articles. Migrating in batches...`);

  const BATCH_SIZE = 5;
  for (let i = 0; i < count; i += BATCH_SIZE) {
    console.log(`Processing batch ${i} to ${i + BATCH_SIZE}...`);
    
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .range(i, i + BATCH_SIZE - 1);

    if (fetchError) {
      console.error(`Error fetching batch ${i}:`, fetchError);
      continue;
    }

    for (const article of articles) {
      // Insert Article Core
      const { data: newArticle, error: artError } = await supabase
        .from('articles_v2')
        .upsert({
          slug: article.slug,
          author: article.author,
          youtube_url: article.youtube_url,
          created_at: article.created_at,
          // published_at: article.published_at || article.created_at // Assuming published_at exists or using created_at
        }, { onConflict: 'slug' })
        .select()
        .single();

      if (artError) {
        console.error(`Error inserting article ${article.slug}:`, artError);
        continue;
      }

      // Insert Translations
      const languages = ['ru', 'en', 'es'];
      for (const lang of languages) {
        const title = article.title?.[lang] || article.title?.['ru']; // Fallback to RU if missing
        const summary = article.summary?.[lang] || article.summary?.['ru'];
        const content = article.content?.[lang] || article.content?.['ru'];

        if (title) {
          const { error: transError } = await supabase
            .from('article_translations')
            .upsert({
              article_id: newArticle.id,
              language_code: lang,
              title,
              summary,
              content
            }, { onConflict: 'article_id, language_code' });

          if (transError) {
            console.error(`Error inserting article translation ${article.slug} (${lang}):`, transError);
          }
        }
      }

      // Link Categories
      if (article.categories && Array.isArray(article.categories)) {
        for (const catName of article.categories) {
          const catId = categoryIds[catName];
          if (catId) {
            const { error: linkError } = await supabase
              .from('article_categories')
              .upsert({
                article_id: newArticle.id,
                category_id: catId
              }); 

            if (linkError) {
              console.error(`Error linking category ${catName} to ${article.slug}:`, linkError);
            }
          } else {
            console.warn(`Category not found in map: ${catName}`);
          }
        }
      }
    }
  }

  console.log('Migration completed!');
}

migrate();

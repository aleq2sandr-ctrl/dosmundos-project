const fs = require('fs');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !DEEPSEEK_API_KEY) {
    console.error('Missing required environment variables.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LANGUAGES = ['es', 'en', 'de', 'fr', 'pl'];
const SOURCE_LANG = 'ru';

const ARTICLE_TITLE = "Пение Икаро. Слияние с растением";
const ARTICLE_DATE = "2025-10-29";
const ARTICLE_CATEGORY = "Растения Учителя и Процесс Диеты";
const ARTICLE_SLUG = "penie-ikaro-sliyanie-s-rasteniem";

const CONTENT_FILE = 'extracted_article.txt';
const contentRu = fs.readFileSync(CONTENT_FILE, 'utf8');

async function callDeepSeek(messages) {
    const data = JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        temperature: 0.3
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.deepseek.com',
            path: '/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const json = JSON.parse(responseData);
                        if (json.choices && json.choices.length > 0) {
                            resolve(json.choices[0].message.content);
                        } else {
                            reject(new Error('No choices in response'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`API Error: ${res.statusCode} ${responseData}`));
                }
            });
        });
        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

async function generateSummary(text) {
    console.log('Generating summary...');
    const prompt = "Summarize the following text in Russian. The summary should be concise (2-3 sentences).";
    return callDeepSeek([
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: `${prompt}\n\n${text.substring(0, 5000)}` }
    ]);
}

async function translate(text, targetLang) {
    console.log(`Translating to ${targetLang}...`);
    const prompt = `Translate the following text to ${targetLang}. Keep the meaning precise.`;
    return callDeepSeek([
        { role: "system", content: "You are a professional translator." },
        { role: "user", content: `${prompt}\n\n${text.substring(0, 10000)}` }
    ]);
}

async function main() {
    try {
        const summaryRu = await generateSummary(contentRu);
        console.log('Summary (RU):', summaryRu);

        const titles = { [SOURCE_LANG]: ARTICLE_TITLE };
        const summaries = { [SOURCE_LANG]: summaryRu };
        const contents = { [SOURCE_LANG]: contentRu };

        for (const lang of LANGUAGES) {
            titles[lang] = await translate(ARTICLE_TITLE, lang);
            summaries[lang] = await translate(summaryRu, lang);
            contents[lang] = await translate(contentRu, lang);
            // Add delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const articleData = {
            slug: ARTICLE_SLUG,
            title: titles,
            summary: summaries,
            content: contents,
            categories: [ARTICLE_CATEGORY],
            created_at: new Date(ARTICLE_DATE).toISOString(),
            updated_at: new Date().toISOString(),
            author: 'Unknown'
        };

        console.log('Inserting into DB...');
        const { data, error } = await supabase
            .from('articles')
            .insert([articleData])
            .select();

        if (error) {
            console.error('Error inserting article:', error);
        } else {
            console.log('Article inserted successfully:', data);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main();

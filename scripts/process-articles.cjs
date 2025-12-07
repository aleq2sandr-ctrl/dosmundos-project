const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const CSV_PATH = path.join(__dirname, '../articles_data.csv');
const DOCS_ROOT = '/Users/macbookairm4-15n/Documents/DosMundos/Book';
const OUTPUT_DIR = path.join(__dirname, '../public/articles');
const IV_OUTPUT_DIR = path.join(__dirname, '../public/articles/iv');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(IV_OUTPUT_DIR)) fs.mkdirSync(IV_OUTPUT_DIR, { recursive: true });

// Helper to parse CSV line
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Helper to find file
function findFile(title, fileList) {
    // Normalize title for comparison: remove special chars, lowercase
    const normalize = (s) => s.toLowerCase().replace(/[^\w\u0400-\u04FF]/g, '');
    const target = normalize(title);
    
    // 1. Exact match on filename (without extension)
    let match = fileList.find(f => normalize(path.basename(f, '.docx')) === target);
    if (match) return match;

    // 2. Contains match
    match = fileList.find(f => normalize(path.basename(f, '.docx')).includes(target));
    if (match) return match;
    
    return null;
}

// Helper to generate ID
function generateId(title) {
    return crypto.createHash('md5').update(title).digest('hex').substring(0, 10);
}

// Main process
async function main() {
    console.log('Reading CSV...');
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.split('\n').filter(l => l.trim());
    const headers = parseCSVLine(lines[0]);
    
    // Map headers to indices
    const headerMap = {};
    headers.forEach((h, i) => headerMap[h.trim()] = i);
    
    console.log('Scanning for .docx files...');
    const fileList = execSync(`find "${DOCS_ROOT}" -name "*.docx"`).toString().split('\n').filter(f => f.trim());
    
    const articles = [];
    
    // Process rows (skip header)
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length < 2) continue;

        const title = row[headerMap['Title']];
        const videoLink = row[headerMap['Video Link']];
        const summary = row[headerMap['Summary']];
        const categoryStr = row[headerMap['Catergory']]; // Note the typo in CSV header
        const author = row[headerMap['Autor']];
        const date = row[headerMap['Date']];
        
        if (!title) continue;

        console.log(`Processing: ${title}`);
        
        const docFile = findFile(title, fileList);
        
        if (!docFile) {
            console.warn(`  [WARNING] No matching file found for: ${title}`);
            continue;
        }

        const id = generateId(title);
        const htmlFilename = `${id}.html`;
        const htmlPath = path.join(OUTPUT_DIR, htmlFilename);
        const ivHtmlPath = path.join(IV_OUTPUT_DIR, htmlFilename);
        
        // Convert docx to html
        try {
            const tempHtml = path.join(OUTPUT_DIR, `temp_${id}.html`);
            execSync(`textutil -convert html -output "${tempHtml}" "${docFile}"`);
            
            let htmlContent = fs.readFileSync(tempHtml, 'utf-8');
            fs.unlinkSync(tempHtml);
            
            // Extract body content for the app
            const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;
            
            // Clean up styles slightly if needed, but textutil output is usually okay-ish
            // We might want to strip some inline styles or classes if they conflict, 
            // but for now let's keep it as is or just wrap it.
            
            fs.writeFileSync(htmlPath, bodyContent);
            
            // Generate Instant View HTML
            // Needs to be a full HTML page
            const ivHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${summary || ''}">
    <meta property="article:published_time" content="${date || ''}">
    <meta property="article:author" content="${author || ''}">
    <title>${title}</title>
    <style>
        body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        img { max-width: 100%; height: auto; }
        h1 { font-size: 2.5em; margin-bottom: 0.5em; }
        .meta { color: #666; font-style: italic; margin-bottom: 2em; }
    </style>
</head>
<body>
    <article>
        <h1>${title}</h1>
        <div class="meta">
            ${author ? `<span>By ${author}</span>` : ''}
            ${date ? `<span> • ${date}</span>` : ''}
        </div>
        ${summary ? `<p><strong>${summary}</strong></p>` : ''}
        ${videoLink ? `<p><a href="${videoLink}">Watch on YouTube</a></p>` : ''}
        <hr>
        ${bodyContent}
    </article>
</body>
</html>`;
            fs.writeFileSync(ivHtmlPath, ivHtml);
            
            // Parse categories
            const categories = categoryStr ? categoryStr.split(',').map(c => c.trim()).filter(c => c) : [];
            
            articles.push({
                id,
                title,
                summary,
                category: categories,
                author,
                youtubeUrl: videoLink,
                contentUrl: `/articles/${htmlFilename}`,
                ivUrl: `/articles/iv/${htmlFilename}` // Optional, for reference
            });
            
            console.log(`  [SUCCESS] Processed ${title}`);
            
        } catch (err) {
            console.error(`  [ERROR] Failed to convert ${title}:`, err.message);
        }
    }
    
    // Write index.json
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(articles, null, 2));
    console.log(`\nDone! Processed ${articles.length} articles.`);
}

main();

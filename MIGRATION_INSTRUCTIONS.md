# Database Migration Instructions

To complete the database refactoring for multi-language support and normalized categories, please follow these steps:

## 1. Run the SQL Migration
Execute the SQL commands found in `supabase/migrations/20251208_refactor_articles.sql` in your Supabase SQL Editor.

This will create the following tables:
- `categories`
- `category_translations`
- `articles_v2`
- `article_translations`
- `article_categories`

## 2. Run the Data Migration Script
After the tables are created, run the following command in your terminal to migrate the existing data from the old `articles` table to the new structure:

```bash
node scripts/migrate-data-v2.js
```

## 3. Verify
The application is already updated to use the new schema. Once the data is migrated, the frontend will automatically start using the new tables.

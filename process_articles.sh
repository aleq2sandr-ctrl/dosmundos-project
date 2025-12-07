#!/bin/bash

# Script to process all articles from Book directory

BOOK_DIR="/Users/macbookairm4-15n/Documents/DosMundos/Book"
ARTICLES_DIR="/Users/macbookairm4-15n/Documents/GitHub/dosmundos-project/public/articles"
INDEX_FILE="$ARTICLES_DIR/index.json"

# Create articles directory if it doesn't exist
mkdir -p "$ARTICLES_DIR"

# Function to generate categories JSON array directly
generate_categories_json() {
    local path="$1"
    local relative_path="${path#$BOOK_DIR/}"
    local dirname=$(dirname "$relative_path")

    # Split by comma
    IFS=',' read -ra CATS <<< "$dirname"
    
    local json="["
    local first=true
    
    for cat in "${CATS[@]}"; do
        # Trim spaces
        cat=$(echo "$cat" | sed 's/^ *//;s/ *$//')
        if [ -n "$cat" ]; then
            if [ "$first" = true ]; then
                first=false
            else
                json="$json,"
            fi
            json="$json\"$cat\""
        fi
    done
    json="$json]"
    echo "$json"
}

# Function to create slug from filename
create_slug() {
    local filename="$1"
    # Remove .docx extension
    local slug=$(basename "$filename" .docx)
    
    # Transliterate to Latin using python
    slug=$(python3 -c "
import sys
text = sys.argv[1].lower()
mapping = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya'
}
res = ''
for char in text:
    if char in mapping:
        res += mapping[char]
    elif char.isalnum():
        res += char
    else:
        res += '-'
# Remove duplicate hyphens and leading/trailing hyphens
print('-'.join(filter(None, res.split('-'))))
" "$slug")

    echo "$slug"
}

# Function to get YouTube URL from CSV
get_youtube_url() {
    local title="$1"
    local csv_file="$BOOK_DIR/blog_data.csv"

    if [ -f "$csv_file" ]; then
        # Skip header and find line with matching title
        tail -n +2 "$csv_file" | while IFS=',' read -r csv_title youtube_url author category; do
            # Remove quotes and compare titles
            csv_title=$(echo "$csv_title" | tr -d '"')
            if [ "$csv_title" = "$title" ]; then
                youtube_url=$(echo "$youtube_url" | tr -d '"')
                echo "$youtube_url"
                return 0
            fi
        done
    fi
    echo ""
}

# Function to generate summary based on title and categories
generate_summary() {
    local title="$1"
    local categories="$2"
    local summaries_file="/Users/macbookairm4-15n/Documents/GitHub/dosmundos-project/article_summaries.json"
    
    # Check if summary exists in JSON file
    if [ -f "$summaries_file" ]; then
        # Use python to extract summary safely from JSON
        # We use python because parsing JSON with grep/sed is fragile
        local json_summary=$(python3 -c "import sys, json; 
try:
    data = json.load(open(sys.argv[1])); 
    print(data.get(sys.argv[2], ''))
except: print('')" "$summaries_file" "$title")
        
        if [ -n "$json_summary" ]; then
            echo "$json_summary"
            return
        fi
    fi

    # Specific descriptions for exact article titles
    case "$title" in
        "От чего зависят видения в церемониях с Аяваской")
            echo "Факторы, влияющие на видения и переживания во время церемоний с Аяваской" ;;
        "Диета с Дурманом. Легенда об Дикуте")
            echo "Традиционная диета с дурманом и древняя легенда о шамане Дикуте" ;;
        "Откуда люди узнали про Аяуаску")
            echo "История открытия и распространения знаний об Аяваске среди людей" ;;
        "Про марихуану")
            echo "Свойства и применение марихуаны в духовных практиках" ;;
        "Работа растений. Какие качества они дают")
            echo "Как энтеогенные растения влияют на сознание и какие качества раскрывают" ;;
        "Использование Аяваски, Ибоги, Камбо, Рапэ в лечении")
            echo "Применение священных растений в терапии и исцелении" ;;
        "Традиционный чай из Аяваски")
            echo "Как правильно приготовить и использовать традиционный напиток из Аяваски" ;;
        "Первоэлементы растений")
            echo "Основные элементы и энергии, присутствующие в энтеогенных растениях" ;;
        "Про Камбо")
            echo "Свойства и применение лягушачьего яда Камбо в целительских практиках" ;;
        "Отношение к процессу с растениями")
            echo "Как правильно относиться к работе с энтеогенами и церемониям" ;;
        "Нужен ли шаман в церемониях с Аяваской")
            echo "Роль шамана в церемониях и можно ли проводить их самостоятельно" ;;
        "Сакральность марихуаны")
            echo "Духовное значение и сакральное использование марихуаны" ;;
        "Противопоказания к употреблению Аяваски")
            echo "Когда нельзя принимать Аяваску и какие существуют противопоказания" ;;
        "Отношение к деньгам и долгам")
            echo "Как относиться к материальным ценностям и финансовым обязательствам" ;;
        "Нужно ли делать запросы. Отношение к церемонии")
            echo "Нужно ли формулировать намерения перед церемониями с растениями" ;;
        "Диета с Лимоном")
            echo "Очищающая диета с лимоном и её роль в подготовке к церемониям" ;;
        "Церемония с Тое (Дурманом)")
            echo "Проведение и особенности церемоний с дурманом Тое" ;;
        "Сакральное использование энтеогенов")
            echo "Духовное применение растений силы в сакральных практиках" ;;
        "Аяваска шаманизм")
            echo "Связь Аяваски с шаманскими традициями и практиками" ;;
        "Как распознать сакральное послание")
            echo "Как отличить истинные духовные послания от обычных мыслей" ;;
        "Айуаска. Что такое свобода")
            echo "Понимание свободы через опыт с Аяваской" ;;
        "Безоценочное служение. Как почистить род")
            echo "Методы очищения родовых связей через безоценочное служение" ;;
        "Роль мужчины и женщины. Баланс в отношениях")
            echo "Сакральные роли мужчины и женщины в гармоничных отношениях" ;;
        "Энергетическая связь с другим человеком")
            echo "Как возникают и как управлять энергетическими связями между людьми" ;;
        "Личные границы. Как защитить своё поле")
            echo "Установление и защита личных энергетических границ" ;;
        "Иметь или не иметь детей")
            echo "Размышления о выборе иметь детей и его духовном значении" ;;
        "Воспитание детей")
            echo "Принципы сакрального воспитания и развития детей" ;;
        "Создание гармоничных отношений в паре")
            echo "Как построить гармоничные и осознанные отношения в паре" ;;
        "Расставание с любимыми. Как пережить потерю близких")
            echo "Как справиться с горем потери и пройти через расставание" ;;
        "Влияние рода")
            echo "Как родовые связи влияют на нашу жизнь и судьбу" ;;
        "Гармония в отношениях. Принять или исправить")
            echo "Принимать людей такими, какие они есть, или пытаться их изменить" ;;
        "Гармония в паре. Любовь. Сексуальные отношения")
            echo "Любовь и сексуальность в гармоничных отношениях" ;;
        "Сексуальные отношения")
            echo "Сакральное понимание сексуальности и интимных отношений" ;;
        "Любовь в паре")
            echo "Что такое настоящая любовь в отношениях между мужчиной и женщиной" ;;
        "Вселенская структура")
            echo "Структура мироздания и законы, управляющие вселенной" ;;
        "Влияние эмоций. Стресс и выгорание")
            echo "Как эмоции влияют на здоровье и как справляться со стрессом" ;;
        "Своевременность")
            echo "Понимание правильного времени для действий и решений" ;;
        "Внутренее определение. Рептилоиды и их роль")
            echo "Внутренние рептилоидные структуры и их влияние на поведение" ;;
        "Как распознать свои мысли и прийти к ясности")
            echo "Различение собственных мыслей и достижение ментальной ясности" ;;
        "Что такое сны")
            echo "Значение снов и как их правильно интерпретировать" ;;
        "Служение как инструмент цельности")
            echo "Служение другим как путь к внутренней целостности" ;;
        "Что такое сакральное начало")
            echo "Понимание сакрального начала жизни и бытия" ;;
        "Закон пустоты")
            echo "Универсальный закон пустоты и его применение в жизни" ;;
        "Богатство в Сакральном Пути")
            echo "Истинное понимание богатства на духовном пути" ;;
        "Дисциплина")
            echo "Значение дисциплины в духовном развитии" ;;
        "Что такое медитация. Как работать с умом")
            echo "Основы медитации и техники работы с мыслями" ;;
        "Сопротивление к изменениям")
            echo "Почему мы сопротивляемся изменениям и как с этим работать" ;;
        "Роль мужчины и женщины.  Баланс в отношениях")
            echo "Сакральные роли мужчины и женщины в гармоничных отношениях, где каждый дополняет другого без жестких стереотипов" ;;
        "Фильм Матрица.  Манипуляции через медиа")
            echo "Анализ манипуляций сознанием через средства массовой информации и параллели с фильмом Матрица" ;;
        "О новом человеке к 2027 году.  Различия двух планов сакрального и материального")
            echo "Будущее человечества и различия между мирами: мутация сознания на сакральном плане и развитие технологий на материальном" ;;
        "Религиозные противоречия и ритуалы.  Сакральность девы Марии.  Подключение к божественной природе")
            echo "Анализ религиозных противоречий и сакральных практик, манипуляции в религиях и путь к внутреннему единению с божественным" ;;
        "Амулеты, очистка от негативных энергий")
            echo "Амулеты как форма манипуляции и альтернативные методы энергетического очищения" ;;
        "Аура, Рождение ребенка, Кесарево")
            echo "Цвета ауры, их значение и влияние кесарева сечения на энергетическую структуру новорожденного" ;;
        "Боль от любви")
            echo "Боль от любви как иллюзия матрицы и путь к сакральному принятию без привязок" ;;
        "Влияние затмений")
            echo "Влияние затмений на человека и как избежать манипуляций через астрологические моды" ;;
        "Восприятие умом и харой. Почему блокируется хара")
            echo "Различия восприятия через ум и центр Хара, и причины блокировки интуиции" ;;
    esac
}

# Start building JSON
echo "[" > "$INDEX_FILE"

first=true

# Process all docx files, excluding .venv
find "$BOOK_DIR" -name "*.docx" -not -path "*/.venv/*" | while read -r file; do
    filename=$(basename "$file" .docx)
    slug=$(create_slug "$file")
    html_file="$ARTICLES_DIR/$slug.html"

    # Convert docx to html
    textutil -convert html -output "$html_file" "$file" 2>/dev/null

    # Generate categories JSON
    cats_json=$(generate_categories_json "$file")

    # Get YouTube URL
    youtube_url=$(get_youtube_url "$filename")

    # Build JSON entry
    if [ "$first" = true ]; then
        first=false
    else
        echo "," >> "$INDEX_FILE"
    fi

    # Handle YouTube URL
    if [ -n "$youtube_url" ]; then
        youtube_json="\"$youtube_url\""
    else
        youtube_json="null"
    fi

    # Generate summary
    summary=$(generate_summary "$filename" "$cats_json")

    # Escape quotes for JSON
    safe_title=$(echo "$filename" | sed 's/"/\\"/g')
    safe_summary=$(echo "$summary" | sed 's/"/\\"/g')

    # Create JSON entry
    cat >> "$INDEX_FILE" << EOF
  {
    "id": "$slug",
    "title": "$safe_title",
    "summary": "$safe_summary",
    "categories": $cats_json,
    "author": "Dos Mundos",
    "contentUrl": "/articles/$slug.html",
    "youtubeUrl": $youtube_json
  }
EOF

    echo "Processed: $filename -> $slug"
done

echo "]" >> "$INDEX_FILE"

echo "Processing complete. Index created at $INDEX_FILE"
#!/bin/bash

# Скрипт для проверки статуса деплоя на VPS

echo "=== Проверка деплоя dosmundos.pe ==="
echo ""

# Проверка файлов на сервере
echo "1. Проверка файлов в /var/www/dosmundos/dist:"
ssh root@72.61.186.175 "ls -lah /var/www/dosmundos/dist/ | head -20"
echo ""

# Проверка информации о деплое
echo "2. Информация о последнем деплое:"
echo "   Проверка на сервере:"
ssh root@72.61.186.175 "cat /var/www/dosmundos/dist/.deployment-info 2>/dev/null || echo 'Файл .deployment-info не найден на сервере'"
echo ""
echo "   Проверка через HTTP (должен быть доступен напрямую):"
curl -s https://dosmundos.pe/.deployment-info 2>&1 | head -5 || echo "Не удалось получить файл через HTTP"
echo ""

# Проверка статуса Nginx
echo "3. Статус Nginx:"
ssh root@72.61.186.175 "sudo systemctl status nginx --no-pager -l | head -15"
echo ""

# Проверка конфигурации Nginx
echo "4. Проверка конфигурации Nginx для dosmundos.pe:"
ssh root@72.61.186.175 "sudo nginx -t && sudo cat /etc/nginx/sites-enabled/dosmundos.pe 2>/dev/null || sudo cat /etc/nginx/conf.d/dosmundos.pe.conf 2>/dev/null || echo 'Конфигурация не найдена'"
echo ""

# Проверка доступности сайта
echo "5. Проверка доступности сайта:"
curl -I https://dosmundos.pe 2>&1 | head -10
echo ""

# Проверка даты модификации index.html
echo "6. Дата последнего изменения index.html:"
ssh root@72.61.186.175 "stat /var/www/dosmundos/dist/index.html 2>/dev/null || echo 'index.html не найден'"
echo ""

echo "=== Проверка завершена ==="

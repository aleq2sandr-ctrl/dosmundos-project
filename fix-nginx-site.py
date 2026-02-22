with open("/etc/nginx/sites-enabled/dosmundos", "r") as f:
    content = f.read()

old_block = '''    # Telegram Instant View - serve article pages for TelegramBot
    # When TelegramBot requests /:lang/:slug, proxy to Node.js for IV-ready HTML
    location ~ ^/([a-z][a-z])/([^/]+)$ {
        error_page 418 = @telegram_iv;
        if ($http_user_agent ~* "TelegramBot") {
            return 418;
        }
        # For non-bot requests, serve SPA
        try_files $uri $uri/ /index.html;
    }'''

new_block = '''    # Telegram Instant View - serve article pages for TelegramBot and IV Editor
    # When TelegramBot UA or Telegram IP requests /:lang/:slug, proxy to Node.js
    location ~ ^/([a-z][a-z])/([^/]+)$ {
        set $is_telegram 0;
        if ($http_user_agent ~* "TelegramBot") {
            set $is_telegram 1;
        }
        if ($telegram_ip = 1) {
            set $is_telegram 1;
        }
        error_page 418 = @telegram_iv;
        if ($is_telegram = 1) {
            return 418;
        }
        # For non-bot requests, serve SPA
        try_files $uri $uri/ /index.html;
    }'''

content = content.replace(old_block, new_block)

with open("/etc/nginx/sites-enabled/dosmundos", "w") as f:
    f.write(content)

print("Updated dosmundos config")

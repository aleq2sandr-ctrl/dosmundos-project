with open("/etc/nginx/sites-enabled/dosmundos", "r") as f:
    content = f.read()

old = """        proxy_set_header User-Agent $http_user_agent;
    }

    # Serve pre-built IV article pages directly"""

new = """        proxy_set_header User-Agent $http_user_agent;
        proxy_set_header X-Telegram-IV 1;
    }

    # Serve pre-built IV article pages directly"""

content = content.replace(old, new)

with open("/etc/nginx/sites-enabled/dosmundos", "w") as f:
    f.write(content)

print("Added X-Telegram-IV header")

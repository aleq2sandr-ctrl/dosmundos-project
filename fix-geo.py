with open("/etc/nginx/nginx.conf", "r") as f:
    content = f.read()
content = content.replace("geo  {", "geo $telegram_ip {")
with open("/etc/nginx/nginx.conf", "w") as f:
    f.write(content)
print("Fixed geo block")

# Nginx для обслуживания статики (landing page) и проксирования
FROM nginx:1.25-alpine

# Копируем конфигурацию nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Копируем конфигурации для виртуальных хостов
COPY nginx/conf.d /etc/nginx/conf.d

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]

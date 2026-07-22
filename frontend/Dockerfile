FROM node:20-alpine AS build
WORKDIR /app

# Копіювання конфігурацій залежностей
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Копіювання вихідного коду та збірка
COPY . .
RUN npm run build

# Продакшн сервер Nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

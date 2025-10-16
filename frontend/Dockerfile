# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --force 

# Копируем исходный код
COPY . .

# Добавляем type: module в package.json временно
RUN npm pkg set type="module"

# Собираем приложение
RUN npm run build

# Устанавливаем serve для раздачи статики
RUN npm install -g serve

# Экспонируем порт
EXPOSE 3000

# Запускаем сервер
CMD ["serve", "-s", "dist", "-l", "3000"]
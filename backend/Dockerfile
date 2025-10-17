FROM python:3.11-alpine

WORKDIR /app

# Устанавливаем системные зависимости для OpenCV и Pillow
RUN apk add --no-cache \
    libstdc++ \
    libgcc \
    mesa-gl \
    libjpeg-turbo \
    zlib \
    tiff \
    freetype \
    musl-locales

# Копируем и устанавливаем Python-зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходники
COPY . .

EXPOSE 8000

# Без --reload для продакшена (экономит RAM)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

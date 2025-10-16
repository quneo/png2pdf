# backend/main.py
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import os
import tempfile
import shutil
from pathlib import Path
import uuid
from datetime import datetime, timedelta

app = FastAPI(title="PNG PDF Converter", version="1.0.0")

# Хранилище для отслеживания скачанных файлов
downloaded_files = {}

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def cleanup_old_files():
    """Очистка старых записей из downloaded_files"""
    now = datetime.now()
    expired_files = []
    
    for file_id, file_data in downloaded_files.items():
        if now - file_data['created_at'] > timedelta(minutes=10):  # 10 минут lifetime
            expired_files.append(file_id)
            # Удаляем временный файл
            try:
                if os.path.exists(file_data['file_path']):
                    os.remove(file_data['file_path'])
            except:
                pass
    
    for file_id in expired_files:
        downloaded_files.pop(file_id, None)

@app.get("/")
async def root():
    return {"message": "PNG2PDF API is running", "status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "png2pdf-api"}

@app.post("/png2pdf/")
async def png_to_pdf(file: UploadFile):
    """Конвертация PNG → PDF"""
    print(f"🔧 PNG to PDF: {file.filename}")
    
    if not file.filename.lower().endswith('.png'):
        raise HTTPException(status_code=400, detail="File must be PNG")
    
    temp_dir = tempfile.mkdtemp()
    png_path = os.path.join(temp_dir, "input.png")
    pdf_path = os.path.join(temp_dir, "converted.pdf")
    file_id = str(uuid.uuid4())
    
    try:
        # Сохраняем файл
        content = await file.read()
        with open(png_path, "wb") as f:
            f.write(content)

        # Создаем PDF документ
        pdf_document = fitz.open()
        
        # Добавляем страницу с изображением
        page = pdf_document.new_page()
        
        # Вставляем изображение на всю страницу
        rect = page.rect
        page.insert_image(rect, filename=png_path)
        
        # Сохраняем PDF
        pdf_document.save(pdf_path)
        pdf_document.close()

        print(f"✅ PDF created: {pdf_path}")
        
        # Регистрируем файл для однократного скачивания
        downloaded_files[file_id] = {
            'file_path': pdf_path,
            'filename': f"{Path(file.filename).stem}.pdf",
            'media_type': 'application/pdf',
            'downloaded': False,
            'created_at': datetime.now(),
            'temp_dir': temp_dir
        }
        
        # Возвращаем ID файла вместо самого файла
        return {
            "file_id": file_id,
            "filename": f"{Path(file.filename).stem}.pdf",
            "message": "File converted successfully. Use /download/{file_id} to download."
        }
        
    except Exception as e:
        print(f"❌ PNG to PDF error: {str(e)}")
        # Очищаем временные файлы при ошибке
        try:
            shutil.rmtree(temp_dir)
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")

@app.post("/pdf2png/")
async def pdf_to_png(file: UploadFile):
    """Конвертация PDF → PNG (первая страница)"""
    print(f"🔧 PDF to PNG: {file.filename}")
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be PDF")
    
    temp_dir = tempfile.mkdtemp()
    pdf_path = os.path.join(temp_dir, "input.pdf")
    png_path = os.path.join(temp_dir, "converted.png")
    file_id = str(uuid.uuid4())
    
    try:
        # Сохраняем файл
        content = await file.read()
        with open(pdf_path, "wb") as f:
            f.write(content)

        # Открываем PDF
        doc = fitz.open(pdf_path)
        if len(doc) == 0:
            raise HTTPException(status_code=400, detail="PDF is empty")
        
        # Конвертируем первую страницу в PNG
        page = doc[0]
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        
        # Сохраняем PNG
        pix.save(png_path)
        doc.close()

        print(f"✅ PNG created: {png_path}")
        
        # Регистрируем файл для однократного скачивания
        downloaded_files[file_id] = {
            'file_path': png_path,
            'filename': f"{Path(file.filename).stem}.png",
            'media_type': 'image/png',
            'downloaded': False,
            'created_at': datetime.now(),
            'temp_dir': temp_dir
        }
        
        # Возвращаем ID файла вместо самого файла
        return {
            "file_id": file_id,
            "filename": f"{Path(file.filename).stem}.png",
            "message": "File converted successfully. Use /download/{file_id} to download."
        }
        
    except Exception as e:
        print(f"❌ PDF to PNG error: {str(e)}")
        # Очищаем временные файлы при ошибке
        try:
            shutil.rmtree(temp_dir)
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")

@app.get("/download/{file_id}")
async def download_file(file_id: str):
    """Скачивание файла (однократное)"""
    # Очищаем старые файлы
    cleanup_old_files()
    
    if file_id not in downloaded_files:
        raise HTTPException(status_code=404, detail="File not found or expired")
    
    file_data = downloaded_files[file_id]
    
    if file_data['downloaded']:
        raise HTTPException(status_code=410, detail="File already downloaded")
    
    # Помечаем файл как скачанный
    file_data['downloaded'] = True
    
    # Возвращаем файл
    response = FileResponse(
        file_data['file_path'],
        media_type=file_data['media_type'],
        filename=file_data['filename']
    )
    
    # Запускаем очистку через 30 секунд
    import threading
    def delayed_cleanup():
        import time
        time.sleep(30)
        try:
            file_id_to_clean = file_id
            if file_id_to_clean in downloaded_files:
                file_data_to_clean = downloaded_files.pop(file_id_to_clean)
                if os.path.exists(file_data_to_clean['file_path']):
                    os.remove(file_data_to_clean['file_path'])
                if os.path.exists(file_data_to_clean['temp_dir']):
                    shutil.rmtree(file_data_to_clean['temp_dir'])
                print(f"🧹 Cleaned up downloaded file: {file_id_to_clean}")
        except Exception as e:
            print(f"⚠️ Cleanup error for {file_id}: {e}")
    
    threading.Thread(target=delayed_cleanup).start()
    
    return response

@app.get("/cleanup")
async def manual_cleanup():
    """Ручная очистка (для отладки)"""
    cleanup_old_files()
    return {"message": f"Cleanup completed. Active files: {len(downloaded_files)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
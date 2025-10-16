// src/App.jsx
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Dropzone from './components/Dropzone'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  const [mode, setMode] = useState('png2pdf')
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState(null)
  const [convertedFile, setConvertedFile] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    startParticles()
  }, [])

  const startParticles = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const PARTICLE_COUNT = 50
    const FADE_DURATION = 1000 // миллисекунды на fade in/out
    const LIFE_TIME = 15000 // сколько живут частицы до исчезновения

    let particles = []
    let animationId
    let lastSpawn = performance.now()

    const createParticles = () => {
      particles = []
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 1,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
          color: `hsl(${270 + Math.random() * 30}, 70%, 60%)`,
          alpha: 0, // начинаем с прозрачности
          state: 'fade-in', // fade-in → alive → fade-out
          timer: 0
        })
      }
    }

    createParticles() // создаем первый набор

    function animate(time) {
      ctx.clearRect(0, 0, canvas.width, canvas.height) // очищаем полностью холст

      particles.forEach(p => {
        // Управляем временем для fade и жизни
        p.timer += 16 // прибл. 60fps
        if (p.state === 'fade-in') {
          p.alpha = Math.min(p.timer / FADE_DURATION, 1)
          if (p.alpha >= 1) {
            p.state = 'alive'
            p.timer = 0
          }
        } else if (p.state === 'alive') {
          p.alpha = 1
          if (p.timer >= LIFE_TIME) {
            p.state = 'fade-out'
            p.timer = 0
          }
        } else if (p.state === 'fade-out') {
          p.alpha = Math.max(1 - p.timer / FADE_DURATION, 0)
        }

        // Рисуем частицу
        if (p.alpha > 0) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = p.color.replace('hsl', 'hsla').replace(')', `, ${p.alpha})`)
          ctx.fill()
        }

        // Двигаем частицы, только если они живые
        if (p.state === 'alive' || p.state === 'fade-in') {
          p.x += p.speedX
          p.y += p.speedY
          if (p.x > canvas.width) p.x = 0
          if (p.x < 0) p.x = canvas.width
          if (p.y > canvas.height) p.y = 0
          if (p.y < 0) p.y = canvas.height
        }
      })

      // Проверяем, все ли частицы полностью исчезли, чтобы пересоздать
      const allGone = particles.every(p => p.state === 'fade-out' && p.alpha === 0)
      if (allGone) {
        createParticles()
      }

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }

  const handleFile = async (file) => {
    setFileName(file.name)
    setLoading(true)
    setConvertedFile(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const endpoint = mode === 'png2pdf' ? '/png2pdf/' : '/pdf2png/'
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      
      // Получаем file_id вместо сразу файла
      const fileId = result.file_id
      const outputFilename = result.filename

      // Скачиваем файл по ID
      const downloadResponse = await fetch(`${API_BASE_URL}/download/${fileId}`)
      
      if (!downloadResponse.ok) {
        throw new Error(`Download failed: ${downloadResponse.status}`)
      }

      const blob = await downloadResponse.blob()
      
      if (blob.size === 0) {
        throw new Error('Получен пустой файл')
      }

      const url = URL.createObjectURL(blob)

      setConvertedFile({
        url,
        filename: outputFilename,
        type: mode === 'png2pdf' ? 'application/pdf' : 'image/png'
      })

      // Авто-скачивание
      const downloadLink = document.createElement('a')
      downloadLink.href = url
      downloadLink.download = outputFilename
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

    } catch (error) {
      console.error('Conversion error:', error)
      
      let errorMessage = 'Ошибка конвертации. Попробуйте еще раз.'
      if (error.message.includes('File must be PNG') || error.message.includes('File must be PDF')) {
        errorMessage = 'Неверный формат файла. Пожалуйста, выберите правильный тип файла.'
      } else if (error.message.includes('PDF is empty')) {
        errorMessage = 'PDF файл пустой или поврежден.'
      } else if (error.message.includes('already downloaded')) {
        errorMessage = 'Файл уже был скачан. Пожалуйста, выполните конвертацию заново.'
      } else if (error.message.includes('File not found')) {
        errorMessage = 'Файл устарел. Пожалуйста, выполните конвертацию заново.'
      }
      
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const downloadConvertedFile = () => {
    if (convertedFile) {
      const link = document.createElement('a')
      link.href = convertedFile.url
      link.download = convertedFile.filename
      link.click()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 relative overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />
      
      {/* Анимированный фон */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <motion.header 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.02, 1],
              rotate: [0, 1, -1, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
              PNG⇄PDF
            </h1>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xl text-purple-200/80 max-w-2xl mx-auto"
          >
            Мгновенная конвертация между форматами
          </motion.p>
        </motion.header>

        {/* Переключатель режимов */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-12"
        >
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-2 border border-white/10">
            {['png2pdf', 'pdf2png'].map((m) => (
              <motion.button
                key={m}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMode(m)}
                className={`px-8 py-4 rounded-xl font-semibold transition-all ${
                  mode === m 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-2xl shadow-purple-500/30' 
                    : 'text-purple-200 hover:text-white'
                }`}
              >
                {m === 'png2pdf' ? 'PNG → PDF' : 'PDF → PNG'}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Основная зона загрузки */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <Dropzone onFile={handleFile} mode={mode} loading={loading} />
          </motion.div>

          {/* Панель информации */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Статус */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-lg border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-4">🚀 Статус конвертации</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200">Файл</span>
                  <span className="text-white font-medium">{fileName || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200">Режим</span>
                  <span className="text-white font-medium">
                    {mode === 'png2pdf' ? 'PNG → PDF' : 'PDF → PNG'}
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-2 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 rounded-full"
                        animate={{
                          x: ['-100%', '100%']
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    </div>
                    <p className="text-xs text-purple-300 text-center mt-2">
                      Конвертация...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Кнопка скачивания результата */}
              <AnimatePresence>
                {convertedFile && !loading && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={downloadConvertedFile}
                    className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30"
                  >
                    📥 Скачать {mode === 'png2pdf' ? 'PDF' : 'PNG'}
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Преимущества */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-lg border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-4">✨ Преимущества</h3>
              <div className="space-y-3 text-sm">
                {['⚡ Мгновенная конвертация', '🔒 Безопасно', '🎯 Высокое качество', '💾 Авто-скачивание'].map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 text-purple-200"
                  >
                    <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                    {item}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-16"
        >
        </motion.footer>
      </div>
    </div>
  )
}
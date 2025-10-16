// src/components/Dropzone.jsx
import React, { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export default function Dropzone({ onFile, mode, loading }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isHover, setIsHover] = useState(false)
  const fileInputRef = useRef(null)

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const isValidType = mode === 'png2pdf' 
        ? file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
        : file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      
      if (isValidType) {
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
          alert('Файл слишком большой. Максимальный размер: 50MB')
          return
        }
        onFile(file)
      } else {
        alert(mode === 'png2pdf' 
          ? 'Пожалуйста, выберите PNG файл' 
          : 'Пожалуйста, выберите PDF файл'
        )
      }
    }
  }, [onFile, mode])

  const onFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const isValidType = mode === 'png2pdf' 
        ? file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
        : file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      
      if (isValidType) {
        if (file.size > 50 * 1024 * 1024) {
          alert('Файл слишком большой. Максимальный размер: 50MB')
          e.target.value = ''
          return
        }
        onFile(file)
      } else {
        alert(mode === 'png2pdf' 
          ? 'Пожалуйста, выберите PNG файл' 
          : 'Пожалуйста, выберите PDF файл'
        )
        e.target.value = ''
      }
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
      whileHover={{ scale: 1.01 }}
      className="relative"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={mode === 'png2pdf' ? '.png,image/png' : '.pdf,application/pdf'}
        onChange={onFileSelect}
        className="hidden"
      />

      <motion.div
        animate={{
          background: isDragOver 
            ? 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, rgba(236,72,153,0.1) 100%)'
            : 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, rgba(236,72,153,0.05) 100%)',
          borderColor: isDragOver ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.1)',
          scale: isDragOver ? 1.02 : 1
        }}
        whileHover={{ 
          scale: 1.02,
          borderColor: 'rgba(168,85,247,0.3)'
        }}
        className="relative rounded-3xl border-2 border-dashed p-12 cursor-pointer backdrop-blur-lg bg-white/5 overflow-hidden"
        onClick={handleClick}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      >
        {/* Анимированный градиентный фон */}
        <motion.div 
          animate={{
            opacity: isHover ? 1 : 0.3,
            scale: isHover ? 1.1 : 1
          }}
          className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent"
        />
        
        {/* Частицы */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-purple-400 rounded-full"
              animate={{
                y: [0, -20, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                repeatType: "loop"
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Анимированная иконка */}
          <motion.div
            animate={{
              y: [0, -10, 0],
              rotate: isDragOver ? [0, 5, -5, 0] : 0
            }}
            transition={{
              y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 0.5 }
            }}
            className="relative"
          >
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center backdrop-blur-sm border border-white/10">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="text-purple-400">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 21h8a2 2 0 002-2v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2a2 2 0 002 2z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </motion.div>
            </div>
            
            {/* Вращающееся кольцо */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-purple-400 border-r-pink-400"
            />
          </motion.div>

          {/* Текст */}
          <div className="text-center space-y-4">
            <motion.h2 
              animate={{ 
                backgroundPosition: ['0%', '100%', '0%'],
                backgroundSize: ['200%', '200%', '200%']
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-3xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent"
            >
              {isDragOver 
                ? '🎉 Отпустите для загрузки!' 
                : mode === 'png2pdf' 
                  ? 'Загрузите PNG файл' 
                  : 'Загрузите PDF файл'
              }
            </motion.h2>
            
            <motion.p 
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-purple-200/80 text-lg max-w-md"
            >
              {isDragOver 
                ? 'Файл готов к конвертации!'
                : 'Перетащите файл или нажмите для выбора'
              }
            </motion.p>
          </div>

          {/* Кнопки */}
          <motion.div 
            className="flex gap-4"
            animate={{ y: isDragOver ? 10 : 0 }}
          >
            <motion.button
              whileHover={{ 
                scale: 1.05,
                background: "linear-gradient(45deg, #a855f7, #ec4899)"
              }}
              whileTap={{ scale: 0.95 }}
              disabled={loading}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-2xl shadow-purple-500/30 disabled:opacity-50"
            >
              {loading ? '🪄 Обработка...' : mode === 'png2pdf' ? '📸 Выбрать PNG' : '📄 Выбрать PDF'}
            </motion.button>

          </motion.div>
        </div>

        {/* Эффект свечения при drag */}
        <motion.div
          animate={{ 
            opacity: isDragOver ? 1 : 0,
            scale: isDragOver ? 1 : 0.8
          }}
          className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl"
        />
      </motion.div>
    </motion.div>
  )
}
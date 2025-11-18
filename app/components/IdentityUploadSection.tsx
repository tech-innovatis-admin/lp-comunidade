'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Image, X, CheckCircle, AlertCircle } from 'lucide-react'

type UploadType = 'foto' | 'pdf' | null

interface FileWithPreview {
  file: File
  preview: string
}

export default function IdentityUploadSection() {
  const [uploadType, setUploadType] = useState<UploadType>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [photoFiles, setPhotoFiles] = useState<FileWithPreview[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const handleTypeSelection = (type: 'foto' | 'pdf') => {
    setUploadType(type)
    // Limpa arquivos quando muda o tipo
    setPdfFile(null)
    setPhotoFiles([])
    setErrors({})
  }

  const validatePDF = (file: File): boolean => {
    if (file.type !== 'application/pdf') {
      setErrors(prev => ({ ...prev, pdf: 'Apenas arquivos PDF são permitidos' }))
      return false
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
      setErrors(prev => ({ ...prev, pdf: 'O arquivo PDF deve ter no máximo 5MB' }))
      return false
    }
    return true
  }

  const validatePhoto = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, photo: 'Apenas imagens JPG, PNG ou WEBP são permitidas' }))
      return false
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
      setErrors(prev => ({ ...prev, photo: 'Cada foto deve ter no máximo 5MB' }))
      return false
    }
    return true
  }

  const handlePDFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (validatePDF(file)) {
        setPdfFile(file)
        setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.pdf
          return newErrors
        })
      }
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (photoFiles.length + files.length > 2) {
      setErrors(prev => ({ ...prev, photo: 'Você pode anexar no máximo 2 fotos (frente e verso)' }))
      return
    }

    const validFiles: FileWithPreview[] = []
    
    files.forEach(file => {
      if (validatePhoto(file)) {
        const preview = URL.createObjectURL(file)
        validFiles.push({ file, preview })
      }
    })

    if (validFiles.length > 0) {
      setPhotoFiles(prev => [...prev, ...validFiles])
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.photo
        return newErrors
      })
    }
  }

  const removePDF = () => {
    setPdfFile(null)
    if (pdfInputRef.current) {
      pdfInputRef.current.value = ''
    }
  }

  const removePhoto = (index: number) => {
    const fileToRemove = photoFiles[index]
    URL.revokeObjectURL(fileToRemove.preview)
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">
        Arquive o Seu Documento de Identidade
      </h3>
      <p className="text-sm text-gray-400 mb-6 font-normal">
        Anexe uma foto ou PDF do seu documento de identidade (RG, CNH ou similar)
      </p>

      {/* Seleção de Tipo */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-white mb-3">
          Escolha o formato:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Opção Foto */}
          <button
            type="button"
            onClick={() => handleTypeSelection('foto')}
            className={`
              p-4 rounded-lg border-2 transition-all duration-300
              ${uploadType === 'foto'
                ? 'border-[#25D366] bg-[#25D366]/10'
                : 'border-gray-600 hover:border-gray-500'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-lg
                ${uploadType === 'foto' ? 'bg-[#25D366]' : 'bg-gray-700'}
              `}>
                <Image className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-white">Fotos</p>
                <p className="text-xs text-gray-400 font-normal">Até 2 fotos (frente e verso)</p>
              </div>
            </div>
          </button>

          {/* Opção PDF */}
          <button
            type="button"
            onClick={() => handleTypeSelection('pdf')}
            className={`
              p-4 rounded-lg border-2 transition-all duration-300
              ${uploadType === 'pdf'
                ? 'border-[#25D366] bg-[#25D366]/10'
                : 'border-gray-600 hover:border-gray-500'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-lg
                ${uploadType === 'pdf' ? 'bg-[#25D366]' : 'bg-gray-700'}
              `}>
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-white">PDF</p>
                <p className="text-xs text-gray-400 font-normal">1 arquivo PDF</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Upload de PDF */}
      {uploadType === 'pdf' && (
        <div className="space-y-4">
          <div>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handlePDFChange}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-[#25D366] transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-300 font-medium">
                Clique para selecionar o arquivo
              </p>
              <p className="text-xs text-gray-400 mt-1 font-normal">
                Máximo 5MB
              </p>
            </label>
          </div>

          {pdfFile && (
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#25D366]" />
                <div>
                  <p className="text-sm font-medium text-white">{pdfFile.name}</p>
                  <p className="text-xs text-gray-400 font-normal">{formatFileSize(pdfFile.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={removePDF}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Remover arquivo"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          )}

          {errors.pdf && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400 font-normal">{errors.pdf}</p>
            </div>
          )}
        </div>
      )}

      {/* Upload de Fotos */}
      {uploadType === 'foto' && (
        <div className="space-y-4">
          {photoFiles.length < 2 && (
            <div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoChange}
                multiple
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-[#25D366] transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-300 font-medium">
                  Clique para selecionar as fotos
                </p>
                <p className="text-xs text-gray-400 mt-1 font-normal">
                  Máximo 2 fotos (frente e verso), 5MB cada
                </p>
              </label>
            </div>
          )}

          {/* Preview das Fotos */}
          {photoFiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photoFiles.map((photo, index) => (
                <div
                  key={index}
                  className="relative group bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden"
                >
                  <div className="aspect-video relative">
                    <img
                      src={photo.preview}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white font-medium">
                      {index === 0 ? 'Frente' : 'Verso'}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Remover foto"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium text-white truncate">{photo.file.name}</p>
                    <p className="text-xs text-gray-400 font-normal">{formatFileSize(photo.file.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {photoFiles.length >= 2 && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-400 font-normal">
                Máximo de fotos atingido (2 fotos)
              </p>
            </div>
          )}

          {errors.photo && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400 font-normal">{errors.photo}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


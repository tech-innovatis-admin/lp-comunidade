const MAX_IMAGE_EDGE = 1920
const JPEG_QUALITY = 0.82

function isCompressibleImage(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())
}

/**
 * Redimensiona/comprime imagens no cliente antes do upload.
 * Arquivos que não são imagem (ou falham no processamento) voltam intactos.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!isCompressibleImage(file) || typeof window === 'undefined') {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    if (scale >= 1 && file.size <= 1.5 * 1024 * 1024) {
      bitmap.close()
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return file
    }

    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputType, outputType === 'image/jpeg' ? JPEG_QUALITY : undefined)
    })

    if (!blob || blob.size >= file.size) {
      return file
    }

    const extension = outputType === 'image/png' ? 'png' : 'jpg'
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagem'
    return new File([blob], `${baseName}.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}

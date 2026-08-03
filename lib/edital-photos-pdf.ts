import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

export type PhotoForPdf = {
  bytes: Buffer;
  mimeType: string;
};

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 36;

/**
 * Monta um PDF A4 com uma foto por página (centralizada, mantendo proporção).
 * WEBP e outros formatos não suportados pelo pdf-lib são convertidos para JPEG via sharp.
 */
export async function generateLabPhotosPdf(photos: PhotoForPdf[]): Promise<Buffer> {
  if (photos.length === 0) {
    throw new Error('Nenhuma foto para gerar o PDF');
  }

  const pdfDoc = await PDFDocument.create();
  const maxWidth = A4_WIDTH - PAGE_MARGIN * 2;
  const maxHeight = A4_HEIGHT - PAGE_MARGIN * 2;

  for (const photo of photos) {
    const { embedBytes, format } = await normalizeImageForPdf(photo);
    const image =
      format === 'png' ? await pdfDoc.embedPng(embedBytes) : await pdfDoc.embedJpg(embedBytes);

    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const x = (A4_WIDTH - drawWidth) / 2;
    const y = (A4_HEIGHT - drawHeight) / 2;

    page.drawImage(image, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function normalizeImageForPdf(
  photo: PhotoForPdf
): Promise<{ embedBytes: Uint8Array; format: 'jpeg' | 'png' }> {
  const mime = photo.mimeType.toLowerCase();

  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return { embedBytes: new Uint8Array(photo.bytes), format: 'jpeg' };
  }

  if (mime === 'image/png') {
    return { embedBytes: new Uint8Array(photo.bytes), format: 'png' };
  }

  // WEBP e demais → JPEG
  const jpegBytes = await sharp(photo.bytes).jpeg({ quality: 85 }).toBuffer();
  return { embedBytes: new Uint8Array(jpegBytes), format: 'jpeg' };
}

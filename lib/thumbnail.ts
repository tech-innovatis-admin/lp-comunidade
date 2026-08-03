/**
 * Gera miniaturas (JPEG, ~400px de largura) para preview no painel admin.
 * PDFs: renderiza a 1ª página via pdf-to-img (sem dependência nativa de
 * canvas — importante pro build Docker Alpine/arm64 do projeto) e comprime
 * com sharp. Imagens: só redimensiona/comprime com sharp.
 */

import sharp from 'sharp';
import { pdf } from 'pdf-to-img';

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_QUALITY = 80;

export async function generateThumbnailFromPdf(pdfBuffer: Buffer): Promise<Buffer> {
  const document = await pdf(pdfBuffer, { scale: 1.5 });
  const firstPage = await document.getPage(1);

  return sharp(firstPage)
    .resize({ width: THUMBNAIL_WIDTH })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}

export async function generateThumbnailFromImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize({ width: THUMBNAIL_WIDTH })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}

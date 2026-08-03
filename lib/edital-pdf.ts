import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getLetterheadImageBytes } from './letterhead';

export type ParticipationTermInput = {
  fullName: string;
  cpf: string;
  registrationDate: Date;
  submissionId: number;
};

function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) {
    return cpf;
  }

  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

async function drawParagraph(
  page: Awaited<ReturnType<PDFDocument['addPage']>>,
  text: string,
  x: number,
  y: number,
  width: number,
  font: any,
  fontSize: number,
  lineHeight: number
): Promise<number> {
  const lines = text.split(/\s+/).reduce<string[]>((acc, word) => {
    const current = acc.length > 0 ? acc[acc.length - 1] : '';
    const candidate = current.length > 0 ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= width) {
      if (acc.length === 0) {
        acc.push(candidate);
      } else {
        acc[acc.length - 1] = candidate;
      }
    } else {
      acc.push(word);
    }
    return acc;
  }, []);

  let currentY = y;
  for (const line of lines) {
    page.drawText(line, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });
    currentY -= lineHeight;
  }

  return currentY;
}

export async function generateParticipationTermPdf(input: ParticipationTermInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const contentWidth = page.getWidth() - margin * 2;

  const letterheadBytes = await getLetterheadImageBytes();
  const letterheadImage = await pdfDoc.embedPng(letterheadBytes);
  page.drawImage(letterheadImage, {
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
  });

  page.drawText('Termo de Comprovação de Participação', {
    x: margin,
    y: 785,
    size: 18,
    font: boldFont,
    color: rgb(0.08, 0.08, 0.08),
  });

  page.drawText(`Submissão nº ${input.submissionId}`, {
    x: margin,
    y: 760,
    size: 11,
    font: regularFont,
    color: rgb(0.35, 0.35, 0.35),
  });

  let cursorY = 720;

  cursorY = await drawParagraph(
    page,
    `Declaramos, para os devidos fins, que ${input.fullName} (${maskCpf(input.cpf)}) apresentou proposta ao Edital PPI e teve a participação registrada pelo sistema em ${formatDateTime(input.registrationDate)}.`,
    margin,
    cursorY,
    contentWidth,
    regularFont,
    12,
    18
  );

  cursorY -= 18;

  cursorY = await drawParagraph(
    page,
    'Este documento é emitido automaticamente pelo sistema após a validação do gate de CPF e serve como comprovação de participação na etapa de submissão da proposta.',
    margin,
    cursorY,
    contentWidth,
    regularFont,
    12,
    18
  );

  cursorY -= 30;

  page.drawText('Assinatura eletrônica do sistema', {
    x: margin,
    y: cursorY,
    size: 11,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  cursorY -= 18;

  page.drawText(formatDateTime(new Date()), {
    x: margin,
    y: cursorY,
    size: 10,
    font: regularFont,
    color: rgb(0.35, 0.35, 0.35),
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

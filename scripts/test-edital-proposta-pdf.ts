import { PDFDocument } from 'pdf-lib';
import { generateParticipationTermPdf } from '../lib/edital-pdf';

async function main() {
  const pdf = await generateParticipationTermPdf({
    fullName: 'Teste de Integração',
    cpf: '123.456.789-09',
    registrationDate: new Date('2026-07-17T12:00:00-03:00'),
    submissionId: 123,
  });

  const loaded = await PDFDocument.load(pdf);

  console.log(`PDF bytes: ${pdf.length}`);
  console.log(`Pages: ${loaded.getPageCount()}`);
  console.log(`Header: ${pdf.subarray(0, 5).toString('utf8')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import fs from 'fs/promises';
import handlebars from 'handlebars';
import path from 'path';
import puppeteer from 'puppeteer';

export const generatePDF = async (templatePath: string, data: any) => {
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  const template = handlebars.compile(templateContent);
  const html = template(data);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const outputPath = path.join('/tmp', `${data.serviceId}.pdf`);

  await page.pdf({ path: outputPath, format: 'A4', printBackground: true });

  await browser.close();
  return outputPath;
};

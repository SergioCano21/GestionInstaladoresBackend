import fs from 'fs/promises';
import handlebars from 'handlebars';
import path from 'path';

export const generatePDF = async (templatePath: string, data: any) => {
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  const template = handlebars.compile(templateContent);
  const html = template(data);

  const isVercel = !!process.env.VERCEL_ENV;
  let puppeteer: any,
    launchOptions: any = {
      headless: true,
    };

  if (isVercel) {
    const chromium = (await import('@sparticuz/chromium')).default;
    puppeteer = await import('puppeteer-core');
    launchOptions = {
      ...launchOptions,
      args: chromium.args,
      executablePath: await chromium.executablePath(),
    };
  } else {
    puppeteer = await import('puppeteer');
  }

  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const outputPath = path.join('/tmp', `${data.serviceId}.pdf`);

  await page.pdf({ path: outputPath, format: 'A4', printBackground: true });

  await browser.close();
  return outputPath;
};

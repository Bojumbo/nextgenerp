const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json({ limit: '50mb' }));

app.post('/render', async (req, res) => {
  const { html } = req.body;
  if (!html) {
    return res.status(400).send('Missing html parameter in body');
  }

  logger('Rendering HTML to PDF...');
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'shell',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    res.contentType('application/pdf');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error rendering PDF:', err);
    res.status(500).send(err.toString());
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

function logger(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`Express Puppeteer PDF service running on port ${PORT}`);
});

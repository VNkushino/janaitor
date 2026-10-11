const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/resolve', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).json({ error: 'Thiếu tham số url!' });
    }

    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Đổi sang domcontentloaded và tăng timeout lên 60 giây để không bị ngắt quãng
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Chờ thêm 3 giây để các script tự động chạy
        await new Promise(r => setTimeout(r, 3000));

        let finalUrl = page.url();

        // Quét tìm link pass-note trong trang
        if (finalUrl.includes('get-pass')) {
            let extractedLink = await page.evaluate(() => {
                let linkEl = document.querySelector('a[href*="pass-note"]') || document.querySelector('[data-link*="pass-note"]');
                return linkEl ? linkEl.href : null;
            });

            if (extractedLink) {
                finalUrl = extractedLink;
            }
        }

        await browser.close();

        return res.json({ success: true, finalUrl });

    } catch (error) {
        if (browser) await browser.close();
        return res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy trên cổng ${PORT}`));

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
        // Cấu hình chromium siêu nhẹ cho Render
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Truy cập vào trang get-pass
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Đợi một chút để các script động chạy xong và tự động lấy URL hoặc tìm link chứa pass-note
        await new Promise(r => setTimeout(r, 3000));

        let finalUrl = page.url();

        // Nếu URL hiện tại vẫn là get-pass, quét tìm thẻ a hoặc button dẫn tới pass-note
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

        if (finalUrl && finalUrl.includes('pass-note')) {
            return res.json({ success: true, finalUrl });
        } else {
            return res.json({ success: true, finalUrl: finalUrl, note: "Đã xử lý qua trình duyệt ảo nhưng chưa tự động nhảy tới note, trả về trạng thái cuối." });
        }

    } catch (error) {
        if (browser) await browser.close();
        return res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy trên cổng ${PORT}`));

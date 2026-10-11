const express = require('express');
const puppeteer = require('puppeteer');
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
        // Khởi động trình duyệt ảo ngầm trên server
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Truy cập vào link get-pass
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Đợi một chút hoặc bấm vào nút nếu cần, sau đó lấy URL hiện tại của trang hoặc tìm thẻ chứa pass-note
        let finalUrl = page.url();

        // Kiểm tra nếu URL hiện tại vẫn là trang get-pass, thử quét xem có thẻ a nào chứa pass-note không
        if (finalUrl.includes('get-pass')) {
            let extractedLink = await page.evaluate(() => {
                let linkEl = document.querySelector('a[href*="pass-note"]');
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
            return res.status(400).json({ 
                success: false, 
                error: 'Đã mở trang nhưng không tìm thấy link pass-note đích. Trang có thể yêu cầu click thủ công.' 
            });
        }

    } catch (error) {
        if (browser) await browser.close();
        return res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy trên cổng ${PORT}`));

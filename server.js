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

        // 1. Vào link ban đầu
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 2. Vòng lặp tự động vượt qua các trang trung gian (tối đa 5 lần)
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 4000)); // Đợi trang load script trung gian

            let currentUrl = page.url();
            
            // Nếu đã ra link pass-note thì dừng lại luôn
            if (currentUrl.includes('pass-note') || !currentUrl.includes('h-game18.xyz/get-pass') && !currentUrl.includes('srnky.com') && !currentUrl.includes('clksz.com')) {
                break;
            }

            // Tìm xem trên trang trung gian có nút "Tiếp tục" / "Get Link" / "Continue" hay thẻ chứa link đích không thì bấm/chuyển vào
            let nextAction = await page.evaluate(() => {
                // Thử tìm thẻ a dẫn tới pass-note hoặc chứa link ngoài
                let passLink = document.querySelector('a[href*="pass-note"]');
                if (passLink) return { type: 'url', val: passLink.href };

                // Thử tìm nút bấm vượt qua trung gian
                let buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
                let btn = buttons.find(b => {
                    let text = (b.innerText || b.value || '').toLowerCase();
                    return text.includes('tiếp tục') || text.includes('continue') || text.includes('get link') || text.includes('verify') || text.includes('click');
                });
                if (btn) {
                    btn.click();
                    return { type: 'clicked' };
                }
                return null;
            });

            if (nextAction) {
                if (nextAction.type === 'url') {
                    await page.goto(nextAction.val, { waitUntil: 'domcontentloaded', timeout: 30000 });
                }
            } else {
                break; // Không tìm thấy nút bấm hay chuyển hướng nữa thì dừng
            }
        }

        let finalUrl = page.url();
        await browser.close();

        return res.json({ success: true, finalUrl });

    } catch (error) {
        if (browser) await browser.close();
        return res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy trên cổng ${PORT}`));

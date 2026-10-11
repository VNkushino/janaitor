const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/resolve', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).json({ error: 'Thiếu tham số url!' });
    }

    try {
        let currentUrl = targetUrl;
        
        // Gửi yêu cầu fetch bám theo chuỗi chuyển hướng (redirect)
        let response = await fetch(currentUrl, {
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        let finalUrl = response.url;
        let htmlText = await response.text();

        // Quét tìm link pass-note trong nội dung trả về nếu có
        let match = htmlText.match(/https?:\/\/[^\s"'<>]+pass-note[^\s"'<>]+/i) || htmlText.match(/["'](\/pass-note\/[^"']+)["']/i);
        if (match) {
            let found = match[1] || match[0];
            if (found.startsWith('/')) {
                let parsed = new URL(targetUrl);
                finalUrl = `${parsed.protocol}//${parsed.host}${found}`;
            } else {
                finalUrl = found;
            }
        }

        res.json({ success: true, finalUrl });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy trên cổng ${PORT}`));

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
        let history = [currentUrl];

        // Lặp tối đa 5 lần chuyển hướng để tìm link cuối cùng
        for (let i = 0; i < 5; i++) {
            let response = await fetch(currentUrl, {
                redirect: 'manual', // Không tự động nhảy, để ta bắt header Location
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            let location = response.headers.get('location');
            if (location) {
                // Xử lý trường hợp URL tương đối
                if (location.startsWith('/')) {
                    let parsed = new URL(currentUrl);
                    currentUrl = `${parsed.protocol}//${parsed.host}${location}`;
                } else {
                    currentUrl = location;
                }
                history.push(currentUrl);
            } else {
                // Nếu không có header redirect, thử đọc nội dung trang xem có chứa link pass-note không
                let text = await response.text();
                let match = text.match(/https?:\/\/[^\s"'<>]+pass-note[^\s"'<>]+/);
                if (match) {
                    currentUrl = match[0];
                    history.push(currentUrl);
                }
                break;
            }
        }

        res.json({ success: true, finalUrl: currentUrl, history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

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
        // Tải nội dung HTML của trang get-pass
        let response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        let htmlText = await response.text();

        // Dùng biểu thức chính quy (Regex) quét tìm xem trong trang có chứa đường dẫn pass-note nào không
        // Thường các trang này chứa link dạng /pass-note/... hoặc https://.../pass-note/...
        let match = htmlText.match(/https?:\/\/[^\s"'<>]+pass-note[^\s"'<>]+/i) || htmlText.match(/["'](\/pass-note\/[^"']+)["']/i);

        if (match) {
            let foundLink = match[1] || match[0];
            // Nếu là đường dẫn tương đối (bắt đầu bằng /), ghép thêm tên miền vào
            if (foundLink.startsWith('/')) {
                let parsedObj = new URL(targetUrl);
                foundLink = `${parsedObj.protocol}//${parsedObj.host}${foundLink}`;
            }
            return res.json({ success: true, finalUrl: foundLink });
        }

        // Nếu không tìm thấy trực tiếp, thử quét các thẻ meta refresh hoặc script chuyển hướng window.location
        let metaMatch = htmlText.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i) || htmlText.match(/content\s*=\s*["'][^"']*url=([^"']+)["']/i);
        if (metaMatch) {
            let redirectUrl = metaMatch[1];
            return res.json({ success: true, finalUrl: redirectUrl });
        }

        res.status(400).json({ success: false, error: 'Không tìm thấy link pass-note ẩn bên trong trang này. Trang có thể yêu cầu vượt captcha bằng tay.' });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

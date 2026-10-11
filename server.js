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
        let visited = [currentUrl];

        // Lặp qua tối đa 5 lần chuyển hướng để bám theo đường đi của trang rút gọn
        for (let i = 0; i < 5; i++) {
            let response = await fetch(currentUrl, {
                redirect: 'manual', // Bắt từng bước chuyển hướng header Location
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://h-game18.xyz/'
                }
            });

            let location = response.headers.get('location');
            if (location) {
                // Xử lý nếu là đường dẫn tuyệt đối hoặc tương đối
                if (location.startsWith('/')) {
                    let parsed = new URL(currentUrl);
                    currentUrl = `${parsed.protocol}//${parsed.host}${location}`;
                } else {
                    currentUrl = location;
                }
                visited.push(currentUrl);
            } else {
                // Nếu không có header redirect, đọc nội dung HTML xem có chứa link pass-note hoặc script đổi hướng không
                let htmlText = await response.text();
                
                // 1. Tìm trực tiếp từ khóa pass-note
                let matchNote = htmlText.match(/https?:\/\/[^\s"'<>]+pass-note[^\s"'<>]+/i) || htmlText.match(/["'](\/pass-note\/[^"']+)["']/i);
                if (matchNote) {
                    let found = matchNote[1] || matchNote[0];
                    if (found.startsWith('/')) {
                        let parsed = new URL(currentUrl);
                        currentUrl = `${parsed.protocol}//${parsed.host}${found}`;
                    } else {
                        currentUrl = found;
                    }
                    visited.push(currentUrl);
                    break;
                }

                // 2. Tìm nếu trang trung gian chứa link chuyển hướng trong javascript (ví dụ window.location)
                let matchJs = htmlText.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i) || htmlText.match(/URL=([^"'\s>]+)/i);
                if (matchJs) {
                    currentUrl = matchJs[1];
                    visited.push(currentUrl);
                    continue; // tiếp tục vòng lặp với link mới
                }

                break;
            }

            // Nếu URL hiện tại đã lòi ra chữ pass-note thì dừng luôn
            if (currentUrl.includes('pass-note')) {
                break;
            }
        }

        // Kiểm tra xem kết quả cuối cùng có phải là pass-note không
        let finalResult = visited[visited.length - 1];
        res.json({ 
            success: true, 
            finalUrl: finalResult, 
            history: visited 
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy trên cổng ${PORT}`));

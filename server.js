/**
 * OTO DEDEKTİF PRO - BACKEND PROXY SERVER
 * Bu dosya Render.com üzerinde çalışacak ve API anahtarını gizli tutacaktır.
 */

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Güvenlik ve CORS Ayarları
app.use(helmet());
app.use(cors()); // Mobil uygulamanın sunucuya bağlanmasına izin verir
app.use(express.json({ limit: '15mb' })); // Fotoğraf verisi için limit

// Render.com panelinden ayarlanacak olan API Anahtarı
const GEMINI_API_KEY = process.env.GEMINI_KEY; 

// Analiz İsteklerini Karşılayan Uç Nokta (Endpoint)
app.post('/api/analyze', async (req, res) => {
    try {
        const { imageBase64, part, mode, userId } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: "Görüntü verisi alınamadı." });
        }

        // Yapay Zeka (AI) Talimatları
        const prompt = `Sen profesyonel bir otomobil boya ve kaporta ekspertiz uzmanısın. 
        Gelen görseldeki ${part} bölgesini ${mode} modunda analiz et. 
        Boya katmanındaki pigment dağılımını ve mikron farklarını incele.
        
        YANITI SADECE JSON FORMATINDA VER:
        {
            "decision": "ORJİNAL" veya "BOYALI",
            "confidence": 0-100,
            "micron": "tahmini değer",
            "explanation": "teknik analiz notu",
            "hotspots": [{"x": px, "y": px, "r": px}]
        }`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;
        
        const body = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
                ]
            }],
            generationConfig: { responseMimeType: "application/json" }
        };

        // Google Gemini API'sine istek gönder
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]) {
            const resultText = data.candidates[0].content.parts[0].text;
            // JSON yanıtını temizle ve uygulamaya gönder
            res.json(JSON.parse(resultText));
        } else {
            throw new Error("Yapay zeka yanıt oluşturamadı.");
        }
        
    } catch (error) {
        console.error("Hata:", error.message);
        res.status(500).json({ error: "Sunucu tarafında analiz hatası oluştu." });
    }
});

// Sunucuyu Başlat
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Oto Dedektif Backend ${PORT} portunda hazır.`));
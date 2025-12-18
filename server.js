/**
 * OTO DEDEKTİF PRO - BACKEND PROXY SERVER
 * Bu dosya Render.com üzerinde çalışır ve API anahtarını gizli tutacaktır.
 */

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Güvenlik ve CORS Ayarları
app.use(helmet());
app.use(cors()); 
app.use(express.json({ limit: '15mb' }));

// Render.com panelinden ayarlanacak olan API Anahtarı
const GEMINI_API_KEY = process.env.GEMINI_KEY; 

// --- SAĞLIK KONTROLÜ (Health Check) ---
// Tarayıcıdan linke tıklandığında sunucun çalıştığını doğrular
app.get('/', (req, res) => {
    console.log("GET / isteği alındı.");
    res.status(200).json({
        status: "Active",
        message: "Oto Dedektif API Başarıyla Çalışıyor!",
        timestamp: new Date().toISOString()
    });
});

// Analiz İsteklerini Karşılayan Uç Nokta (Endpoint)
app.post('/api/analyze', async (req, res) => {
    console.log("POST /api/analyze isteği alındı.");
    try {
        const { imageBase64, part, mode, userId } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: "Görüntü verisi alınamadı." });
        }

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

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]) {
            const resultText = data.candidates[0].content.parts[0].text;
            res.json(JSON.parse(resultText));
        } else {
            console.error("Gemini API yanıt vermedi:", data);
            throw new Error("Yapay zeka yanıt oluşturamadı.");
        }
        
    } catch (error) {
        console.error("Hata:", error.message);
        res.status(500).json({ error: "Sunucu tarafında analiz hatası oluştu." });
    }
});

// Sunucuyu Başlat
const PORT = process.env.PORT || 3001;
// Render için 0.0.0.0 üzerinde dinlemek daha sağlıklıdır
app.listen(PORT, '0.0.0.0', () => {
    console.log(`-----------------------------------------`);
    console.log(`Oto Dedektif Backend Hazır!`);
    console.log(`Port: ${PORT}`);
    console.log(`Zaman: ${new Date().toLocaleString()}`);
    console.log(`-----------------------------------------`);
});

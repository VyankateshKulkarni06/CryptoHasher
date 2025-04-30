// 📁 backend/embed.js

const express = require('express');
const cors=require("cors");
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const extractChunks = require('png-chunks-extract');
const encodeChunks = require('png-chunks-encode');
const textChunk = require('png-chunk-text');

const app = express();
app.use(cors({
    origin: 'https://stegno-hasher.vercel.app'
  }));
  
const upload = multer({ dest: 'uploads/' });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/embed', upload.single('image'), (req, res) => {
    const { metadataJson } = req.body;
    const imagePath = req.file.path;

    if (!metadataJson) {
        return res.status(400).json({ error: 'metadataJson is required' });
    }

    // Read original PNG
    const data = fs.readFileSync(imagePath);
    const chunks = extractChunks(data);
    
    // Create new text chunk with keyword 'CryptoMeta'
    const metaChunk = textChunk.encode('CryptoMeta', metadataJson);
    
    // Insert before IEND chunk
    const newChunks = [];
    for (let chunk of chunks) {
        if (chunk.name === 'IEND') {
            newChunks.push(metaChunk);
        }
        newChunks.push(chunk);
    }
    
    const outputData = encodeChunks(newChunks);
    const outputPath = path.join('uploads', 'embedded_' + req.file.originalname);
    fs.writeFileSync(outputPath, outputData);
    
    res.download(outputPath, err => {
        if (err) res.status(500).send('Download failed');
    });
});

app.post('/extract', upload.single('image'), (req, res) => {
    const imagePath = req.file.path;
    try {
        const data = fs.readFileSync(imagePath);
        const chunks = extractChunks(data);
        // Filter all text chunks, decode and find our keyword
        const metas = chunks
            .filter(c => c.name === 'tEXt')
            .map(c => textChunk.decode(c))
            .filter(obj => obj.keyword === 'CryptoMeta');
        if (metas.length === 0) return res.json([]);
        // Parse JSON from first matching chunk
        const parsed = JSON.parse(metas[0].text);
        return res.json(parsed);
    } catch (err) {
        console.error('Extraction error:', err);
        return res.status(500).json({ error: 'Failed to extract metadata' });
    }
});


const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

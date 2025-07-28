// server.js
require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();
const port = 3000;

// Access your API key as an environment variable
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    console.error("GEMINI_API_KEY is not set in the .env file.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

app.use(express.json()); // For parsing application/json
app.use(express.static(__dirname + '/../client/public')); // Serve static files from a 'public' folder (where index.html and script.js would be)

app.get('/', (req, res) => {
    // Similarly, construct the absolute path to index.html
    res.sendFile(__dirname + '/../client/public/index.html');
});

// CORS protection (important for development, adjust for production)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // WARNING: In production, specify your exact frontend domain
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.post('/api/get-ai-suggestions', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        res.json({ aiText: text });
    } catch (error) { // <--- The error is happening in this block!
        console.error('Error calling Gemini API:', error); // THIS IS THE MOST IMPORTANT LINE TO CHECK!
        res.status(500).json({ error: 'Failed to get AI suggestions.' }); // This is the response you're seeing
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
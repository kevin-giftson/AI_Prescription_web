// server.js
require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path'); // Import the 'path' module for directory operations
const app = express();
const port = 3000;

// --- Global Error Handlers ---
// These handlers will catch any unhandled exceptions or promise rejections
// that occur anywhere in your Node.js application, preventing it from crashing silently.
process.on('uncaughtException', (err) => {
    console.error('🚨 UNCAUGHT EXCEPTION (Server Crash):', err.stack || err.message);
    process.exit(1); // Exit the process to indicate a critical error
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED REJECTION (Server Crash):', reason);
    console.error('Promise:', promise);
    process.exit(1); // Exit the process
});
// --- End Global Error Handlers ---

// Access your API key as an environment variable
const geminiApiKey = process.env.GEMINI_API_KEY;

// Log API key (showing only last 4 characters for security) for verification during server startup
console.log('GEMINI_API_KEY loaded:', geminiApiKey ? '********' + geminiApiKey.substring(geminiApiKey.length - 4) : 'NOT SET');

// Crucial check: If API key is not set, log an error and exit the server process immediately.
if (!geminiApiKey) {
    console.error("⛔ ERROR: GEMINI_API_KEY is not set in your .env file. Server cannot start.");
    console.error("Please ensure your .env file is in the server folder and contains GEMINI_API_KEY=YOUR_KEY_HERE");
    process.exit(1);
}

// Initialize Google Generative AI client with your API key
const genAI = new GoogleGenerativeAI(geminiApiKey);

// --- Middleware Setup ---
// Middleware to parse JSON request bodies
app.use(express.json());

// Middleware to serve static files (HTML, CSS, JavaScript, images, CSVs)
// This is critical for your browser to load index.html, script.js, and medications.csv.
// It assumes your directory structure is:
// - AI_Prescription_web/
//   - server/server.js
//   - client/public/index.html
//   - client/public/script.js
//   - client/public/medications.csv
// `path.join(__dirname, '..', 'client', 'public')` constructs the absolute path to `client/public`.
app.use(express.static(path.join(__dirname, '..', 'client', 'public')));

// Route to serve the main HTML file (index.html) when the root URL is accessed.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'public', 'index.html'));
});

// CORS protection for development.
// WARNING: For production, you should replace '*' with your specific frontend domain(s)
// (e.g., 'https://your-frontend-domain.com') to enhance security.
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// --- API Endpoint for AI Suggestions ---
// Handles POST requests to '/api/get-ai-suggestions' to interact with the Gemini API.
app.post('/api/get-ai-suggestions', async (req, res) => {
    const { prompt } = req.body;

    // Validate that a prompt was provided in the request body
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    try {
        // Get the generative model (using gemini-1.5-flash as specified)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Generate content based on the provided prompt
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text(); // Extract the text content from the AI's response

        // Send the AI's text response back to the client
        res.json({ aiText: text });
    } catch (error) {
        // Log the full error for server-side debugging (important for troubleshooting API issues)
        console.error('❌ Error calling Gemini API:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        // Send a user-friendly error message to the client
        res.status(500).json({ error: 'Failed to get AI suggestions. Please check server logs for more details.' });
    }
});

// --- Start the Server ---
// The server starts listening for incoming requests on the specified port.
app.listen(port, () => {
    console.log(`✅ Server listening at http://localhost:${port}`);
    console.log('----------------------------------------------------');
    console.log('IMPORTANT:');
    console.log(`1. Ensure your .env file is in the 'server' folder and has GEMINI_API_KEY set.`);
    console.log(`2. Verify that 'index.html', 'script.js', and 'medications.csv' are inside 'AI_Prescription_web/client/public/'.`);
    console.log('3. Open your browser to http://localhost:3000/');
    console.log('4. Check your browser console (F12) for any frontend errors (e.g., 404 for script.js or medications.csv).');
    console.log('----------------------------------------------------');
});
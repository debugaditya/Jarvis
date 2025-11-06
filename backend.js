const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/ask', async (req, res) => {
    // The 'query' from the app now contains the FULL, dynamic prompt.
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required.' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
        const model = genAI.getGenerativeModel({
            // NOTE: Using a valid, efficient model name. "gemini-2.5-pro" is not a real model name.
            model: "gemini-1.5-flash" 
        });

        const prompt = query;

        const result = await model.generateContent(prompt);
        const response = await result.response;

        let textResponse = response.text();
        
        console.log("LLM Raw Response:", textResponse);
        
        textResponse = textResponse.replace(/^```json\n/, '').replace(/\n```$/, '');

        let jsonResponse;
        try {
            // First, try to parse the response as JSON.
            jsonResponse = JSON.parse(textResponse);
        } catch (e) {
            // If parsing fails, assume it's a plain text conversational reply.
            console.log("JSON parsing failed, wrapping response in a 'reply' object.");
            jsonResponse = { "reply": textResponse };
        }

        res.json(jsonResponse);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full Error Stack:', error.stack);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

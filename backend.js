const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// FIXED SYSTEM PROMPT
const SYSTEM_PROMPT = `You are an expert Android planner. Your sole purpose is to convert a user's request into a single, valid JSON object.

You are **blind** and cannot see the screen. Your plans must be based on your general knowledge of common app workflows.

### **RULES OF ENGAGEMENT**

1. **Analyze the Request:** First, determine if the user's request is a **\"Conversational Query\"**, a **\"Direct Tool\"** task, or a **\"Complex Plan\"** task.
2. **Prioritize Actions:** Only use a \"Conversational Reply\" if no action can be taken.
3. **Use Direct Tools First:** **ALWAYS** prefer a **Direct Tool** if one matches. Only use a Complex Plan if no Direct Tool can accomplish the task.
4. **Strict JSON Output:** Your entire response **MUST** be a single JSON object and nothing else. Do not add any text, explanations, or markdown before or after the JSON.
5. **One Path Only:** The root JSON object must contain *either* an \`\"intents\"\`, a \`\"plan\"\`, or a \`\"reply\"\` key, but **NEVER** more than one.

### **<TOOLBOX_START>**

### **1. Conversational Reply (The \"reply\" String)**
If the user asks a question that does not require an on-device action (e.g., \"what's the weather?\", \"who are you?\", \"tell me a joke\"), return a JSON object with a \`\"reply\"\` key.
* {\"reply\": \"<string>\"}
    * *Description:* A natural language response to the user's query.
    * *Example:* {\"reply\": \"The weather today is sunny with a high of 75 degrees.\"}

### **2. Direct Tools (The \"intents\" List)**
If a request can be fulfilled by one or more direct tools, return a JSON object with an \`\"intents\"\` key, which is a list of intent objects. Even for a single action, it must be in a list.
* **Single Action Example:** \`{\"intents\": [{\"intent\": \"SET_BRIGHTNESS\", \"value\": 0.8}]}\`
* **Multiple Actions Example:** \`{\"intents\": [{\"intent\": \"TOGGLE_BLUETOOTH\", \"state\": true}, {\"intent\": \"SET_VOLUME\", \"value\": 0.75}]}\`

**Available Intents:**
* \`{\"intent\": \"SET_BRIGHTNESS\", \"value\": <float>}\`
* \`{\"intent\": \"SET_VOLUME\", \"value\": <float>}\`
* \`{\"intent\": \"SET_ALARM\", \"time\": \"HH:MM\", \"label\": \"<string>\"}\`
* \`{\"intent\": \"MAKE_CALL\", \"number\": \"<string>\"}\`
* \`{\"intent\": \"SEND_SMS\", \"number\": \"<string>\", \"message\": \"<string>\"}\`
* \`{\"intent\": \"OPEN_CAMERA\"}\`
* \`{\"intent\": \"TOGGLE_FLASHLIGHT\", \"state\": <boolean>}\`
* \`{\"intent\": \"TOGGLE_BLUETOOTH\", \"state\": <boolean>}\`
* \`{\"intent\": \"NAVIGATE_SETTINGS\", \"page\": \"<string>\"}\`
    * *Valid pages:* \"WIFI\", \"LOCATION\", \"DATA\"

### **3. Complex Plan Tools (The \"plan\" Function List)**
If no Direct Tool or Conversational Reply fits, return a JSON object with a \`\"plan\"\` key.
* **Reliability Rule:** To find *any* item, **ALWAYS** use a \"Search\" function first.
* **Icon Rule:** Use \`clickByDesc\` for icons (e.g., \"Search\", \"Send\").
* **Text Rule:** Use \`clickByText\` for visible text (e.g., search results).
**Available Functions:**
* **\`launchApp(app_id: \"...\")\`**
* **\`clickByText(text: \"...\")\`**
* **\`clickByDesc(description: \"...\")\`**
* **\`typeInField(text: \"...\", target_desc: \"...\")\`**
* **\`goBack()\`**
* **\`wait(seconds: <int>)\`**

**<TOOLBOX_END>**

User Request:
{{USER_QUERY}}`;

app.post('/ask', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required.' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const prompt = SYSTEM_PROMPT.replace('{{USER_QUERY}}', query);

        const result = await model.generateContent(prompt);
        const response = await result.response;

        let textResponse = response.text();
        
        // Clean up potential markdown fences
        textResponse = textResponse.replace(/^```json\n/, '').replace(/\n```$/, '');

        const jsonResponse = JSON.parse(textResponse);

        res.json(jsonResponse);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full Error Stack:', error.stack);
        // Also log the problematic text if parsing fails
        if (error instanceof SyntaxError) {
            console.error("Problematic text to parse:", error.text) // Assuming you can get the text
        }
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

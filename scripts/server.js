require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

//setting up allowances
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;
const MODEL_NAME = "openai/gpt-oss-20b";

app.post('/api/chat', async (req, res) => {
    try {
        const {messages} = req.body;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": 'application/json',
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: messages,
            }),
        });

        const data = await response.json();
        //console.log("Api Raw Response", data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`backend running on port ${port}`));
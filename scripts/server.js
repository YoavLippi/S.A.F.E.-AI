require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

//setting up allowances
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;
const MODEL_NAME = "openai/gpt-oss-20b";
const FALLBACK_MODEL_NAME = "openai/gpt-oss-120b";

const LimitType = Object.freeze({
    UNKNOWN: "UNKNOWN",
    DAILY: "DAILY",
    BURST: "BURST"
});

app.post('/api/chat', async (req, res) => {
    try {
        const messages = req.body.messages;
        const useFallback = req.body.useFallback;
        console.log(useFallback);

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": 'application/json',
            },
            body: JSON.stringify({
                model: useFallback ? FALLBACK_MODEL_NAME : MODEL_NAME,
                messages: messages,
            }),
        });

        switch (response.status) {
            case 429:
                const errorData = await response.json();
                const errorMessage = errorData.error ? errorData.error.message : "";
                const retryAfterHeader = response.headers.get('retry-after');

                let limitType = LimitType.UNKNOWN;
                let action = "Wait a moment then try again";

                if (errorMessage.includes("per day")||errorMessage.includes("TPD")||errorMessage.includes("RPD")) {
                    limitType = LimitType.DAILY;
                    action = "Daily tokens exceeded. They will reset at midnight UTC.";
                } else if (errorMessage.includes("per minute")||errorMessage.includes("TPM")||errorMessage.includes("RPM")) {
                    limitType = LimitType.UNKNOWN;
                    action = `Too many requests. Please retry after ${retryAfterHeader ? retryAfterHeader : `a few`} seconds`;
                }
                return res.status(429).json({
                    error:"Too Many Requests",
                    type: limitType,
                    message:errorMessage,
                    retryAfterSeconds: retryAfterHeader ? parseFloat(retryAfterHeader) : null,
                    suggestion: action,
                });
                break;
        }
        const data = await response.json();
        //console.log("Api Raw Response", data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`backend running on port ${port}`));
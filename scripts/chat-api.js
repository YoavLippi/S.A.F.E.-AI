import MarkdownIt from "https://esm.run/markdown-it";
import {getEncoding} from "https://esm.run/js-tiktoken";
//import o200k_base from "js-tiktoken/lite";
//both oss and gpt-4 use the same encoding
const enc = getEncoding('o200k_base');

const LimitType = Object.freeze({
    UNKNOWN: "UNKNOWN",
    DAILY: "DAILY",
    BURST: "BURST"
});


let tokensUsed = 0;
const baseMessages = [
    /*{ role: "system", content: "Respond using Markdown. Never output HTML as a raw output." }*/
];
let messages = [...baseMessages];

const md = new MarkdownIt({
    html:false,
    breaks:true,
    linkify:true,
    typographer:true
});

function countGroqTokens(messages) {
    //context wrapper
    let total_tokens = 71;
    messages.forEach(element => {
        total_tokens +=4;
        for (const [key, value] of Object.entries(element)) {
            // Encode the string to a Uint32Array and get its length
            const tokens = enc.encode(value);
            total_tokens += tokens.length;
        }
    });
    //total_tokens += 2;
    return total_tokens;
}

export function countGroqTokensForMessage(message) {
    //context wrapper
    let total_tokens = 75;
    const tokens = enc.encode(message);
    total_tokens += tokens.length;
    return total_tokens;
}

async function SendMessage() {
    const inputField = document.getElementById("userInput");
    const chatbox = document.getElementById("chatbox");
    const userText = inputField.value.trim();

    if (!userText) return;
    //showing user message
    const userPara = document.createElement("div");
    userPara.classList.add("UserMessage");
    userPara.classList.add("chatMessage");

    const userInputText = document.createElement('p');
    userInputText.textContent = `You: \n${userText}`;
    userPara.appendChild(userInputText);
    chatbox.appendChild(userPara);
    inputField.value = "";
    inputField.dispatchEvent(new Event('input'));

    try {
        const thinkPara = document.createElement('p');
        thinkPara.innerText = 'Thinking...';

        //let thinkText = `Thinking...\n`;
        //loading
        //chatbox.innerHTML += thinkText;
        chatbox.appendChild(thinkPara);

        //disabling relevant input areas
        const sendButton = document.getElementById("sendButton");
        sendButton.disabled = true;
        const clearButton = document.getElementById("clearButton");
        clearButton.disabled = true;

        inputField.disabled = true;
        messages.push({ role: "user", content: userText });

        //message rollover stuff so the tokens per minute aren't overflowed
        //our prompt tokens are everything in the current messages array
        //It's not exact, but it's close enough
        console.log(countGroqTokens(messages));
        const promptTokenLimit = 4000;
        while (countGroqTokens(messages) > promptTokenLimit) {
            messages.shift();
            console.log("Too many prompt tokens, removing earliest message");
            //console.log(...messages);
        }

        console.log("Sending message:");
        console.log({...messages});

        //https://s-a-f-e-ai.onrender.com/api/chat
        //http://localhost:3000/api/chat
        let res = await fetch("https://s-a-f-e-ai.onrender.com/api/chat", {
            method: 'POST',
            headers: {
                "Content-Type": 'application/json',
            },
            body: JSON.stringify({
                messages: messages,
                useFallback: false,
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            switch (res.status) {
                case 429:
                    console.warn(`rate limited by: ${errorData.type}`);
                    //TODO: Change this to an error popup somewhere else
                    chatbox.innerHTML += `<p>Raah rate limited again</p>`;

                    if (errorData.type && errorData.type == LimitType.DAILY) {
                        //fallback now
                        res = await fetch("https://s-a-f-e-ai.onrender.com/api/chat", {
                            method: 'POST',
                            headers: {
                                "Content-Type": 'application/json',
                            },
                            body: JSON.stringify({
                                messages: messages,
                                useFallback: true,
                                max_completion_tokens: 8000-countGroqTokens(messages),
                            }),
                        });
                    }
                    break;
                default:
                    console.error(errorData)
                    chatbox.innerHTML += `<p>Error: ${JSON.stringify(data)}</p>`;
                    messages.pop();
                    break;
            }
        }

        const data = await res.json();

        console.log(data);

        tokensUsed += data.usage.total_tokens;
        console.log(tokensUsed);
        chatbox.removeChild(thinkPara);

        if (data.choices && data.choices[0]) {
            const AIResDiv = document.createElement("div");

            AIResDiv.classList.add("AIMessage");
            AIResDiv.classList.add("chatMessage");

            //adding a summary thing so that we can see the reasoning as well
            const aiReasoning = data.choices[0].message.reasoning;
            //console.log(aiReasoning);
            let reasoningPara = document.createElement("p");
            reasoningPara.innerText = aiReasoning;
            const summaryBox = document.createElement('details');
            const thinkingText = document.createElement('summary');
            thinkingText.innerText = "Show reasoning";
            summaryBox.appendChild(thinkingText);
            summaryBox.appendChild(reasoningPara);

            const aiRes = data.choices[0].message.content;
            const renderedOutput = md.render(aiRes);
            const AIPara = document.createElement('p');
            AIPara.innerHTML = `${data.model}: ${renderedOutput}`;

            AIResDiv.appendChild(summaryBox);
            AIResDiv.appendChild(AIPara);
            chatbox.appendChild(AIResDiv);

            messages.push({ role: "assistant", content: aiRes });

            console.log("Receiving messages...");
            console.log({...messages});
        } else {
            switch (res.status) {
                case 429:
                    //TODO: Change this to an error popup somewhere else
                    chatbox.innerHTML += `<p>Raah rate limited again</p>`;
                    messages.pop();
                    break;
                default:
                    console.error(data)
                    chatbox.innerHTML += `<p>Error: ${JSON.stringify(data)}</p>`;
                    messages.pop();
                    break;
            }
        }
    } catch (error) {
        chatbox.innerHTML += `<p>Network Error: ${error.message}</p>`;
    }

    chatbox.scrollTop = chatbox.scrollHeight;
    sendButton.disabled = false;
    inputField.disabled = false;
    clearButton.disabled = false;

    //console.log(messages);
}

function ClearChat() {
    const chatbox = document.getElementById("chatbox");
    chatbox.innerHTML = "";
    messages = [...baseMessages];
    console.log("clearing messages...");
    console.log({...messages});
}

function SaveChat() {
    const chatbox = document.getElementById("chatbox");
    const chatContent = chatbox.innerText;
    let now = new Date();
    let fileDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    SaveToTxt(chatContent, `chat_${fileDate}_${now.toLocaleTimeString()}`);
}

function SaveToTxt(text, filename) {
    const newFile = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(newFile);
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", ()=>DoDomSetup());
} else {
    DoDomSetup();
}

let heldKeys = [];
function DoDomSetup() {
    const sendButton = document.getElementById("sendButton");
    sendButton.addEventListener("click", () => SendMessage());

    const userInput = document.getElementById('userInput');
    userInput.addEventListener("keydown", (event) => {
        if (!heldKeys.includes(event.key)) {
            heldKeys.push(event.key);
            //console.log(heldKeys);
        }
        if (event.key == 'Enter') {
            if (!heldKeys.includes('Shift')) {
                SendMessage();
                userInput.blur();
            }
        }
    });
    userInput.addEventListener("keyup", (event) => {
        heldKeys = heldKeys.filter(e => e !== event.key);
    });
    userInput.addEventListener("focusout", () => {
        heldKeys = [];
    });

    const clearButton = document.getElementById("clearButton");
    clearButton.addEventListener("click", () => ClearChat());

    const saveButton = document.getElementById("saveButton");
    saveButton.addEventListener("click", () => SaveChat());
}
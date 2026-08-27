import MarkdownIt from "https://esm.run/markdown-it";

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

async function SendMessage() {
    const inputField = document.getElementById("userInput");
    const chatbox = document.getElementById("chatbox");
    const userText = inputField.value.trim();

    if (!userText) return;
    //showing user message
    const userPara = document.createElement("p");
    userPara.classList.add("UserMessage");
    userPara.classList.add("chatMessage");
    userPara.textContent = `You: \n${userText}`;
    chatbox.appendChild(userPara);
    inputField.value = "";

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
            const aiRes = data.choices[0].message.content;
            const resPara = document.createElement("p");
            resPara.classList.add("AIMessage");
            resPara.classList.add("chatMessage");

            const renderedOutput = md.render(aiRes);
            resPara.innerHTML = `${data.model}: ${renderedOutput}`;
            chatbox.appendChild(resPara);
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
    SaveToTxt(chatContent, "chat");
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
                userInput.style.height = 'auto';
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
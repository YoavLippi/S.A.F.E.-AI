const MODEL_NAME = "openai/gpt-oss-20b";

let messages = [
    { role: "system", content: "When necessary, respond using HTML only. Do not use Markdown. Use <p>, <ul>, <li>, <strong>, etc." }
];

async function SendMessage() {
    const inputField = document.getElementById("userInput");
    const chatbox = document.getElementById("chatbox");
    const userText = inputField.value.trim();

    if (!userText) return;
    //showing user message
    const userPara = document.createElement("p");
    userPara.textContent = `You: ${userText}`;
    chatbox.appendChild(userPara);
    inputField.value = "";

    try {
        let thinkText = `Thinking...\n`;
        //loading
        chatbox.innerHTML += thinkText;

        messages.push({ role: "user", content: userText });

        const res = await fetch("http://localhost:3000/api/chat", {
            method: 'POST',
            headers: {
                "Content-Type": 'application/json',
            },
            body: JSON.stringify({
                messages: messages
            }),
        });

        const data = await res.json();
        console.log(data);
        chatbox.innerHTML = chatbox.innerHTML.replace(thinkText, '');

        if (data.choices && data.choices[0]) {
            const aiRes = data.choices[0].message.content;
            const resPara = document.createElement("p");
            resPara.innerHTML = `${MODEL_NAME}: ${aiRes}`;
            chatbox.appendChild(resPara);
            messages.push({ role: "assistant", content: aiRes });
        } else {
            switch (data.error.code) {
                case 429:
                    console.error(data);
                    chatbox.innerHTML += `<p>Raah rate limited again</p>`;
                    break;
                default:
                    chatbox.innerHTML += `<p>Error: ${JSON.stringify(data)}</p>`;
                    break;
            }
            messages.pop();
        }
    } catch (error) {
        chatbox.innerHTML += `<p>Network Error: ${error.message}</p>`;
    }


    //console.log(messages);
}

function ClearChat() {
    const chatbox = document.getElementById("chatbox");
    chatbox.innerHTML = "";
    messages = [
        { role: "system", content: "Respond using HTML only. Do not use Markdown. Use <p>, <ul>, <li>, <strong>, etc." }
    ];
}

function SaveChat() {
    const chatbox = document.getElementById("chatbox");
    const chatContent = chatbox.innerText;
    SaveToTxt(chatContent,"chat");
}

function SaveToTxt(text, filename) {
    const newFile = new Blob([text], {type:'text/plain'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(newFile);
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", DoDomSetup());
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
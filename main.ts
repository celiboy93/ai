import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// API KEY (မိတ်ဆွေပေးထားတဲ့ Key)
const API_KEY = "AIzaSyClhO1S_DyCvZMzfDj2R28ivYx8vVhiZYc"; 

const SYSTEM_INSTRUCTION = `
You are a helpful AI assistant for Myanmar 2D/3D.
Instructions:
1. If asked about dreams, interpret into 2D lucky numbers.
2. Reply naturally in Myanmar Language.
`;

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/chat") {
    try {
      const { message } = await req.json();
      
      // ပြင်ဆင်ချက်: 'gemini-1.0-pro' ကို သုံးပါမယ် (ဒါက Free Key တိုင်းအတွက် အလုပ်လုပ်ပါတယ်)
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ text: SYSTEM_INSTRUCTION + "\nUser: " + message }] 
          }]
        })
      });

      const data = await response.json();
      
      // Error စစ်ဆေးခြင်း
      if (data.error) {
          // Error တက်ရင် အကြောင်းရင်းအတိအကျကို ပြန်ပြပါမယ်
          return new Response(JSON.stringify({ reply: "ERROR CODE: " + data.error.message }), { headers: { "Content-Type": "application/json" } });
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
      
      return new Response(JSON.stringify({ reply }), { headers: { "Content-Type": "application/json" } });

    } catch (e) {
      return new Response(JSON.stringify({ reply: "NETWORK ERROR." }), { headers: { "Content-Type": "application/json" } });
    }
  }

  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>AI Test</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { background: #0f172a; color: white; font-family: sans-serif; }
        .chat-container { height: calc(100vh - 80px); overflow-y: auto; padding: 20px; }
        .msg { max-width: 80%; margin-bottom: 15px; padding: 10px 15px; border-radius: 15px; }
        .user { background: #eab308; color: black; align-self: flex-end; margin-left: auto; }
        .ai { background: #1e293b; color: #e2e8f0; align-self: flex-start; border: 1px solid #334155; }
        .error { background: #7f1d1d; border: 1px solid red; }
      </style>
    </head>
    <body class="flex flex-col h-screen">
      <div class="bg-slate-900 p-4 text-center shadow"><h1 class="font-bold">AI Test (v1.0)</h1></div>
      <div id="chatBox" class="chat-container flex flex-col"></div>
      <div class="p-4 bg-slate-900 flex gap-2">
        <input id="msgInput" type="text" class="flex-1 bg-slate-800 text-white rounded p-3" placeholder="Type here...">
        <button onclick="sendMsg()" class="bg-yellow-500 text-black p-3 rounded font-bold">SEND</button>
      </div>
      <script>
        const chatBox = document.getElementById('chatBox');
        const input = document.getElementById('msgInput');
        
        async function sendMsg() {
            const text = input.value.trim();
            if(!text) return;
            addBubble(text, 'user');
            input.value = '';
            try {
                const res = await fetch('/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message: text })
                });
                const data = await res.json();
                let type = data.reply.includes('ERROR') ? 'error' : 'ai';
                addBubble(data.reply, type);
            } catch(e) { addBubble(e.message, 'error'); }
        }
        function addBubble(t, type) {
            const d = document.createElement('div');
            d.className = 'msg ' + type;
            d.innerHTML = t;
            chatBox.appendChild(d);
        }
      </script>
    </body></html>
  `, { headers: { "content-type": "text/html; charset=utf-8" } });
});

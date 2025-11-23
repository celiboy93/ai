import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// မိတ်ဆွေရဲ့ Key (မှန်ပါတယ်)
const API_KEY = "AIzaSyCfSGsAM-ypMKhmSZ0q8Kkex-Ye3jXY3kI"; 

const SYSTEM_INSTRUCTION = `
You are a helpful AI assistant for Myanmar 2D/3D enthusiasts.
Instructions:
1. If the user asks about a dream (အိပ်မက်), interpret it into 2D lucky numbers.
2. If the user talks casually (Greeting, General Knowledge), reply like a normal friendly human.
3. Always reply in Myanmar Language (Burmese).
`;

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/chat") {
    try {
      const { message } = await req.json();
      
      // FIX: Changed model to 'gemini-pro' (More stable for new keys)
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { 
              parts: [{ text: SYSTEM_INSTRUCTION + "\nUser said: " + message }] 
            }
          ]
        })
      });

      const data = await response.json();
      
      // Error Handling Detail
      if (data.error) {
          console.log(data.error); // For debugging in logs
          return new Response(JSON.stringify({ reply: "Error: " + data.error.message }), { headers: { "Content-Type": "application/json" } });
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "ပြန်ဖြေဖို့ အဆင်မပြေသေးပါဘူးခင်ဗျာ။";
      
      return new Response(JSON.stringify({ reply }), { headers: { "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ reply: "Connection Error." }), { headers: { "Content-Type": "application/json" } });
    }
  }

  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>AI 2D ဆရာ</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        body { background: #0f172a; color: white; font-family: sans-serif; }
        .chat-container { height: calc(100vh - 80px); overflow-y: auto; padding: 20px; scroll-behavior: smooth; }
        .msg { max-width: 85%; margin-bottom: 15px; padding: 12px 16px; border-radius: 20px; font-size: 14px; line-height: 1.6; }
        .user { background: #eab308; color: black; align-self: flex-end; margin-left: auto; border-bottom-right-radius: 4px; }
        .ai { background: #1e293b; color: #e2e8f0; align-self: flex-start; margin-right: auto; border-bottom-left-radius: 4px; border: 1px solid #334155; }
        .typing { font-size: 12px; color: #94a3b8; margin-left: 20px; display: none; }
      </style>
    </head>
    <body class="flex flex-col h-screen">
      <div class="bg-slate-900 p-4 flex items-center gap-3 shadow-lg border-b border-slate-800 z-10">
        <div class="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold"><i class="fas fa-robot"></i></div>
        <div><h1 class="font-bold text-lg text-white">AI 2D ဆရာ</h1><div class="text-[10px] text-green-400">● Online</div></div>
      </div>

      <div id="chatBox" class="chat-container flex flex-col">
        <div class="msg ai">မင်္ဂလာပါခင်ဗျာ။ အိပ်မက်မေးမလား၊ စကားပြောမလား ရပါတယ်ဗျ။</div>
      </div>
      <div id="typing" class="typing">AI is thinking...</div>

      <div class="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center">
        <input id="msgInput" type="text" placeholder="စာရိုက်ပါ..." class="flex-1 bg-slate-800 text-white rounded-full px-5 py-3 focus:outline-none border border-slate-700">
        <button onclick="sendMsg()" class="bg-yellow-500 text-black w-12 h-12 rounded-full flex items-center justify-center shadow-lg"><i class="fas fa-paper-plane"></i></button>
      </div>

      <script>
        const chatBox = document.getElementById('chatBox');
        const input = document.getElementById('msgInput');
        const typing = document.getElementById('typing');
        
        input.addEventListener("keypress", function(e) { if(e.key === "Enter") sendMsg(); });

        async function sendMsg() {
            const text = input.value.trim();
            if(!text) return;
            
            addBubble(text, 'user');
            input.value = '';
            typing.style.display = 'block';
            chatBox.scrollTop = chatBox.scrollHeight;

            try {
                const res = await fetch('/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message: text })
                });
                const data = await res.json();
                typing.style.display = 'none';
                
                let cleanReply = data.reply.replace(/\\*\\*(.*?)\\*\\*/g, '<b>$1</b>').replace(/\\n/g, '<br>');
                addBubble(cleanReply, 'ai');
            } catch(e) {
                typing.style.display = 'none';
                addBubble("Error: " + e.message, 'ai');
            }
        }

        function addBubble(text, type) {
            const div = document.createElement('div');
            div.className = 'msg ' + type;
            div.innerHTML = text;
            chatBox.appendChild(div);
            chatBox.scrollTop = chatBox.scrollHeight;
        }
      </script>
    </body></html>
  `, { headers: { "content-type": "text/html; charset=utf-8" } });
});

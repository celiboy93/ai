import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// မိတ်ဆွေရဲ့ API KEY ကို ထည့်သွင်းထားပါတယ်
const API_KEY = "AIzaSyCfSGsAM-ypMKhmSZ0q8Kkex-Ye3jXY3kI"; 

const SYSTEM_INSTRUCTION = `
You are a helpful AI assistant for Myanmar 2D/3D enthusiasts.
Instructions:
1. If the user asks about a dream (အိပ်မက်), interpret it into 2D lucky numbers (e.g., Snake -> 79, 33).
2. If the user talks casually (Greeting, General Knowledge, Coding), reply like a normal friendly human.
3. Always reply in Myanmar Language (Burmese).
4. Be polite and concise.
`;

serve(async (req) => {
  const url = new URL(req.url);

  // Chat API Endpoint
  if (req.method === "POST" && url.pathname === "/chat") {
    try {
      const { message } = await req.json();
      
      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { 
              role: "user", 
              parts: [{ text: SYSTEM_INSTRUCTION + "\nUser said: " + message }] 
            }
          ]
        })
      });

      const data = await response.json();
      
      // Check for errors
      if (data.error) {
          console.error(data.error);
          return new Response(JSON.stringify({ reply: "ခဏလောက်စောင့်ပြီးမှ ပြန်မေးပါဗျ (Server Busy)." }), { headers: { "Content-Type": "application/json" } });
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "ပြန်ဖြေဖို့ အဆင်မပြေသေးပါဘူးခင်ဗျာ။";
      
      return new Response(JSON.stringify({ reply }), { headers: { "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ reply: "အင်တာနက်လိုင်း အနည်းငယ် ချို့ယွင်းနေပါတယ်ခင်ဗျ။" }), { headers: { "Content-Type": "application/json" } });
    }
  }

  // UI Rendering
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
        .msg { max-width: 85%; margin-bottom: 15px; padding: 12px 16px; border-radius: 20px; font-size: 14px; line-height: 1.6; word-wrap: break-word; }
        .user { background: #eab308; color: black; align-self: flex-end; margin-left: auto; border-bottom-right-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .ai { background: #1e293b; color: #e2e8f0; align-self: flex-start; margin-right: auto; border-bottom-left-radius: 4px; border: 1px solid #334155; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .typing { font-size: 12px; color: #94a3b8; margin-left: 20px; margin-bottom: 10px; display: none; animation: blink 1.5s infinite; }
        @keyframes blink { 50% { opacity: 0.5; } }
        
        /* Hide Scrollbar */
        .chat-container::-webkit-scrollbar { width: 5px; }
        .chat-container::-webkit-scrollbar-thumb { background: #334155; border-radius: 5px; }
      </style>
    </head>
    <body class="flex flex-col h-screen">
      
      <div class="bg-slate-900 p-4 flex items-center gap-3 shadow-lg border-b border-slate-800 z-10">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold shadow-lg">
            <i class="fas fa-robot text-xl"></i>
        </div>
        <div>
          <h1 class="font-bold text-lg text-white tracking-wide">AI 2D ဆရာ</h1>
          <div class="flex items-center gap-1 text-[10px] text-green-400 font-bold">
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online
          </div>
        </div>
      </div>

      <div id="chatBox" class="chat-container flex flex-col">
        <div class="msg ai">
            မင်္ဂလာပါခင်ဗျာ။ 🙏<br><br>
            ကျွန်တော်က <b>2D/3D AI Assistant</b> ပါ။<br>
            - အိပ်မက်မေးမလား 🌙<br>
            - ဂဏန်းအကြံဉာဏ်တောင်းမလား 🎰<br>
            - ပုံမှန်စကားပြောမလား 💬<br>
            ကြိုက်တာမေးလို့ရပါတယ်ဗျ။
        </div>
      </div>
      <div id="typing" class="typing"><i class="fas fa-circle-notch fa-spin mr-1"></i> AI is thinking...</div>

      <div class="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center">
        <input id="msgInput" type="text" placeholder="စာရိုက်ထည့်ပါ..." class="flex-1 bg-slate-800 text-white rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 border border-slate-700 placeholder-slate-500 transition-all">
        <button onclick="sendMsg()" class="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
            <i class="fas fa-paper-plane text-lg"></i>
        </button>
      </div>

      <script>
        const chatBox = document.getElementById('chatBox');
        const input = document.getElementById('msgInput');
        const typing = document.getElementById('typing');
        
        input.addEventListener("keypress", function(e) { if(e.key === "Enter") sendMsg(); });

        async function sendMsg() {
            const text = input.value.trim();
            if(!text) return;
            
            // Add User Message
            addBubble(text, 'user');
            input.value = '';
            input.focus();
            
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
                
                // Clean up formatting
                let cleanReply = data.reply
                    .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>') // Bold
                    .replace(/\\n/g, '<br>'); // New lines
                
                addBubble(cleanReply, 'ai');
            } catch(e) {
                typing.style.display = 'none';
                addBubble("Sorry, connection error.", 'ai');
            }
        }

        function addBubble(text, type) {
            const div = document.createElement('div');
            div.className = 'msg ' + type + ' animate-[fadeIn_0.3s_ease-out]';
            div.innerHTML = text;
            chatBox.appendChild(div);
            chatBox.scrollTop = chatBox.scrollHeight;
        }
      </script>
    </body>
    </html>
  `, { headers: { "content-type": "text/html; charset=utf-8" } });
});

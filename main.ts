import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// မိတ်ဆွေရဲ့ Key
const API_KEY = "AIzaSyClhO1S_DyCvZMzfDj2R28ivYx8vVhiZYc"; 
const MODEL_NAME = "gemini-2.0-flash";

const SYSTEM_INSTRUCTION = `
You are a professional Myanmar 2D/3D Analyst (AI 2D ဆရာ).
I will provide you with today's REAL-TIME 2D market data.
Instructions:
1. Use the provided 'Market Data' to analyze user questions.
2. If Morning result is present, use it to predict Evening numbers using 2D formulas (Power, Nat Khat, etc.).
3. If user asks "What happened this morning?", answer using the provided data.
4. Always reply in Myanmar Language (Burmese) with a helpful and mystic tone.
`;

// Live Data သွားဆွဲမည့် Function
async function getLiveContext() {
    try {
        const res = await fetch("https://api.thaistock2d.com/live");
        const data = await res.json();
        
        let info = `Date: ${data.live?.date || 'Today'}\n`;
        
        // မနက်ပိုင်း (12:01)
        if (data.result && data.result[1]) {
            info += `Morning (12:01) Result: ${data.result[1].twod || 'Waiting'}\n`;
        }
        // ညနေပိုင်း (04:30)
        if (data.result && (data.result[3] || data.result[2])) {
            const ev = data.result[3] || data.result[2];
            info += `Evening (04:30) Result: ${ev.twod || 'Waiting'}\n`;
        }
        // Live Value
        if (data.live) {
            info += `Current Live Value: ${data.live.value || '-'} (2D: ${data.live.twod || '-'})`;
        }
        return info;
    } catch (e) {
        return "Market Data: Currently Unavailable (Connection Error)";
    }
}

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/chat") {
    try {
      const { message } = await req.json();
      
      // ၁။ Live Data အရင်သွားယူမယ်
      const marketData = await getLiveContext();
      
      // ၂။ AI ဆီပို့မည့် စာကို ပြင်ဆင်မယ် (Data + User Message)
      const fullPrompt = `
      ${SYSTEM_INSTRUCTION}
      
      [REAL-TIME MARKET DATA]
      ${marketData}
      
      [USER MESSAGE]
      ${message}
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
        })
      });

      const data = await response.json();
      
      if (data.error) {
          return new Response(JSON.stringify({ reply: "Error: " + data.error.message }), { headers: { "Content-Type": "application/json" } });
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "ပြန်ဖြေဖို့ အဆင်မပြေပါခင်ဗျာ။";
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
      <title>AI 2D ဆရာ (Live)</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        body { background: #0f172a; color: white; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .chat-container { height: calc(100vh - 130px); overflow-y: auto; padding: 20px; scroll-behavior: smooth; }
        .msg { max-width: 85%; margin-bottom: 15px; padding: 12px 16px; border-radius: 18px; font-size: 14px; line-height: 1.6; }
        .user { background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); color: black; align-self: flex-end; margin-left: auto; border-bottom-right-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .ai { background: #1e293b; color: #e2e8f0; align-self: flex-start; margin-right: auto; border-bottom-left-radius: 4px; border: 1px solid #334155; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .typing { font-size: 12px; color: #94a3b8; margin-left: 20px; display: none; }
        .live-badge { background: #22c55e; color: black; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; display: flex; align-items: center; gap: 4px; }
      </style>
    </head>
    <body class="flex flex-col h-screen">
      
      <div class="bg-slate-900 p-4 shadow-xl border-b border-slate-800 z-10">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold shadow-lg border border-white/20">
                    <i class="fas fa-brain text-xl"></i>
                </div>
                <div>
                    <h1 class="font-bold text-lg text-white tracking-wide">AI 2D ဆရာ</h1>
                    <div class="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>Gemini 2.0</span>
                        <span class="w-1 h-1 bg-gray-500 rounded-full"></span>
                        <span class="text-green-400 font-bold">Online</span>
                    </div>
                </div>
            </div>
            <div class="live-badge animate-pulse">
                <i class="fas fa-satellite-dish"></i> LIVE DATA
            </div>
        </div>
      </div>

      <div id="chatBox" class="chat-container flex flex-col">
        <div class="msg ai">
            မင်္ဂလာပါဗျာ။ 🙏<br>
            ကျွန်တော်က <b>Live Data</b> နဲ့ ချိတ်ဆက်ထားတဲ့ AI 2D ဆရာပါ။<br><br>
            - "ဒီနေ့မနက် ဘာထွက်လဲ" လို့ မေးကြည့်ပါ (ကျွန်တော် ကြည့်ဖြေပေးပါမယ်)။<br>
            - "မနက်က ဂဏန်းနဲ့တွက်ရင် ညနေဘာကောင်းလဲ" မေးကြည့်ပါဗျ။
        </div>
      </div>
      <div id="typing" class="typing"><i class="fas fa-circle-notch fa-spin text-yellow-500 mr-1"></i> သုံးသပ်နေသည်...</div>

      <div class="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center pb-6">
        <input id="msgInput" type="text" placeholder="မေးခွန်းမေးပါ..." class="flex-1 bg-slate-800 text-white rounded-full px-5 py-3 focus:outline-none focus:ring-1 focus:ring-yellow-500 border border-slate-700 transition-all">
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
                
                // Format Markdown
                let cleanReply = data.reply
                    .replace(/\\*\\*(.*?)\\*\\*/g, '<b>$1</b>')
                    .replace(/\\n/g, '<br>');
                
                addBubble(cleanReply, 'ai');
            } catch(e) {
                typing.style.display = 'none';
                addBubble("Error: " + e.message, 'ai');
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
    </body></html>
  `, { headers: { "content-type": "text/html; charset=utf-8" } });
});

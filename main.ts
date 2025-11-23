import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// မိတ်ဆွေရဲ့ API KEY (အသစ်)
const API_KEY = "AIzaSyClhO1S_DyCvZMzfDj2R28ivYx8vVhiZYc"; 

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/chat") {
    try {
      const { message } = await req.json();
      
      // အရိုးရှင်းဆုံး Payload ပုံစံ (Error နည်းအောင်)
      const prompt = `
      You are a helpful AI assistant for Myanmar 2D/3D. 
      Reply in Myanmar Language.
      
      User: ${message}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      
      // အကယ်၍ Google က Error ပြန်ပို့ရင် အဲ့ဒီ Error အတိုင်း ပြခိုင်းမယ် (Debug လုပ်ရန်)
      if (data.error) {
          return new Response(JSON.stringify({ reply: "GOOGLE ERROR: " + data.error.message }), { headers: { "Content-Type": "application/json" } });
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response text found.";
      
      return new Response(JSON.stringify({ reply }), { headers: { "Content-Type": "application/json" } });

    } catch (e) {
      return new Response(JSON.stringify({ reply: "NETWORK ERROR: " + e.message }), { headers: { "Content-Type": "application/json" } });
    }
  }

  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>AI Debugger</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        body { background: #0f172a; color: white; font-family: sans-serif; }
        .chat-container { height: calc(100vh - 80px); overflow-y: auto; padding: 20px; }
        .msg { max-width: 85%; margin-bottom: 15px; padding: 12px 16px; border-radius: 20px; font-size: 14px; line-height: 1.6; word-wrap: break-word; }
        .user { background: #eab308; color: black; align-self: flex-end; margin-left: auto; }
        .ai { background: #1e293b; color: #e2e8f0; align-self: flex-start; margin-right: auto; border: 1px solid #334155; }
        .error { background: #7f1d1d; color: #fecaca; border: 1px solid #ef4444; }
      </style>
    </head>
    <body class="flex flex-col h-screen">
      <div class="bg-slate-900 p-4 shadow-lg border-b border-slate-800 z-10 text-center">
        <h1 class="font-bold text-lg text-white">AI System Check</h1>
      </div>

      <div id="chatBox" class="chat-container flex flex-col">
        <div class="msg ai">စမ်းသပ်ရန် "hello" ဟု ရိုက်ထည့်ပါ။ Error တက်ရင် အင်္ဂလိပ်စာသား ပေါ်လာပါလိမ့်မယ်။</div>
      </div>

      <div class="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center">
        <input id="msgInput" type="text" placeholder="Type hello..." class="flex-1 bg-slate-800 text-white rounded-full px-5 py-3 focus:outline-none border border-slate-700">
        <button onclick="sendMsg()" class="bg-yellow-500 text-black w-12 h-12 rounded-full flex items-center justify-center shadow-lg"><i class="fas fa-paper-plane"></i></button>
      </div>

      <script>
        const chatBox = document.getElementById('chatBox');
        const input = document.getElementById('msgInput');
        
        input.addEventListener("keypress", function(e) { if(e.key === "Enter") sendMsg(); });

        async function sendMsg() {
            const text = input.value.trim();
            if(!text) return;
            
            addBubble(text, 'user');
            input.value = '';
            chatBox.scrollTop = chatBox.scrollHeight;

            try {
                const res = await fetch('/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message: text })
                });
                const data = await res.json();
                
                let type = 'ai';
                if(data.reply.includes('ERROR')) type = 'error';
                
                let cleanReply = data.reply.replace(/\\*\\*(.*?)\\*\\*/g, '<b>$1</b>').replace(/\\n/g, '<br>');
                addBubble(cleanReply, type);
            } catch(e) {
                addBubble("FATAL ERROR: " + e.message, 'error');
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

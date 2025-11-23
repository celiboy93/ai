import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const kv = await Deno.openKv();

// API KEY
const API_KEY = "AIzaSyClhO1S_DyCvZMzfDj2R28ivYx8vVhiZYc"; 

// --- AI ညွှန်ကြားချက် ---
const SYSTEM_INSTRUCTION = `
You are "Soe Kyaw Win AI", a smart assistant.

**YOUR PREDICTION LOGIC (Based on provided data):**
1. **FORMULA 1 (5/10 Diff):**
   - If data says "PREDICTION_FOR_EVENING", tell the user these numbers are for **Tonight**.
   - If data says "PREDICTION_FOR_TOMORROW", tell the user these numbers are for **Tomorrow Morning**.
2. **FORMULA 2 (Set/Value):**
   - This is ONLY available after Morning result. It is ALWAYS for **Tonight**.

**RULES:**
- Explain clearly which numbers are for Evening and which are for Tomorrow.
- Use a friendly, casual tone ("ကွ", "ဟ", "ရောင်").
- Correct Myanmar spelling.
`;

const MODELS = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.0-pro"];

// --- တွက်နည်း (၁) - ၅ ပြည့် ၁၀ ပြည့် (Logic ပြင်ဆင်ထားသည်) ---
function calculateFormula5_10(twod: string) {
    try {
        const digits = twod.split('').map(Number); // e.g., "13" -> [1, 3]
        let incremented = [];
        let originalSums = [];

        for (let n of digits) {
            // 5 ဖြစ်ဖို့လိုတာ (ဥပမာ: 1 ဆို 4 လိုတယ်, 3 ဆို 2 လိုတယ်)
            let diff5 = (5 - (n % 5));
            
            // 10 ဖြစ်ဖို့လိုတာ (ဥပမာ: 1 ဆို 9 လိုတယ်, 3 ဆို 7 လိုတယ်)
            let diff10 = (10 - (n % 10));
            if (diff10 === 10) diff10 = 0; // 0 အတွက်

            // ၁ တိုးမည်
            let inc5 = (diff5 + 1) % 10;
            let inc10 = (diff10 + 1) % 10;

            originalSums.push(diff5);
            originalSums.push(diff10);
            incremented.push(inc5);
            incremented.push(inc10);
        }

        // ၃ လုံးပြည့်အောင် စစ်ဆေးခြင်း
        let finalSet = new Set(incremented);
        if (finalSet.size < 3) {
            for (let num of originalSums) {
                finalSet.add(num);
                if (finalSet.size >= 3) break; // ၃ လုံးပြည့်ရင် ရပ်မယ်
            }
        }
        return Array.from(finalSet).join(", ");
    } catch (e) { return null; }
}

// --- တွက်နည်း (၂) - Set/Value (Logic ပြင်ဆင်ထားပြီး) ---
function calculateFormulaSetVal(setStr: string, valStr: string) {
    try {
        const s = setStr.replace(/,/g, ""); 
        const v = valStr.replace(/,/g, ""); 
        const sDigits = s.split('.')[0].slice(-3).split('').map(Number); 
        const vDigits = v.split('.')[0].slice(-3).split('').map(Number);
        let incremented = [];
        let originalSums = [];

        for (let i = 0; i < sDigits.length; i++) {
            let sum = (sDigits[i] + (vDigits[i] || 0)) % 10;
            let inc = (sum + 1) % 10;
            originalSums.push(sum);
            incremented.push(inc);
        }
        
        let finalSet = new Set(incremented);
        if (finalSet.size < 3) {
            for (let num of originalSums) {
                finalSet.add(num);
                if (finalSet.size >= 3) break;
            }
        }
        return Array.from(finalSet).join(", ");
    } catch (e) { return null; }
}

// Data စုစည်းပေးမည့် Function
async function getFullContext() {
    let context = "";
    try {
        const res = await fetch("https://api.thaistock2d.com/live");
        const data = await res.json();
        
        context += `[REAL-TIME DATA]\n`;
        context += `Date: ${data.live?.date || 'Unknown'}\n`;

        let morningNum = null;
        let eveningNum = null;

        if (data.result && data.result[1]) morningNum = data.result[1].twod;
        if (data.result && (data.result[3] || data.result[2])) {
            const ev = data.result[3] || data.result[2];
            eveningNum = ev.twod;
        }

        // --- LOGIC FLOW ---
        
        // ၁။ ညနေဂဏန်း ထွက်ပြီး (မနက်ဖြန်မနက်အတွက် တွက်မယ်)
        if (eveningNum) {
            context += `Status: Evening Result is OUT (${eveningNum}).\n`;
            const f1 = calculateFormula5_10(eveningNum);
            context += `PREDICTION_FOR_TOMORROW (Formula 1): [${f1}]\n`;
            context += `Note: Formula 2 is not applicable for tomorrow yet.\n`;
        } 
        // ၂။ မနက်ဂဏန်း ထွက်ပြီး (ဒီညနေအတွက် တွက်မယ်)
        else if (morningNum) {
            context += `Status: Morning Result is OUT (${morningNum}). Waiting for Evening.\n`;
            
            // Formula 1 (Morning -> Evening)
            const f1 = calculateFormula5_10(morningNum);
            context += `PREDICTION_FOR_EVENING (Formula 1 - 5/10 Diff): [${f1}]\n`;

            // Formula 2 (Set/Value -> Evening)
            if (data.result[1].set && data.result[1].value) {
                const f2 = calculateFormulaSetVal(data.result[1].set, data.result[1].value);
                context += `PREDICTION_FOR_EVENING (Formula 2 - Set/Val): [${f2}]\n`;
            }
        } 
        // ၃။ ဘာမှမထွက်သေး
        else {
            context += `Status: Market Not Open or No Results Yet.\n`;
        }

    } catch (e) { context += "Live Data: Unavailable\n"; }
    return context;
}

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/chat") {
    try {
      const { message } = await req.json();
      const fullData = await getFullContext();
      
      const fullPrompt = `
      ${SYSTEM_INSTRUCTION}
      
      ${fullData}
      
      [USER QUESTION]
      ${message}
      `;
      
      let reply = "စက်ပိုင်းဆိုင်ရာ အခက်အခဲရှိနေပါသည် ခင်ဗျာ။";
      let success = false;

      for (const model of MODELS) {
        if(success) break;
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: fullPrompt }] }] })
          });
          const data = await response.json();
          if (!data.error && data.candidates) {
             reply = data.candidates[0].content.parts[0].text;
             success = true;
          }
        } catch (err) {}
      }
      return new Response(JSON.stringify({ reply }), { headers: { "Content-Type": "application/json" } });
    } catch (e) { return new Response(JSON.stringify({ reply: "Connection Error." }), { headers: { "Content-Type": "application/json" } }); }
  }

  // UI
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Soe Kyaw Win AI</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        body { background: #0f172a; color: white; font-family: sans-serif; }
        .chat-container { height: calc(100vh - 130px); overflow-y: auto; padding: 20px; scroll-behavior: smooth; }
        .msg { max-width: 85%; margin-bottom: 15px; padding: 12px 16px; border-radius: 18px; font-size: 14px; line-height: 1.6; }
        .user { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; align-self: flex-end; margin-left: auto; border-bottom-right-radius: 4px; }
        .ai { background: #1e293b; color: #e2e8f0; align-self: flex-start; margin-right: auto; border-bottom-left-radius: 4px; border: 1px solid #334155; }
        .typing { font-size: 12px; color: #94a3b8; margin-left: 20px; display: none; }
      </style>
    </head>
    <body class="flex flex-col h-screen">
      
      <div class="bg-slate-900 p-4 shadow-xl border-b border-slate-800 z-10 flex justify-between items-center">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                <i class="fas fa-robot text-xl"></i>
            </div>
            <div>
                <h1 class="font-bold text-lg text-white">Soe Kyaw Win AI</h1>
                <div class="flex items-center gap-1 text-[10px] text-green-400 font-bold">
                    <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online
                </div>
            </div>
        </div>
        <button onclick="clearChat()" class="text-gray-400 hover:text-red-500 p-2"><i class="fas fa-trash-alt"></i></button>
      </div>

      <div id="chatBox" class="chat-container flex flex-col"></div>
      <div id="typing" class="typing"><i class="fas fa-circle-notch fa-spin text-blue-500 mr-1"></i> ဖြေကြားနေသည်...</div>

      <div class="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center pb-6">
        <input id="msgInput" type="text" placeholder="သိလိုရာ မေးမြန်းပါ..." class="flex-1 bg-slate-800 text-white rounded-full px-5 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-700">
        <button onclick="sendMsg()" class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg"><i class="fas fa-paper-plane text-lg"></i></button>
      </div>

      <script>
        const chatBox = document.getElementById('chatBox');
        const input = document.getElementById('msgInput');
        const typing = document.getElementById('typing');
        
        let chatHistory = JSON.parse(localStorage.getItem('skw_ai_chat_v4')) || [];
        if (chatHistory.length === 0) {
            addBubble("မင်္ဂလာပါ ဘာကူညီရမလဲဗျ။", 'ai', false);
        } else {
            chatHistory.forEach(c => addBubble(c.text, c.type, false));
        }

        input.addEventListener("keypress", function(e) { if(e.key === "Enter") sendMsg(); });

        function saveChat(text, type) {
            chatHistory.push({ text, type });
            localStorage.setItem('skw_ai_chat_v4', JSON.stringify(chatHistory));
        }

        function clearChat() {
            if(confirm('ပြောထားတာတွေ ဖျက်မှာလား?')) {
                localStorage.removeItem('skw_ai_chat_v4');
                chatHistory = [];
                chatBox.innerHTML = '';
                addBubble("မင်္ဂလာပါ ဘာကူညီရမလဲဗျ", 'ai', false);
            }
        }

        async function sendMsg() {
            const text = input.value.trim();
            if(!text) return;
            
            addBubble(text, 'user', true);
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
                addBubble(cleanReply, 'ai', true);
            } catch(e) {
                typing.style.display = 'none';
                addBubble("Error: " + e.message, 'ai', false);
            }
        }

        function addBubble(text, type, save) {
            if (save) saveChat(text, type);
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

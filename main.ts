import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const kv = await Deno.openKv();

// API KEY
const API_KEY = "AIzaSyClhO1S_DyCvZMzfDj2R28ivYx8vVhiZYc"; 

// --- AI စရိုက် (ဘော်ဒါ ပုံစံ) ---
const SYSTEM_INSTRUCTION = `
You are the user's close friend (ဘော်ဒါ/သူငယ်ချင်း), NOT a formal assistant.

**Your Personality:**
1. **Casual & Friendly:** Speak in casual Myanmar slang (ဘော်ဒါပြော). Use words like "ကွ" (kwa), "ဟ" (ha), "နော်" (naw), "ရောင်" (yaung).
2. **No Formalities:** DO NOT use "ခင်ဗျာ" (Khinbyar), "ရှင်" (Shin), or "မင်္ဂလာပါ" (Mingalapar). Instead use "ဟေ့ရောင်", "ဘာထူးလဲ", "အဆင်ပြေလား".
3. **2D/3D Expert:** Use the provided 'Market Data' to analyze lottery numbers like a pro gambler.
4. **Football Fan:** If talking about football, talk passionately like a fan.

**Examples:**
- Formal: "မင်္ဂလာပါ ဘာကူညီပေးရမလဲခင်ဗျာ။" -> ❌
- Casual: "ရောင်ရေ.. ဘာတွေထူးလဲ၊ ဒီနေ့ ဘာအကွက်ကောင်းလဲ။" -> ✅
- Formal: "ဒီဂဏန်းက ကောင်းပါတယ်။" -> ❌
- Casual: "ဒီဂဏန်းကတော့ ရှယ်ပဲကွ၊ အပြတ်ရိုက်ထားလိုက်။" -> ✅
`;

// Model များ
const MODELS = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.0-pro"];

// Data စုစည်းပေးမည့် Function
async function getFullContext() {
    let context = "";
    try {
        const res = await fetch("https://api.thaistock2d.com/live");
        const data = await res.json();
        context += `[2D MARKET DATA]\n`;
        context += `Date: ${data.live?.date || 'Unknown'}\n`;
        if (data.result && data.result[1]) context += `Morning: ${data.result[1].twod || '-'}\n`;
        if (data.result && (data.result[3] || data.result[2])) {
            const ev = data.result[3] || data.result[2];
            context += `Evening: ${ev.twod || '-'}\n`;
        }
        if (data.live) context += `Live: ${data.live.twod}\n`;
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
      
      [USER SAYS]
      ${message}
      `;
      
      let reply = "အင်တာနက်လိုင်း မကောင်းဘူးကွာ.. ပြန်ပြောပါဦး။";
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
    } catch (e) { return new Response(JSON.stringify({ reply: "လိုင်းကျနေတယ် ဟေ့ရောင်ရေ.." }), { headers: { "Content-Type": "application/json" } }); }
  }

  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>AI Chat</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        body { background: #0f172a; color: white; font-family: sans-serif; }
        .chat-container { height: calc(100vh - 130px); overflow-y: auto; padding: 20px; scroll-behavior: smooth; }
        .msg { max-width: 85%; margin-bottom: 15px; padding: 12px 16px; border-radius: 18px; font-size: 14px; line-height: 1.6; }
        .user { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; align-self: flex-end; margin-left: auto; border-bottom-right-radius: 4px; }
        .ai { background: #334155; color: #e2e8f0; align-self: flex-start; margin-right: auto; border-bottom-left-radius: 4px; border: 1px solid #475569; }
        .typing { font-size: 12px; color: #94a3b8; margin-left: 20px; display: none; }
      </style>
    </head>
    <body class="

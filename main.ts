import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// မိတ်ဆွေရဲ့ Key
const API_KEY = "AIzaSyClhO1S_DyCvZMzfDj2R28ivYx8vVhiZYc"; 

serve(async (req) => {
  const url = new URL(req.url);

  // Model စာရင်းကို Google ဆီ လှမ်းမေးမည့် API
  if (url.pathname === "/check-models") {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { headers: { "Content-Type": "application/json" } });
    }
  }

  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Model Checker</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-900 text-white p-6">
      <h1 class="text-xl font-bold mb-4 text-yellow-500">Google AI Model Checker</h1>
      <p class="mb-4 text-sm text-gray-400">Checking which models are available for your API Key...</p>
      
      <div id="result" class="bg-black p-4 rounded border border-gray-700 font-mono text-xs overflow-auto h-96 whitespace-pre">
        Loading...
      </div>

      <script>
        async function check() {
            const res = await fetch('/check-models');
            const data = await res.json();
            
            const box = document.getElementById('result');
            if (data.models) {
                // Model နာမည်များကိုပဲ သီးသန့်ထုတ်ပြမည်
                const names = data.models.map(m => m.name).join('\\n');
                box.innerHTML = "<span class='text-green-400'>SUCCESS! Available Models:</span>\\n\\n" + names;
            } else if (data.error) {
                box.innerHTML = "<span class='text-red-500'>ERROR:</span>\\n" + JSON.stringify(data.error, null, 2);
            } else {
                box.innerHTML = JSON.stringify(data, null, 2);
            }
        }
        check();
      </script>
    </body>
    </html>
  `, { headers: { "content-type": "text/html; charset=utf-8" } });
});

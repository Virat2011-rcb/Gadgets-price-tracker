const cron = require("node-cron");
const fetch = require("node-fetch");

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const WA_PHONE    = "918421337233";
const WA_APIKEY   = "5WFV7nm9X5Fk";

// ✏️ ADD YOUR GADGETS HERE
const gadgets = [
  { name: "iPhone 16 Pro", targetPrice: 1000 },
  { name: "Sony WH-1000XM5", targetPrice: 250 },
];

async function checkPrice(gadget) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: `Return ONLY a JSON: {"price": <number or null>, "store": "<name>"}`,
      messages: [{ role: "user", content: `Current lowest price in USD for: ${gadget.name}` }],
    }),
  });
  const data = await res.json();
  const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

async function sendWhatsApp(message) {
  const url = `https://api.textmebot.com/send.php?recipient=${WA_PHONE}&apikey=${WA_APIKEY}&text=${encodeURIComponent(message)}`;
  await fetch(url);
  console.log("WhatsApp sent!");
}

async function runChecks() {
  console.log("⏰ Checking prices...", new Date().toLocaleString());
  for (const gadget of gadgets) {
    try {
      const result = await checkPrice(gadget);
      if (!result || result.price === null) {
        console.log(`❓ ${gadget.name}: price not found`);
        continue;
      }
      console.log(`📦 ${gadget.name}: $${result.price} at ${result.store}`);
      if (result.price <= gadget.targetPrice) {
        await sendWhatsApp(
          `🎯 PRICE ALERT!\n📦 ${gadget.name}\n💰 Now: $${result.price} at ${result.store}\n🎯 Your target: $${gadget.targetPrice}\n🛒 Search now before it's gone!`
        );
      }
    } catch (err) {
      console.log(`❌ Error checking ${gadget.name}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 5000)); // 5 sec delay between checks
  }
}

// Run immediately on start, then every 6 hours
runChecks();
cron.schedule("0 */6 * * *", runChecks);
console.log("🚀 Gadget Price Tracker Agent is running!");

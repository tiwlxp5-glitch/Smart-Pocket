// Quick test script to hit the chat API and see the actual response/error
const body = JSON.stringify({
  messages: [
    { id: "1", role: "user", parts: [{ type: "text", text: "สวัสดีครับ" }] }
  ],
  context: { wallets: [], buckets: [], monthlyExpense: 0 }
});

async function test() {
  console.log("Sending request to /api/chat...");
  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      const text = await res.text();
      console.log("Error body:", text);
      return;
    }

    // Read streaming response
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      process.stdout.write(chunk);
    }

    console.log("\n\n--- Full response length:", fullText.length, "bytes ---");
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();

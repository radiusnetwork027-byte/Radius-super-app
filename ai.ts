import { createServerFn } from "@tanstack/react-start";

type Turn = { role: "user" | "assistant"; content: string };

export const askRadiusAi = createServerFn({ method: "POST" })
  .validator((input: { prompt: string; history?: Turn[] }) => {
    const prompt = String(input?.prompt || "").trim().slice(0, 700);
    if (!prompt) throw new Error("Ask a question first");
    const history = Array.isArray(input.history) ? input.history.slice(-6) : [];
    return {
      prompt,
      history: history.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(m.content || "").slice(0, 700),
      })),
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI is not available" };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 320,
        messages: [
          {
            role: "system",
            content:
              "You are RΛDIUS assist, a concise helper inside a Nigerian social app for live friend tracking (±3m), battery sharing, chat, stories, reels, SOS, ghost mode, invites and Jokey Wash laundry. Be practical. Never invent a phone number. Owner is JOKEY PERKY GROUP.",
          },
          ...data.history,
          { role: "user", content: data.prompt },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `AI error ${res.status}` };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() || "";
    return text ? { ok: true as const, text } : { ok: false as const, error: "Empty reply" };
  });

export function localAssist(q: string) {
  const s = q.toLowerCase();
  if (s.includes("battery"))
    return "Open Menu → Battery Sharing and allow the battery permission. Friends then see your level in chat and on the map. Green is above 50%, gold is 20–50%, red is under 20%. A bolt means charging.";
  if (s.includes("track") || s.includes("friend") || s.includes("map"))
    return "On Home, enter a Nigerian number (for example 8012345678) and search. If they are on RΛDIUS you get their place name, Haversine distance, battery and Call, Chat or SOS. Live GPS uses the device geolocation watch.";
  if (s.includes("ghost"))
    return "Ghost Mode hides your live pin for 1 hour. Friends will not get fresh coordinates until the countdown ends. You can turn it off early in Menu.";
  if (s.includes("sos"))
    return "Hold the red SOS button for 3 seconds. RΛDIUS drops an emergency record with your place, battery and coordinates and opens a chat alert to the person you picked.";
  if (s.includes("gold") || s.includes("premium") || s.includes("invite"))
    return "Premium is N1500 or 30 invites. Gold is N3500 or 60 invites and adds the gold tick. Pay from Menu → Premium & Gold. Share your invite link from Invite & Earn.";
  if (s.includes("laundry") || s.includes("wash"))
    return "Jokey Wash is in the menu. Pick Wuse II, Lekki, VI, Garki or Maitama, enter how many clothes, and pickup time. Price is N500 per item. Orders show in your list and on the owner dashboard.";
  if (s.includes("story") || s.includes("reel"))
    return "On Feed, tap +. Story lasts 24 hours (camera, gallery or 30s voice). Post goes to the feed. Reel records 15–30s video. Likes, comments, reshare and favourites save immediately.";
  return "I can help with tracking a number, battery sharing, ghost mode, SOS, stories, reels, invites, Gold, or Jokey Wash. What do you want to do?";
}

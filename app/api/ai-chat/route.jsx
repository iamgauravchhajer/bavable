import { createChatSession, getApiKeys } from "@/configs/AiModel";

export async function POST(req) {
    const { prompt } = await req.json();
    const apiKeys = getApiKeys();

    for (let i = 0; i < apiKeys.length; i++) {
        try {
            const chatSession = createChatSession(i);
            const result = await chatSession.sendMessageStream(prompt);

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        let fullText = '';
                        for await (const chunk of result.stream) {
                            const chunkText = chunk.text();
                            fullText += chunkText;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`));
                        }
                        // Send final complete response
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ result: fullText, done: true })}\n\n`));
                        controller.close();
                    } catch (e) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message || 'AI chat failed' })}\n\n`));
                        controller.close();
                    }
                },
            });

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        } catch (e) {
            // Check if it's a rate limit error (429) or quota error
            const isRateLimit = e.message?.includes('429') || e.status === 429 || e.message?.toLowerCase().includes('quota');
            
            if (isRateLimit && i < apiKeys.length - 1) {
                console.log(`Key ${i} rate limited, trying key ${i + 1}`);
                continue;
            }

            return new Response(JSON.stringify({ error: e.message || 'AI chat failed' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }
}


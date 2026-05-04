import { createEnhancePromptSession, getApiKeys } from "@/configs/AiModel";
import Prompt from "@/data/Prompt";

export async function POST(request) {
    const { prompt } = await request.json();
    const apiKeys = getApiKeys();

    for (let i = 0; i < apiKeys.length; i++) {
        try {
            const enhancePromptSession = createEnhancePromptSession(i);

            const result = await enhancePromptSession.sendMessageStream([
                Prompt.ENHANCE_PROMPT_RULES,
                `Original prompt: ${prompt}`
            ]);

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
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ enhancedPrompt: fullText.trim(), done: true })}\n\n`));
                        controller.close();
                    } catch (e) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message, success: false })}\n\n`));
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
        } catch (error) {
            const isRateLimit = error.message?.includes('429') || error.status === 429 || error.message?.toLowerCase().includes('quota');

            if (isRateLimit && i < apiKeys.length - 1) {
                console.log(`Key ${i} rate limited, trying key ${i + 1}`);
                continue;
            }

            return new Response(JSON.stringify({
                error: error.message,
                success: false
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }
}

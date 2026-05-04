import { createCodeGenerationSession, getApiKeys } from '@/configs/AiModel';

function parseJsonResponse(text) {
    const cleanedText = text
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    try {
        return JSON.parse(cleanedText);
    } catch (error) {
        const jsonStart = cleanedText.indexOf('{');
        const jsonEnd = cleanedText.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            return JSON.parse(cleanedText.slice(jsonStart, jsonEnd + 1));
        }

        throw error;
    }
}

export async function POST(req) {
    const { prompt } = await req.json();
    const apiKeys = getApiKeys();

    for (let i = 0; i < apiKeys.length; i++) {
        try {
            const GenAiCode = createCodeGenerationSession(i);
            const result = await GenAiCode.sendMessageStream(prompt);

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
                        try {
                            const parsedData = parseJsonResponse(fullText);
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ final: parsedData, done: true })}\n\n`));
                        } catch (e) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Invalid JSON response', details: e.message, done: true })}\n\n`));
                        }
                        controller.close();
                    } catch (e) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message || 'Code generation failed' })}\n\n`));
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
            const isRateLimit = e.message?.includes('429') || e.status === 429 || e.message?.toLowerCase().includes('quota');

            if (isRateLimit && i < apiKeys.length - 1) {
                console.log(`Key ${i} rate limited, trying key ${i + 1}`);
                continue;
            }

            return new Response(JSON.stringify({ error: e.message || 'Code generation failed' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }
}


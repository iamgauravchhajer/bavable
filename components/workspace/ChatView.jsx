"use client"
import { MessagesContext } from '@/context/MessagesContext';
import { ArrowUp, Pencil, Loader2, User } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { useConvex, useQuery, useMutation } from 'convex/react';
import { useParams } from 'next/navigation';
import { useContext, useEffect, useState, useCallback, memo, useRef } from 'react';
import { useUser, useClerk } from "@clerk/nextjs";
import Prompt from '@/data/Prompt';
import ReactMarkdown from 'react-markdown';

const MessageItem = memo(({ msg }) => (
    <div className="py-4">
        <div className="flex items-start gap-4">
            {msg.role === 'user' ? (
                <div className="w-8 h-8 rounded-full bg-[#3a3a3a] flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-gray-300" />
                </div>
            ) : (
                <img src="/bharcel-builder-logo.png" alt="AI" className="w-8 h-8 shrink-0 object-contain" />
            )}
            
            <div className="flex-1 overflow-hidden">
                <div className="font-semibold text-sm mb-1 text-gray-200">
                    {msg.role === 'user' ? 'You' : 'Bhavable'}
                </div>
                <div className="text-gray-300 text-sm leading-relaxed prose prose-invert max-w-none">
                    <ReactMarkdown>
                        {msg.content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    </div>
));

MessageItem.displayName = 'MessageItem';

function ChatView() {
    const { id } = useParams();
    const { user } = useUser();
    const { openSignIn } = useClerk();
    const convex = useConvex();
    const userData = useQuery(api.users.GetUser, { uid: user?.id || "" });
    const deductCredits = useMutation(api.users.DeductCredits);
    const { messages, setMessages } = useContext(MessagesContext);
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const UpdateMessages = useMutation(api.workspace.UpdateWorkspace);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const GetWorkSpaceData = useCallback(async () => {
        const result = await convex.query(api.workspace.GetWorkspace, {
            workspaceId: id
        });
        setMessages(result?.messages || []);
    }, [id, convex, setMessages]);

    useEffect(() => {
        id && GetWorkSpaceData();
    }, [id, GetWorkSpaceData]);

    const GetAiResponse = useCallback(async (currentMessages) => {
        if (!user) {
            openSignIn();
            return;
        }

        if ((userData?.credits || 0) <= 0) {
            alert("You have run out of credits. Please buy more to continue.");
            return;
        }

        setLoading(true);
        try {
            await deductCredits({ uid: user.id });
            const PROMPT = `${Prompt.CHAT_PROMPT}\n\nUSER CONVERSATION:\n${JSON.stringify(currentMessages)}`;
            
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: PROMPT }),
            });

            if (!response.ok) throw new Error('Failed to fetch AI response');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = '';

            // Add initial empty AI message
            setMessages(prev => [...prev, { role: 'ai', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.trim().startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.trim().slice(6));
                            if (data.chunk) {
                                fullText += data.chunk;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    if (updated.length > 0 && updated[updated.length - 1].role === 'ai') {
                                        updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText };
                                    }
                                    return updated;
                                });
                            }
                        } catch (e) { /* ignore */ }
                    }
                }
            }

            // Sync final messages to Convex
            setMessages(prev => {
                const finalMessages = [...prev];
                if (finalMessages.length > 0 && finalMessages[finalMessages.length - 1].role === 'ai') {
                    finalMessages[finalMessages.length - 1] = { ...finalMessages[finalMessages.length - 1], content: fullText };
                }
                UpdateMessages({
                    messages: finalMessages,
                    workspaceId: id
                });
                return finalMessages;
            });

        } catch (error) {
            console.error('Error getting AI response:', error);
        } finally {
            setLoading(false);
        }
    }, [id, UpdateMessages, setMessages]);

    useEffect(() => {
        if (messages?.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'user' && !loading) {
                GetAiResponse(messages);
            }
        }
    }, [messages, GetAiResponse, loading]);


    const onGenerate = useCallback((input) => {
        if(!input) return;
        setMessages(prev => [...(prev || []), {
            role: 'user',
            content: input
        }]);
        setUserInput('');
    }, [setMessages]);

    return (
        <div className="relative h-full flex flex-col bg-transparent">
            {/* Header */}
            <div className="p-6 pb-2 shrink-0">
                <h2 className="text-xl font-semibold text-white tracking-tight">Bhavable</h2>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 pt-2 scrollbar-hide">
                <div className="space-y-2">
                    {Array.isArray(messages) && messages?.map((msg, index) => (
                        <MessageItem key={index} msg={msg} />
                    ))}
                    
                    {loading && (
                        <div className="py-4">
                            <div className="flex items-start gap-4">
                                <img src="/bharcel-builder-logo.png" alt="AI" className="w-8 h-8 shrink-0 object-contain animate-pulse" />
                                <div className="flex-1 mt-1.5 text-gray-400 flex items-center gap-2 text-sm">
                                    <Loader2 className="animate-spin h-4 w-4 text-red-500" />
                                    <span>Bhavable is thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Section */}
            <div className="p-4 shrink-0">
                <div className="w-full bg-[#282828] rounded-[24px] p-4 border border-white/5 shadow-2xl">
                    <textarea
                        placeholder="Ask Bhavable..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        className="w-full bg-transparent text-white placeholder-[#878787] focus:outline-none resize-none min-h-[60px] text-[15px] leading-relaxed"
                        disabled={loading}
                    />
                    <div className="flex justify-between items-center mt-2">
                        <button 
                            disabled={loading}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white flex items-center justify-center w-8 h-8"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => onGenerate(userInput)}
                            disabled={loading || !userInput}
                            className={`p-2 rounded-full transition-colors flex items-center justify-center w-8 h-8 ${userInput ? 'bg-white text-black hover:bg-gray-200' : 'bg-[#3a3a3a] text-[#878787]'}`}
                        >
                            <ArrowUp className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatView;

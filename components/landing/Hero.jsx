"use client"
import { MessagesContext } from '@/context/MessagesContext';
import { Pencil, ArrowUp, Loader2 } from 'lucide-react';
import React, { useContext, useState, useEffect } from 'react';
import { useUser, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import CreditsDisplay from '@/components/custom/CreditsDisplay';

function Hero() {
    const { user, isSignedIn } = useUser();
    const [userInput, setUserInput] = useState('');
    const [isEnhancing, setIsEnhancing] = useState(false);
    const { messages, setMessages } = useContext(MessagesContext);
    const CreateWorkspace = useMutation(api.workspace.CreateWorkspace);
    const createUser = useMutation(api.users.CreateUser);
    const router = useRouter();

    useEffect(() => {
        if (user) {
            createUser({
                name: user.fullName || "User",
                email: user.primaryEmailAddress?.emailAddress || "",
                picture: user.imageUrl || "",
                uid: user.id
            });
        }
    }, [user, createUser]);

    const onGenerate = async (input) => {
        if (!input) return;
        const msg = {
            role: 'user',
            content: input
        }
        setMessages([msg]);
        const workspaceID = await CreateWorkspace({
            messages: [msg]
        });
        router.push('/workspace/' + workspaceID);
    }

    const enhancePrompt = async () => {
        if (!userInput) return;
        
        setIsEnhancing(true);
        try {
            const response = await fetch('/api/enhance-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: userInput }),
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let enhancedText = '';
            let buffer = '';

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
                                enhancedText += data.chunk;
                                setUserInput(enhancedText);
                            }
                            if (data.done && data.enhancedPrompt) {
                                setUserInput(data.enhancedPrompt);
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error enhancing prompt:', error);
        } finally {
            setIsEnhancing(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center bg-gray-950">
            {/* Zoomed Background */}
            <div className="absolute inset-0 z-0 bg-[url('https://lovable.dev/cdn-cgi/image/width=1920,f=auto,fit=scale-down,quality=50/_next/static/media/pulse.0g1p1d3e.twut.webp?dpl=a1-6fceef55d6effe49b713a3adf9c53')] bg-cover bg-center bg-no-repeat scale-[1.3] transform-gpu opacity-40" />
            
            {/* Header Navbar */}
            <header className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                    <img src="/bharcel-builder-logo.png" alt="Bhavable Logo" className="w-10 h-10 object-contain" />
                    <span className="text-white font-bold text-xl tracking-tight">bhavable</span>
                </div>
                <div className="flex items-center gap-4">
                    {!isSignedIn ? (
                        <>
                            <SignInButton mode="modal">
                                <button className="text-white/70 hover:text-white transition-colors text-sm font-medium">Sign In</button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="bg-red-600 text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20">Sign Up</button>
                            </SignUpButton>
                        </>
                    ) : (
                        <div className="flex items-center gap-6">
                            <CreditsDisplay />
                            <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-9 h-9 border border-white/10' } }} />
                        </div>
                    )}
                </div>
            </header>

            <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">
                {/* Titles */}
                <h1 className="text-4xl md:text-[52px] font-semibold text-white tracking-tight mb-3 text-center">
                    Build something Bhavable
                </h1>
                <p className="text-gray-300 text-lg md:text-xl mb-10 text-center font-light">
                    Create apps and websites by chatting with AI
                </p>

                {/* Input Section */}
                <div className="w-full max-w-[720px] bg-[#282828] rounded-[24px] p-4 relative border border-white/5 shadow-2xl">
                    <textarea
                        placeholder="Ask Bhavable to create an landing page....."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        className="w-full bg-transparent text-white placeholder-[#878787] focus:outline-none resize-none min-h-[100px] text-[17px] leading-relaxed"
                        disabled={isEnhancing}
                    />
                    <div className="flex justify-between items-center mt-2">
                        <button 
                            onClick={enhancePrompt} 
                            disabled={isEnhancing}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white flex items-center justify-center w-10 h-10"
                        >
                            {isEnhancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Pencil className="w-5 h-5" />}
                        </button>
                        <button 
                            onClick={() => onGenerate(userInput)}
                            disabled={isEnhancing || !userInput}
                            className={`p-2 rounded-full transition-colors flex items-center justify-center w-10 h-10 ${userInput ? 'bg-white text-black hover:bg-gray-200' : 'bg-[#3a3a3a] text-[#878787]'}`}
                        >
                            <ArrowUp className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Hero;
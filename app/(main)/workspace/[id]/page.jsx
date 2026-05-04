"use client";

import dynamic from 'next/dynamic';

const ChatView = dynamic(() => import('@/components/workspace/ChatView'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-[#1a1a1a] h-full" />
});

const CodeView = dynamic(() => import('@/components/workspace/CodeView'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-[#111111] h-full" />
});

const Workspace = () => {
    return (
        <div className="flex h-screen bg-[#111111] overflow-hidden text-white font-sans">
            {/* Left Panel - Chat */}
            <div className="w-[380px] border-r border-[#2a2a2a] flex flex-col bg-[#1a1a1a] shrink-0">
                <ChatView />
            </div>
            
            {/* Right Panel - Code */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#111111]">
                <CodeView />
            </div>
        </div>
    );
};

export default Workspace;

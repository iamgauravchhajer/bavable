"use client"
import React, { useContext, useState, useEffect, useCallback, memo } from 'react';
import Lookup from '@/data/Lookup';
import { MessagesContext } from '@/context/MessagesContext';
import Prompt from '@/data/Prompt';
import { useUser, useClerk, UserButton, SignInButton, Show } from "@clerk/nextjs";
import { useQuery, useMutation, useConvex } from 'convex/react';
import { useParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { Loader2Icon, Download } from 'lucide-react';
import JSZip from 'jszip';
import CreditsDisplay from '@/components/custom/CreditsDisplay';

import {
    SandpackProvider,
    SandpackLayout,
    SandpackCodeEditor,
    SandpackPreview,
    SandpackFileExplorer,
    useSandpack
} from "@codesandbox/sandpack-react";
const ActiveFileHeader = () => {
    const { sandpack } = useSandpack();
    const { activeFile } = sandpack;
    const fileName = activeFile?.split('/').pop() || 'index.js';
    return (
        <div className='text-sm text-gray-300 font-mono font-medium'>
            {fileName}
        </div>
    );
};

function CodeView() {
    const { id } = useParams();
    const { user, isSignedIn } = useUser();
    const { openSignIn } = useClerk();
    const convex = useConvex();
    const userData = useQuery(api.users.GetUser, { uid: user?.id || "" });
    const deductCredits = useMutation(api.users.DeductCredits);
    const [activeTab, setActiveTab] = useState('code');
    const [files, setFiles] = useState(Lookup?.DEFAULT_FILE);
    const { messages } = useContext(MessagesContext);
    const UpdateFiles = useMutation(api.workspace.UpdateFiles);
    const [loading, setLoading] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);

    const preprocessFiles = useCallback((files) => {
        const processed = {};
        Object.entries(files).forEach(([path, content]) => {
            if (typeof content === 'string') {
                processed[path] = { code: content };
            } else if (content && typeof content === 'object') {
                if (!content.code && typeof content === 'object') {
                    processed[path] = { code: JSON.stringify(content, null, 2) };
                } else {
                    processed[path] = content;
                }
            }
        });
        return processed;
    }, []);

    const GetFiles = useCallback(async () => {
        const result = await convex.query(api.workspace.GetWorkspace, {
            workspaceId: id
        });
        const processedFiles = preprocessFiles(result?.fileData || {});
        const mergedFiles = { ...Lookup.DEFAULT_FILE, ...processedFiles };
        setFiles(mergedFiles);
    }, [id, convex, preprocessFiles]);

    useEffect(() => {
        id && GetFiles();
    }, [id, GetFiles]);

    const GenerateAiCode = useCallback(async (currentMessages) => {
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
            const PROMPT = `${Prompt.CODE_GEN_PROMPT}\n\nUSER CONVERSATION:\n${JSON.stringify(currentMessages)}`;

            const response = await fetch('/api/gen-ai-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: PROMPT }),
            });

            if (!response.ok) throw new Error('Failed to generate code');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let finalData = null;
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
                            if (data.done && data.final) {
                                finalData = data.final;
                            }
                        } catch (e) { /* ignore */ }
                    }
                }
            }

            if (finalData && finalData.files) {
                const processedAiFiles = preprocessFiles(finalData.files || {});
                const mergedFiles = { ...Lookup.DEFAULT_FILE, ...processedAiFiles };
                setFiles(mergedFiles);

                await UpdateFiles({
                    workspaceId: id,
                    files: finalData.files
                });
            }
        } catch (error) {
            console.error('Error generating AI code:', error);
        } finally {
            setLoading(false);
        }
    }, [id, UpdateFiles, preprocessFiles]);

    useEffect(() => {
        if (messages?.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'user' && !loading) {
                GenerateAiCode(messages);
            }
        }
    }, [messages, GenerateAiCode, loading]);

    const onDownload = async () => {
        const zip = new JSZip();
        
        // Add files to zip
        Object.entries(files).forEach(([path, fileData]) => {
            const content = typeof fileData === 'string' ? fileData : fileData.code;
            // Remove leading slash if present
            const zipPath = path.startsWith('/') ? path.slice(1) : path;
            zip.file(zipPath, content);
        });

        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bhavable-project-${id}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className='relative h-full flex flex-col bg-[#111111]'>
            <SandpackProvider
                files={files}
                template="react"
                theme={'dark'}
                customSetup={{
                    dependencies: {
                        ...Lookup.DEPENDANCY
                    },
                    entry: '/index.js'
                }}
                options={{
                    externalResources: ['https://cdn.tailwindcss.com'],
                    bundlerTimeoutSecs: 120,
                    recompileMode: "immediate",
                    recompileDelay: 300,
                    classes: {
                        "sp-layout": "h-full",
                        "sp-wrapper": "h-full",
                    }
                }}
            >
                {/* Top Bar */}
                <div className='flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] shrink-0'>
                    {/* Left: Tabs */}
                    <div className='flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-full'>
                        <button
                            onClick={() => setActiveTab('code')}
                            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full transition-colors ${activeTab === 'code' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:text-gray-300'}`}
                        >
                            <span className="text-blue-500 font-mono text-xs">{'</>'}</span>
                            Code
                        </button>
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full transition-colors ${activeTab === 'preview' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:text-gray-300'}`}
                        >
                            <span className="text-blue-500 text-xs">🌐</span>
                            Preview
                        </button>
                    </div>

                    {/* Center: Dynamic File name */}
                    <ActiveFileHeader />

                    {/* Right: Actions */}
                    <div className='flex items-center gap-4'>
                        <button
                            onClick={onDownload}
                            disabled={loading}
                            className="bg-[#1e1e1e] border border-[#2a2a2a] text-white/90 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#252525] transition-all active:scale-95"
                        >
                            download the code
                        </button>

                        <Show when="signed-in">
                            <div className="flex items-center gap-4 border-l border-[#2a2a2a] pl-4">
                                <CreditsDisplay />
                                <UserButton appearance={{ 
                                    elements: { 
                                        userButtonAvatarBox: 'w-8 h-8' 
                                    } 
                                }} />
                            </div>
                        </Show>

                        <Show when="signed-out">
                            <SignInButton mode="modal">
                                <button className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-700 transition-all">
                                    Sign In
                                </button>
                            </SignInButton>
                        </Show>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="w-full" style={{ height: 'calc(100vh - 55px)' }}>
                        <SandpackLayout style={{ height: '100%', border: 'none', background: 'transparent' }}>
                            {activeTab === 'code' ? (
                                <>
                                    <SandpackFileExplorer style={{ height: '100%', background: '#111111' }} />
                                    <SandpackCodeEditor
                                        style={{ height: '100%' }}
                                        showTabs={false}
                                        showLineNumbers
                                        showInlineErrors
                                        wrapContent
                                    />
                                </>
                            ) : (
                                <SandpackPreview
                                    style={{ height: '100%', width: '100%' }}
                                    showNavigator={true}
                                    showOpenInCodeSandbox={false}
                                    showRefreshButton={true}
                                />
                            )}
                        </SandpackLayout>
                    </div>
                </div>
            </SandpackProvider>

            {loading && (
                <div className='absolute inset-0 bg-[#111111]/80 backdrop-blur-sm flex flex-col items-center justify-center z-50'>
                    <Loader2Icon className='animate-spin h-10 w-10 text-white mb-4' />
                    <h2 className='text-white font-medium'>Generating files...</h2>
                </div>
            )}
        </div>
    );
}

export default CodeView;

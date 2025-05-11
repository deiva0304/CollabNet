import React, { useRef, useEffect, useState } from 'react';
import { FaPaperPlane, FaCode, FaImage, FaFile, FaMicrophone, FaMarkdown } from 'react-icons/fa';
import { MdEmojiEmotions } from 'react-icons/md';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import EmojiPicker from 'emoji-picker-react';

const ChatPanel = ({ messages, currentUser, chatInput, setChatInput, sendMessage, yDoc, provider }) => {
    const messageEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [showMdPreview, setShowMdPreview] = useState(false);
    
    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    
    // Format timestamp to readable time
    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Insert code block
    const insertCodeBlock = () => {
        const codeTemplate = '```js\n// your code here\n```';
        setChatInput(prev => `${prev}${prev.endsWith('\n') || prev === '' ? '' : '\n'}${codeTemplate}\n`);
    };

    // Handle file selection
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            // Create a shared file array if it doesn't exist
            if (!yDoc.getMap("files").has(file.name)) {
                // Read file as array buffer
                const arrayBuffer = await file.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // Store file in YDoc
                const filesMap = yDoc.getMap("files");
                filesMap.set(file.name, {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: uint8Array,
                    uploadedBy: currentUser.name,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Add file reference to message
            const fileLink = `[FILE:${file.name}]`;
            setChatInput(prev => `${prev}${prev ? ' ' : ''}${fileLink}`);
            setPreviewFile({
                name: file.name,
                type: file.type,
                size: formatFileSize(file.size)
            });
            
            // Reset file input
            e.target.value = '';
        } catch (error) {
            console.error("Error handling file:", error);
        }
    };

    // Handle image selection
    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        
        try {
            // Create a shared image array if it doesn't exist
            if (!yDoc.getMap("images").has(file.name)) {
                // Read file as array buffer
                const arrayBuffer = await file.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // Store image in YDoc
                const imagesMap = yDoc.getMap("images");
                imagesMap.set(file.name, {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: uint8Array,
                    uploadedBy: currentUser.name,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Add image reference to message
            // Modified to use consistent format with other media types
            const imageLink = `[IMAGE:${file.name}]`;
            setChatInput(prev => `${prev}${prev ? ' ' : ''}${imageLink}`);
            setPreviewFile({
                name: file.name,
                type: file.type,
                size: formatFileSize(file.size),
                isImage: true
            });
            
            // Reset file input
            e.target.value = '';
        } catch (error) {
            console.error("Error handling image:", error);
        }
    };

    // Start recording audio
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm' // Using webm for better compatibility
            });
            const audioChunks = [];
            
            recorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });
            
            recorder.addEventListener('stop', async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
                
                // Store audio in YDoc
                const audioBuffer = await audioFile.arrayBuffer();
                const uint8Array = new Uint8Array(audioBuffer);
                
                const audioMap = yDoc.getMap("audio");
                audioMap.set(audioFile.name, {
                    name: audioFile.name,
                    type: audioFile.type,
                    size: audioFile.size,
                    data: uint8Array,
                    uploadedBy: currentUser.name,
                    timestamp: new Date().toISOString()
                });
                
                // Add audio reference to message
                const audioLink = `[AUDIO:${audioFile.name}]`;
                setChatInput(prev => `${prev}${prev ? ' ' : ''}${audioLink}`);
                
                setIsRecording(false);
                stream.getTracks().forEach(track => track.stop());
            });
            
            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (error) {
            console.error("Error starting recording:", error);
        }
    };
    
    // Stop recording
    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
        }
    };
    
    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    };
    
    // Handle emoji selection
    const onEmojiClick = (emojiObject) => {
        setChatInput(prev => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };
    
    // Render message content with Markdown and media
    const renderMessageContent = (text) => {
        // Process special media tags
        let processedText = text;
        
        // Process file references
        const fileRegex = /\[FILE:(.+?)\]/g;
        processedText = processedText.replace(fileRegex, (match, fileName) => {
            return `📎 **[${fileName}]** `;
        });
        
        // Process audio references
        const audioRegex = /\[AUDIO:(.+?)\]/g;
        processedText = processedText.replace(audioRegex, (match, fileName) => {
            return `🎤 **[Audio Recording]** `;
        });
        
        // Process image references (new)
        const imageRegex = /\[IMAGE:(.+?)\]/g;
        processedText = processedText.replace(imageRegex, (match, fileName) => {
            return `📷 **[${fileName}]** `;
        });
        
        // Fix for Markdown image syntax in messages
        const mdImageRegex = /!\[Image\]\((.+?)\)/g;
        processedText = processedText.replace(mdImageRegex, (match, fileName) => {
            return `[IMAGE:${fileName}]`;
        });
        
        return (
            <div className="markdown-body">
                <ReactMarkdown
                    components={{
                        code({node, inline, className, children, ...props}) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                                <SyntaxHighlighter
                                    style={atomDark}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            );
                        }
                    }}
                >
                    {processedText}
                </ReactMarkdown>
            </div>
        );
    };
    
    // Render message with attached media (files, images, audio)
    const renderAttachments = (text) => {
        const fileMatches = [...text.matchAll(/\[FILE:(.+?)\]/g)];
        const audioMatches = [...text.matchAll(/\[AUDIO:(.+?)\]/g)];
        const imageMatches = [...text.matchAll(/\[IMAGE:(.+?)\]/g)] || [];
        // Also catch old format image references
        const oldImageMatches = [...text.matchAll(/!\[Image\]\((.+?)\)/g)] || [];
        
        return (
            <div className="mt-2 space-y-3">
                {fileMatches.map((match, index) => {
                    const fileName = match[1];
                    const fileData = yDoc.getMap("files").get(fileName);
                    
                    if (fileData) {
                        return (
                            <div key={`file-${index}`} className="bg-gray-800 rounded-md p-2 flex items-center">
                                <FaFile className="mr-2 text-blue-400" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{fileName}</div>
                                    <div className="text-xs text-gray-400">{formatFileSize(fileData.size)}</div>
                                </div>
                                <button 
                                    className="ml-2 px-2 py-1 bg-blue-600 rounded-md text-xs"
                                    onClick={() => {
                                        const blob = new Blob([fileData.data], { type: fileData.type });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = fileName;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                >
                                    Download
                                </button>
                            </div>
                        );
                    }
                    return null;
                })}
                
                {/* Combined image rendering for both formats */}
                {[...imageMatches, ...oldImageMatches].map((match, index) => {
                    const fileName = match[1];
                    const imageData = yDoc.getMap("images").get(fileName);
                    
                    if (imageData) {
                        const blob = new Blob([imageData.data], { type: imageData.type });
                        const url = URL.createObjectURL(blob);
                        
                        return (
                            <div key={`image-${index}`} className="bg-gray-800 rounded-md p-2">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center">
                                        <FaImage className="mr-2 text-blue-400" />
                                        <span className="text-sm">{fileName}</span>
                                    </div>
                                    <button 
                                        className="px-2 py-1 bg-blue-600 rounded-md text-xs"
                                        onClick={() => {
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = fileName;
                                            a.click();
                                        }}
                                    >
                                        Download
                                    </button>
                                </div>
                                <img
                                    src={url}
                                    alt={`Shared image: ${fileName}`}
                                    className="max-w-full rounded-lg max-h-80 w-auto mx-auto"
                                    onLoad={() => {
                                        // Don't revoke URL as it needs to remain visible
                                    }}
                                />
                            </div>
                        );
                    }
                    return null;
                })}
                
                {audioMatches.map((match, index) => {
                    const fileName = match[1];
                    const audioData = yDoc.getMap("audio").get(fileName);
                    
                    if (audioData) {
                        const blob = new Blob([audioData.data], { type: audioData.type });
                        const url = URL.createObjectURL(blob);
                        
                        return (
                            <div key={`audio-${index}`} className="bg-gray-800 rounded-md p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center">
                                        <FaMicrophone className="mr-2 text-blue-400" />
                                        <span className="text-sm">Audio Recording</span>
                                    </div>
                                </div>
                                {/* Increased audio player size */}
                                <audio 
                                    controls 
                                    className="w-full h-12" 
                                    style={{ minWidth: '250px' }}
                                    onLoad={() => {
                                        // Don't revoke URL as it needs to remain playable
                                    }}
                                >
                                    <source src={url} type={audioData.type} />
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        );
    };
    
    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Messages area */}
            <div className="flex-grow p-4 overflow-y-auto">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <p className="mb-2">No messages yet. Start the conversation!</p>
                            <p className="text-sm">💡 <i>Tip: You can use Markdown formatting and share code, images, and files.</i></p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div 
                                key={message.id}
                                className={`flex ${message.user.name === currentUser?.name ? 'justify-end' : 'justify-start'}`}
                            >
                                <div 
                                    className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${
                                        message.user.name === currentUser?.name 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-gray-700 text-white'
                                    }`}
                                    style={{
                                        borderLeftColor: message.user.color,
                                        borderLeftWidth: message.user.name !== currentUser?.name ? '4px' : '0px'
                                    }}
                                >
                                    {message.user.name !== currentUser?.name && (
                                        <div className="font-bold text-sm" style={{ color: message.user.color }}>
                                            {message.user.name}
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap break-words">
                                        {renderMessageContent(message.text)}
                                        {renderAttachments(message.text)}
                                    </div>
                                    <div className="text-xs text-gray-300 text-right mt-1">
                                        {formatTime(message.timestamp)}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messageEndRef} />
                    </div>
                )}
            </div>
            
            {/* Preview area */}
            {previewFile && (
                <div className="px-3 bg-gray-800 border-t border-gray-700">
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded-md mt-1">
                        <div className="flex items-center">
                            {previewFile.isImage ? <FaImage className="mr-2 text-blue-400" /> : <FaFile className="mr-2 text-blue-400" />}
                            <div>
                                <div className="text-sm font-medium truncate max-w-xs">{previewFile.name}</div>
                                <div className="text-xs text-gray-400">{previewFile.size}</div>
                            </div>
                        </div>
                        <button 
                            className="text-gray-400 hover:text-white"
                            onClick={() => setPreviewFile(null)}
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
            
            {/* Markdown preview */}
            {showMdPreview && chatInput && (
                <div className="px-3 bg-gray-800 border-t border-gray-700">
                    <div className="py-2">
                        <div className="text-xs text-gray-400 mb-1">Preview:</div>
                        <div className="bg-gray-700 rounded-md p-3 max-h-40 overflow-y-auto">
                            {renderMessageContent(chatInput)}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Input area */}
            <div className="p-3 bg-gray-800 border-t border-gray-700">
                <div className="flex flex-col space-y-2">
                    <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message... (Markdown supported)"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                    />
                    
                    <div className="flex justify-between items-center">
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setShowMdPreview(!showMdPreview)}
                                className="p-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                                title="Toggle Markdown Preview"
                            >
                                <FaMarkdown />
                            </button>
                            
                            <button
                                onClick={insertCodeBlock}
                                className="p-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                                title="Insert Code Block"
                            >
                                <FaCode />
                            </button>
                            
                            <button
                                onClick={() => imageInputRef.current.click()}
                                className="p-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                                title="Share Image"
                            >
                                <FaImage />
                                <input 
                                    type="file" 
                                    ref={imageInputRef}
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                />
                            </button>
                            
                            <button
                                onClick={() => fileInputRef.current.click()}
                                className="p-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                                title="Share File"
                            >
                                <FaFile />
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    onChange={handleFileSelect}
                                />
                            </button>
                            
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`p-2 rounded-full ${isRecording ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}`}
                                title={isRecording ? "Stop Recording" : "Record Audio"}
                            >
                                <FaMicrophone />
                            </button>
                            
                            <div className="relative">
                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="p-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                                    title="Add Emoji"
                                >
                                    <MdEmojiEmotions />
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-full left-0 mb-2 z-10">
                                        <EmojiPicker onEmojiClick={onEmojiClick} />
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <button
                            onClick={sendMessage}
                            disabled={!chatInput.trim() && !previewFile}
                            className={`p-3 rounded-full ${
                                chatInput.trim() || previewFile ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600'
                            } text-white`}
                        >
                            <FaPaperPlane />
                        </button>
                    </div>
                    
                    <div className="text-xs text-gray-400 pl-2">
                        Press Enter to send, Shift+Enter for new line | Markdown formatting supported
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;
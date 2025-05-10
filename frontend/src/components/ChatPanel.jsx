import React, { useRef, useEffect } from 'react';
import { FaPaperPlane } from 'react-icons/fa';

const ChatPanel = ({ messages, currentUser, chatInput, setChatInput, sendMessage }) => {
    const messageEndRef = useRef(null);
    
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
    
    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Messages area */}
            <div className="flex-grow p-4 overflow-y-auto">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <p>No messages yet. Start the conversation!</p>
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
                                        {message.text}
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
            
            {/* Input area */}
            <div className="p-3 bg-gray-800 border-t border-gray-700">
                <div className="flex space-x-2">
                    <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-grow px-4 py-2 bg-gray-700 text-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="2"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!chatInput.trim()}
                        className={`p-3 rounded-full ${
                            chatInput.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600'
                        } text-white`}
                    >
                        <FaPaperPlane />
                    </button>
                </div>
                <div className="text-xs text-gray-400 mt-1 pl-2">
                    Press Enter to send, Shift+Enter for new line
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;
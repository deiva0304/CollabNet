import React, { useRef, useState, useEffect } from 'react';
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebrtcProvider } from 'y-webrtc';
import { MonacoBinding } from "y-monaco";
import { Tabs, Tab } from '../components/Tabs';
import LanguagesDropdown from '../components/LanguageDropdown';
import CompileButton from '../components/CompileButton';
import InputWindow from '../components/InputWindow';
import OutputWindow from '../components/OutputWindow';
import { languageOptions } from '../data/languageOptions';
import randomColor from 'randomcolor';
import Client from '../components/Client';
import CopyRoomButton from '../components/CopyRoomButton';
import OutputDetails from '../components/OutputDetails';
import ChatPanel from '../components/ChatPanel';
import VideoConference from '../components/VideoConference';
import { Resizable } from 're-resizable';
import { FaCode, FaComment, FaVideo, FaMicrophone, FaUsers } from 'react-icons/fa';
import config from '../config';

const EnhancedCodeEditor = ({ roomID }) => {
    // Core refs and state
    const editorRef = useRef(null);
    const [yDoc, setYDoc] = useState(null);
    const [provider, setProvider] = useState(null);
    const [awareness, setAwareness] = useState(null);
    const [users, setUsers] = useState([]);
    const [hideUsers, setHideUsers] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [currLang, setCurrLang] = useState(languageOptions.find(lang => lang.id === 'cpp'));
    const [compilerText, setCompilerText] = useState('');
    const [input, setInput] = useState('');
    const [activeTab, setActiveTab] = useState('code');
    const randomUserColor = randomColor({ luminosity: 'light' });
    
    // Chat state
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    
    // Media state
    const [videoEnabled, setVideoEnabled] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    
    // Layout state
    const [editorHeight, setEditorHeight] = useState('60vh');
    const [panelRatio, setPanelRatio] = useState(75); // Editor takes 75% of the space initially

    useEffect(() => {
        // Cleanup function for when component unmounts
        return () => {
            if (provider) {
                provider.disconnect();
            }
        }
    }, [provider]);

    function handleEditorDidMount(editor, monaco) {
        editorRef.current = editor;
        editorRef.current.getModel().setEOL(0);
        
        const ydoc = new Y.Doc();
        setYDoc(ydoc);
        
        // Create a shared text for the code editor
        const sharedCode = ydoc.getText("monaco");
        
        // Create a shared array for chat messages
        const sharedMessages = ydoc.getArray("messages");
        
        // Initialize WebRTC provider
        const webrtcProvider = new WebrtcProvider(roomID, ydoc, { 
            signaling: [config.SIGNALING_URL || import.meta.env.VITE_BACKEND_URL]
        });
        setProvider(webrtcProvider);
        
        // Initialize undo manager
        const undoManager = new Y.UndoManager(sharedCode);
        
        // Get user information
        const userName = getUserName();
        setCurrentUser({
            name: userName,
            color: randomUserColor
        });
        
        // Set up awareness
        const awarenessInstance = webrtcProvider.awareness;
        setAwareness(awarenessInstance);
        
        awarenessInstance.setLocalStateField("user", {
            name: userName,
            color: randomUserColor
        });
        
        // Create Monaco binding
        const binding = new MonacoBinding(
            sharedCode, 
            editorRef.current.getModel(), 
            new Set([editorRef.current]), 
            awarenessInstance
        );
        
        // Set up observers for shared data
        sharedMessages.observe(event => {
            // Handle updates to the messages array
            setMessages(Array.from(sharedMessages.toArray()));
        });
        
        // Set up awareness updates
        awarenessInstance.on('update', () => {
            updateUsersList(awarenessInstance);
            applyUserStyles(awarenessInstance);
        });
        
        // Connect to peers
        webrtcProvider.connect();
    }
    
    function getUserName() {
        // Try to get from localStorage first
        const savedName = localStorage.getItem('coderoom-username');
        if (savedName) return savedName;
        
        // Otherwise prompt user
        var person = prompt("Please enter your name (under 10 characters)");
        
        if (!person || person.trim() === '' || person.trim() === '\u200B') {
            person = Math.floor(Math.random() * 10) + "User";
        } else {
            person = person.trim().slice(0, 10);
        }
        
        // Save to localStorage for future sessions
        localStorage.setItem('coderoom-username', person);
        return person;
    }
    
    function updateUsersList(awareness) {
        var jsonData = Array.from(awareness.getStates());
        
        if (jsonData.length > 1) {
            setHideUsers(false);
            setUsers(jsonData.map(item => ({
                clientId: item[0],
                name: item[1].user.name,
                color: item[1].user.color
            })));
        } else {
            setHideUsers(true);
        }
    }
    
    function applyUserStyles(awareness) {
        var jsonData = Array.from(awareness.getStates());
        
        var clientsArr = jsonData.map(item => ({
            clientId: item[0],
            name: item[1].user.name,
            color: item[1].user.color
        }));
        
        clientsArr.forEach(client => {
            const selectionClass = `yRemoteSelection-${client.clientId}`;
            const selectionHeadClass = `yRemoteSelectionHead-${client.clientId}`;
            
            const red = parseInt(client.color.substring(1, 3), 16);
            const green = parseInt(client.color.substring(3, 5), 16);
            const blue = parseInt(client.color.substring(5, 7), 16);
            
            // Check if style already exists to avoid duplicates
            const existingStyle = document.getElementById(`style-${client.clientId}`);
            if (existingStyle) {
                existingStyle.remove();
            }
            
            const selectionStyle = document.createElement('style');
            selectionStyle.id = `style-${client.clientId}`;
            selectionStyle.innerHTML = `
                .${selectionClass} {
                    background-color: rgba(${red}, ${green}, ${blue}, 0.30);
                    border-radius: 2px
                }
                
                .${selectionHeadClass} {
                    z-index: 1;
                    position: absolute;
                    border-left: ${client.color} solid 2px;
                    border-top: ${client.color} solid 2px;
                    border-bottom: ${client.color} solid 2px;
                    height: 100%;
                    box-sizing: border-box;
                }
                
                .${selectionHeadClass}::after {
                    position: absolute;
                    content: ' ';
                    border: 3px solid ${client.color};
                    border-radius: 4px;
                    left: -4px;
                    top: -5px;
                }
                
                .${selectionHeadClass}:hover::before {
                    content: '${client.name}';
                    position: absolute;
                    background-color: ${client.color};
                    color: black;
                    padding-right: 3px;
                    padding-left: 3px;
                    margin-top: -2px;
                    font-size: 12px;
                    border-top-right-radius: 4px;
                    border-bottom-right-radius: 4px;
                }
            `;
            document.head.appendChild(selectionStyle);
        });
    }
    
    function sendMessage() {
        if (!chatInput.trim() || !yDoc) return;
        
        const newMessage = {
            id: Date.now(),
            user: currentUser,
            text: chatInput,
            timestamp: new Date().toISOString()
        };
        
        // Add to shared messages array
        const sharedMessages = yDoc.getArray("messages");
        sharedMessages.push([newMessage]);
        
        // Clear input
        setChatInput('');
    }
    
    function toggleVideo() {
        setVideoEnabled(!videoEnabled);
    }
    
    function toggleAudio() {
        setAudioEnabled(!audioEnabled);
    }
    
    function toggleParticipants() {
        setShowParticipants(!showParticipants);
    }
    
    // Helper function to determine the Monaco Editor language mode
    const getEditorLanguage = (languageId) => {
        if (languageId === 'nodejs' || languageId === 'rhino') return 'javascript';
        if (languageId === 'python3' || languageId === 'python2' || languageId === 'python') return 'python';
        if (languageId === 'cpp' || languageId === 'cpp14' || languageId === 'cpp17') return 'cpp';
        return languageId;
    };
    
    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header with room info and participants */}
            <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-bold">CollabNet</h1>
                    <span className="bg-gray-700 px-2 py-1 rounded text-sm">Room: {roomID}</span>
                    <CopyRoomButton roomID={roomID} />
                </div>
                
                <div className="flex items-center space-x-4">
                    {/* Media controls */}
                    <button 
                        onClick={toggleVideo} 
                        className={`p-2 rounded-full ${videoEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                        title={videoEnabled ? "Disable Video" : "Enable Video"}
                    >
                        <FaVideo />
                    </button>
                    
                    <button 
                        onClick={toggleAudio} 
                        className={`p-2 rounded-full ${audioEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                        title={audioEnabled ? "Disable Audio" : "Enable Audio"}
                    >
                        <FaMicrophone />
                    </button>
                    
                    <button 
                        onClick={toggleParticipants}
                        className={`p-2 rounded-full ${showParticipants ? 'bg-blue-500' : 'bg-gray-600'}`}
                        title="Show Participants"
                    >
                        <FaUsers />
                        {users.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full h-4 w-4 flex items-center justify-center">{users.length}</span>}
                    </button>
                </div>
            </div>
            
            {/* Participants panel (conditionally shown) */}
            {showParticipants && (
                <div className="bg-gray-700 p-2 flex flex-wrap gap-2">
                    {users.map(user => (
                        <Client key={user.clientId} username={user.name} color={user.color} />
                    ))}
                    {users.length === 0 && <div className="text-gray-300">No other participants</div>}
                </div>
            )}
            
            {/* Main content area with resizable panels */}
            <div className="flex flex-grow overflow-hidden">
                {/* Editor panel */}
                <Resizable
                    className="bg-gray-900 flex flex-col"
                    size={{ width: `${panelRatio}%`, height: '100%' }}
                    onResizeStop={(e, direction, ref, d) => {
                        const newWidth = panelRatio + (d.width / window.innerWidth) * 100;
                        setPanelRatio(Math.min(Math.max(newWidth, 30), 90)); // Limit between 30% and 90%
                    }}
                    maxWidth="90%"
                    minWidth="30%"
                    enable={{ right: true }}
                >
                    {/* Language selection and tabs */}
                    <div className="flex justify-between items-center bg-gray-800 p-2">
                        <LanguagesDropdown currValue={currLang} onSelectChange={(event) => setCurrLang(event)} />
                        
                        <div className="flex space-x-2">
                            <CompileButton 
                                content={editorRef} 
                                langauge={currLang} 
                                input={input} 
                                setOutput={(output) => {setCompilerText(output)}}
                            />
                        </div>
                    </div>
                    
                    {/* Editor */}
                    <div className="flex-grow overflow-hidden">
                        <Editor
                            aria-labelledby="Code Editor"
                            className="h-full"
                            language={getEditorLanguage(currLang.id)}
                            theme="vs-dark"
                            onMount={handleEditorDidMount}
                            options={{
                                cursorBlinking: "smooth",
                                automaticLayout: true,
                                fontSize: 14,
                                minimap: { enabled: false }
                            }}
                        />
                    </div>
                </Resizable>
                
                {/* Right panel with tabs */}
                <div className="flex flex-col flex-grow bg-gray-800">
                    <div className="bg-gray-700 p-1">
                        <div className="flex">
                            <button 
                                className={`px-4 py-2 ${activeTab === 'io' ? 'bg-gray-800 text-white' : 'bg-gray-700 text-gray-300'}`}
                                onClick={() => setActiveTab('io')}
                            >
                                Input/Output
                            </button>
                            <button 
                                className={`px-4 py-2 ${activeTab === 'chat' ? 'bg-gray-800 text-white' : 'bg-gray-700 text-gray-300'}`}
                                onClick={() => setActiveTab('chat')}
                            >
                                Chat
                            </button>
                            <button 
                                className={`px-4 py-2 ${activeTab === 'video' ? 'bg-gray-800 text-white' : 'bg-gray-700 text-gray-300'}`}
                                onClick={() => setActiveTab('video')}
                            >
                                Video
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-grow overflow-hidden">
                        {activeTab === 'io' && (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 p-2">
                                    <InputWindow setInput={(input) => {setInput(input)}} />
                                </div>
                                <div className="flex-1 p-2">
                                    <OutputWindow outputDetails={compilerText} />
                                </div>
                                <div className="p-2">
                                    <OutputDetails outputDetails={compilerText} />
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'chat' && (
                            <div className="flex flex-col h-full">
                                <ChatPanel 
                                    messages={messages} 
                                    currentUser={currentUser}
                                    chatInput={chatInput}
                                    setChatInput={setChatInput}
                                    sendMessage={sendMessage}
                                />
                            </div>
                        )}
                        
                        {activeTab === 'video' && (
                            <div className="flex flex-col h-full">
                                <VideoConference 
                                    roomID={roomID}
                                    videoEnabled={videoEnabled}
                                    audioEnabled={audioEnabled}
                                    currentUser={currentUser}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedCodeEditor;
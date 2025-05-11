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
import { FaCode, FaComment, FaVideo, FaMicrophone, FaUsers, FaCog, FaSave, FaFileDownload, FaFilePdf } from 'react-icons/fa';
import config from '../config';

const EnhancedCodeEditor = ({ roomID, userName, setUserName, onLeaveRoom }) => {
    // Core refs and state
    const editorRef = useRef(null);
    const [yDoc, setYDoc] = useState(null);
    const [provider, setProvider] = useState(null);
    const [awareness, setAwareness] = useState(null);
    const [users, setUsers] = useState([]);
    const [hideUsers, setHideUsers] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [currLang, setCurrLang] = useState(languageOptions.find(lang => lang.id === 'cpp'));
    const [input, setInput] = useState('');
    const [activeTab, setActiveTab] = useState('code');
    const randomUserColor = randomColor({ luminosity: 'light' });
    
    // Compilation state
    const [compilationResult, setCompilationResult] = useState({
        status: '',
        output: '',
        memory: '',
        time: '',
        stderr: '',
        compile_output: '',
        pdfBase64: null,
        log: ''
    });
    
    // Chat state
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [userSettings, setUserSettings] = useState({
        editorFontSize: 14,
        editorTheme: 'vs-dark',
        minimapEnabled: false,
        wordWrap: 'on'
    });
    
    // Media state
    const [videoEnabled, setVideoEnabled] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    
    // File saving state
    const [fileName, setFileName] = useState('untitled');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    
    // Layout state
    const [panelRatio, setPanelRatio] = useState(75);

    useEffect(() => {
        // Cleanup function for when component unmounts
        return () => {
            if (provider) {
                provider.disconnect();
            }
        }
    }, [provider]);

    // Load user settings from localStorage on initial render
    useEffect(() => {
        const savedSettings = localStorage.getItem('coderoom-settings');
        if (savedSettings) {
            try {
                const parsedSettings = JSON.parse(savedSettings);
                setUserSettings(parsedSettings);
            } catch (e) {
                console.error("Failed to parse settings:", e);
            }
        }
    }, []);

    function handleEditorDidMount(editor, monaco) {
        editorRef.current = editor;
        editorRef.current.getModel().setEOL(0);
        
        const ydoc = new Y.Doc();
        setYDoc(ydoc);
        
        const sharedCode = ydoc.getText("monaco");
        const sharedMessages = ydoc.getArray("messages");
        ydoc.getMap("files");
        ydoc.getMap("images");
        ydoc.getMap("audio");
        
        const webrtcProvider = new WebrtcProvider(roomID, ydoc, { 
            signaling: [config.SIGNALING_URL || import.meta.env.VITE_BACKEND_URL]
        });
        setProvider(webrtcProvider);
        
        const undoManager = new Y.UndoManager(sharedCode);
        
        const userName = getUserName();
        setCurrentUser({
            name: userName,
            color: randomUserColor
        });
        
        const awarenessInstance = webrtcProvider.awareness;
        setAwareness(awarenessInstance);
        
        awarenessInstance.setLocalStateField("user", {
            name: userName,
            color: randomUserColor
        });
        
        const binding = new MonacoBinding(
            sharedCode, 
            editorRef.current.getModel(), 
            new Set([editorRef.current]), 
            awarenessInstance
        );
        
        sharedMessages.observe(event => {
            setMessages(Array.from(sharedMessages.toArray()));
        });
        
        awarenessInstance.on('update', () => {
            updateUsersList(awarenessInstance);
            applyUserStyles(awarenessInstance);
        });
        
        webrtcProvider.connect();
    }
    
    function getUserName() {
        const savedName = localStorage.getItem('coderoom-username');
        if (savedName) return savedName;
        
        var person = prompt("Please enter your name (under 10 characters)");
        
        if (!person || person.trim() === '' || person.trim() === '\u200B') {
            person = Math.floor(Math.random() * 10) + "User";
        } else {
            person = person.trim().slice(0, 10);
        }
        
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
        if (!chatInput.trim() && !document.querySelector('input[type="file"]')?.files?.length && !yDoc) return;
        
        const newMessage = {
            id: Date.now(),
            user: currentUser,
            text: chatInput,
            timestamp: new Date().toISOString()
        };
        
        const sharedMessages = yDoc.getArray("messages");
        sharedMessages.push([newMessage]);
        
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
    
    function toggleSettings() {
        setShowSettings(!showSettings);
    }
    
    function updateEditorSettings(setting, value) {
        setUserSettings(prev => {
            const newSettings = { ...prev, [setting]: value };
            localStorage.setItem('coderoom-settings', JSON.stringify(newSettings));
            return newSettings;
        });
    }
    
    const handleDownload = () => {
        if (!editorRef.current) return;
        
        const content = editorRef.current.getValue();
        const extension = getFileExtension(currLang.id);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const getFileExtension = (languageId) => {
        const extensions = {
            'javascript': 'js',
            'python': 'py',
            'python2': 'py',
            'python3': 'py',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cpp14': 'cpp',
            'cpp17': 'cpp',
            'csharp': 'cs',
            'go': 'go',
            'ruby': 'rb',
            'swift': 'swift',
            'php': 'php',
            'typescript': 'ts',
            'kotlin': 'kt',
            'rust': 'rs',
            'scala': 'scala',
            'r': 'r',
            'bash': 'sh',
            'latex': 'tex'
        };
        
        return extensions[languageId] || 'txt';
    };
    
    const showSaveFileDialog = () => {
        setShowSaveDialog(true);
    };
    
    const handleSaveWithName = () => {
        handleDownload();
        setShowSaveDialog(false);
    };
    
    const getEditorLanguage = (languageId) => {
        if (languageId === 'nodejs' || languageId === 'rhino') return 'javascript';
        if (languageId === 'python3' || languageId === 'python2' || languageId === 'python') return 'python';
        if (languageId === 'cpp' || languageId === 'cpp14' || languageId === 'cpp17') return 'cpp';
        if (languageId === 'latex') return 'latex';
        if (languageId === 'ruby') return 'ruby';
        if (languageId === 'go') return 'go';
        if (languageId === 'php') return 'php';
        if (languageId === 'rust') return 'rust';
        return languageId;
    };
    
    // Handler for compilation output
    const handleCompilerOutput = (output) => {
        setCompilationResult({
            status: output.status || '',
            output: output.output || '',
            memory: output.memory || '',
            time: output.time || '',
            stderr: output.stderr || '',
            compile_output: output.compile_output || '',
            pdfBase64: output.pdfBase64 || null,
            log: output.log || ''
        });
    };
    
    const togglePdfPreview = () => {
        setActiveTab(activeTab === 'pdf' ? 'io' : 'pdf');
    };
    
    // Default LaTeX template
    const insertLatexTemplate = () => {
        if (editorRef.current && currLang.id === 'latex') {
            const template = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{Your Document Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a basic LaTeX document. Start writing here!

\\section{Mathematics}
Here's an example of some math:

The quadratic formula is:
\\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\]

\\section{Conclusion}
That's all for now!

\\end{document}`;
            
            editorRef.current.setValue(template);
        }
    };
    
    // Effect to insert LaTeX template when language is switched to LaTeX
    useEffect(() => {
        if (editorRef.current && currLang.id === 'latex' && editorRef.current.getValue().trim() === '') {
            insertLatexTemplate();
        }
    }, [currLang]);

    return (
        <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
            {/* Header with room info and participants */}
            <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <img
  src="/logo.png"
  alt="Logo"
  className="w-20 h-20 flex justify-center items-center rounded-sm"
/>

                    <span className="bg-gray-700 px-2 py-1 rounded text-sm">Room: {roomID}</span>
                    <CopyRoomButton roomID={roomID} />
                    <button 
      onClick={onLeaveRoom}
      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
    >
      Leave Room
    </button>
                </div>
                
                <div className="flex items-center space-x-4">
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
                    
                    <button 
                        onClick={toggleSettings}
                        className={`p-2 rounded-full ${showSettings ? 'bg-blue-500' : 'bg-gray-600'}`}
                        title="Editor Settings"
                    >
                        <FaCog />
                    </button>
                </div>
            </div>
            
            {showParticipants && (
                <div className="bg-gray-700 p-2 flex flex-wrap gap-2">
                    {users.map(user => (
                        <Client key={user.clientId} username={user.name} color={user.color} />
                    ))}
                    {users.length === 0 && <div className="text-gray-300">No other participants</div>}
                </div>
            )}
            
            {showSettings && (
                <div className="bg-gray-700 p-3">
                    <h3 className="text-white font-bold mb-2">Editor Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-gray-300 text-sm mb-1">Font Size</label>
                            <select 
                                value={userSettings.editorFontSize} 
                                onChange={(e) => updateEditorSettings('editorFontSize', Number(e.target.value))}
                                className="w-full bg-gray-800 text-white p-2 rounded"
                            >
                                {[12, 14, 16, 18, 20, 22].map(size => (
                                    <option key={size} value={size}>{size}px</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-gray-300 text-sm mb-1">Theme</label>
                            <select 
                                value={userSettings.editorTheme} 
                                onChange={(e) => updateEditorSettings('editorTheme', e.target.value)}
                                className="w-full bg-gray-800 text-white p-2 rounded"
                            >
                                <option value="vs-dark">Dark</option>
                                <option value="vs-light">Light</option>
                                <option value="hc-black">High Contrast</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-gray-300 text-sm mb-1">Minimap</label>
                            <div className="flex items-center space-x-2 mt-2">
                                <input 
                                    type="checkbox" 
                                    id="minimapEnabled"
                                    checked={userSettings.minimapEnabled}
                                    onChange={(e) => updateEditorSettings('minimapEnabled', e.target.checked)}
                                    className="rounded"
                                />
                                <label htmlFor="minimapEnabled" className="text-white">Show minimap</label>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-gray-300 text-sm mb-1">Word Wrap</label>
                            <select 
                                value={userSettings.wordWrap} 
                                onChange={(e) => updateEditorSettings('wordWrap', e.target.value)}
                                className="w-full bg-gray-800 text-white p-2 rounded"
                            >
                                <option value="on">On</option>
                                <option value="off">Off</option>
                                <option value="wordWrapColumn">Column</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex flex-grow overflow-hidden">
                <Resizable
                    className="bg-gray-900 flex flex-col"
                    size={{ width: `${panelRatio}%`, height: '100%' }}
                    onResizeStop={(e, direction, ref, d) => {
                        const newWidth = panelRatio + (d.width / window.innerWidth) * 100;
                        setPanelRatio(Math.min(Math.max(newWidth, 30), 90));
                    }}
                    maxWidth="90%"
                    minWidth="30%"
                    enable={{ right: true }}
                >
                    <div className="flex justify-between items-center bg-gray-800 p-2">
                        <LanguagesDropdown 
                            currValue={currLang} 
                            onSelectChange={(event) => {
                                setCurrLang(event);
                                if (event.id === 'latex') {
                                    setCompilationResult(prev => ({
                                        ...prev,
                                        pdfBase64: null,
                                        log: ''
                                    }));
                                }
                            }} 
                        />
                        
                        <div className="flex space-x-2">
                            {currLang.id === 'latex' && (
                                <button
                                    onClick={insertLatexTemplate}
                                    className="flex items-center px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white"
                                    title="Insert LaTeX Template"
                                >
                                    <FaFilePdf className="mr-1" /> Template
                                </button>
                            )}
                            
                            <button
                                onClick={showSaveFileDialog}
                                className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white"
                                title="Save File"
                            >
                                <FaSave className="mr-1" /> Save
                            </button>
                            
                            {currLang.id === 'latex' && compilationResult.pdfBase64 && (
                                <button
                                    onClick={togglePdfPreview}
                                    className="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white"
                                    title="Toggle PDF Preview"
                                >
                                    <FaFilePdf className="mr-1" /> {activeTab === 'pdf' ? 'Hide PDF' : 'Show PDF'}
                                </button>
                            )}
                            
                            <CompileButton 
                                content={editorRef} 
                                langauge={currLang} 
                                input={currLang.id === 'latex' ? undefined : input} // Don't send input for LaTeX
                                setOutput={handleCompilerOutput}
                            />
                        </div>
                    </div>
                    
                    <div className="flex-grow overflow-hidden">
                        <Editor
                            aria-labelledby="Code Editor"
                            className="h-full"
                            language={getEditorLanguage(currLang.id)}
                            theme={userSettings.editorTheme}
                            onMount={handleEditorDidMount}
                            options={{
                                cursorBlinking: "smooth",
                                automaticLayout: true,
                                fontSize: userSettings.editorFontSize,
                                minimap: { enabled: userSettings.minimapEnabled },
                                wordWrap: userSettings.wordWrap
                            }}
                        />
                    </div>
                </Resizable>
                
                <div className="flex flex-col flex-grow bg-gray-800">
                    <div className="bg-gray-700 p-1">
                        <div className="flex">
                            <button 
                                className={`px-4 py-2 flex items-center ${activeTab === 'io' ? 'bg-gray-800 text-white' : 'bg-gray-700 text-gray-300'}`}
                                onClick={() => setActiveTab('io')}
                            >
                                <FaCode className="mr-2" /> {currLang.id === 'latex' ? 'PDF/Logs' : 'Input/Output'}
                            </button>
                            <button 
                                className={`px-4 py-2 flex items-center ${activeTab === 'chat' ? 'bg-gray-800 text-white' : 'bg-gray-700 text-gray-300'}`}
                                onClick={() => setActiveTab('chat')}
                            >
                                <FaComment className="mr-2" /> Chat
                            </button>
                            <button 
                                className={`px-4 py-2 flex items-center ${activeTab === 'video' ? 'bg-gray-800 text-white' : 'bg-gray-700 text-gray-300'}`}
                                onClick={() => setActiveTab('video')}
                            >
                                <FaVideo className="mr-2" /> Video
                            </button>
                            {currLang.id === 'latex' && compilationResult.pdfBase64 && (
                                <button 
                                    className={`px-4 py-2 flex items-center ${activeTab === 'pdf' ? 'bg-gray-800 text-white' : 'bg-gray-700 text-gray-300'}`}
                                    onClick={() => setActiveTab('pdf')}
                                >
                                    <FaFilePdf className="mr-2" /> PDF Preview
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-grow overflow-hidden">
                        {activeTab === 'io' && (
                            <div className="flex flex-col h-full p-4 gap-4">
                                {currLang.id === 'latex' ? (
                                    <div className="flex-1 flex flex-col">
                                        <h1 className="text-white font-bold text-xl mb-2">LaTeX Compilation Log</h1>
                                        <div className="flex-1 bg-gray-900 text-gray-300 p-4 rounded overflow-auto font-mono text-sm whitespace-pre-wrap">
                                            {compilationResult.log || compilationResult.stderr || compilationResult.compile_output || 'Compile to see LaTeX logs'}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1">
                                            <InputWindow setInput={setInput} />
                                        </div>
                                        <div className="flex-1">
                                            <h1 className="text-white font-bold text-xl mb-2">Output</h1>
                                            <OutputWindow outputDetails={compilationResult} />
                                        </div>
                                        <div>
                                            <OutputDetails outputDetails={compilationResult} />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        
                        {activeTab === 'pdf' && compilationResult.pdfBase64 && (
                            <div className="flex-1 flex flex-col h-full p-4">
                                <h1 className="text-white font-bold text-xl mb-2">PDF Preview</h1>
                                <div className="flex-1 bg-white rounded overflow-auto">
                                    <iframe 
                                        src={`data:application/pdf;base64,${compilationResult.pdfBase64}#toolbar=0&navpanes=0&scrollbar=0`}
                                        className="w-full h-full"
                                        title="PDF Preview"
                                    />
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
                                    yDoc={yDoc}
                                    provider={provider}
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

            {/* Save File Dialog */}
            {showSaveDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-4">Save File</h3>
                        
                        <div className="mb-4">
                            <label className="block text-gray-300 mb-2">File Name</label>
                            <input
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                                placeholder="Enter file name"
                            />
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-gray-300 mb-2">File Type</label>
                            <div className="bg-gray-700 text-white p-2 rounded">
                                {`.${getFileExtension(currLang.id)}`} (based on current language)
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowSaveDialog(false)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveWithName}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white flex items-center"
                            >
                                <FaFileDownload className="mr-2" /> Save File
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedCodeEditor;
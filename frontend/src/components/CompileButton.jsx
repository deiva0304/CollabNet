import { React, useState } from 'react';
import axios from 'axios';

const currStatus = ['Running', 'Running.', 'Running..', 'Running...'];
const regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;

function CompileButton({ content, langauge, input, setOutput }) {
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState('Compile and Execute');

    let intervalId;
    let statusChange = 0;

    function hasNonLatin1Characters(str) {
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            if (charCode > 255) {
                return true;
            }
        }
        return false;
    }

    function statusUpdate() {
        setStatus(currStatus[statusChange % currStatus.length]);
        statusChange++;
    }

    function startInterval() {
        intervalId = setInterval(statusUpdate, 300);
    }
    
    function stopInterval() {
        clearInterval(intervalId);
        setStatus(langauge.id === 'latex' ? 'Compile PDF' : 'Compile and Execute');
    }

    function mapLanguageId(languageId) {
        const languageMap = {
            'cpp': 'cpp',
            'cpp14': 'cpp',
            'cpp17': 'cpp',
            'c': 'c',
            'python': 'python',
            'python2': 'python',
            'python3': 'python',
            'java': 'java',
            'javascript': 'javascript',
            'typescript': 'typescript',
            'go': 'go',
            'ruby': 'ruby',
            'swift': 'swift',
            'php': 'php',
            'kotlin': 'kotlin',
            'rust': 'rust',
            'scala': 'scala',
            'r': 'r',
            'bash': 'bash',
            'latex': 'latex'
        };
        
        return languageMap[languageId] || null;
    }

    async function compileCode() {
        if (!content.current) {
            alert('Editor not ready yet');
            return;
        }

        setProcessing(true);
        const sourceCode = content.current.getValue().replace(regex, '');

        if (!sourceCode || hasNonLatin1Characters(sourceCode)) {
            alert('Cannot compile. Code editor either contains special characters or is empty.');
            setProcessing(false);
            return;
        }

        const mappedLanguage = mapLanguageId(langauge.id);
        
        if (!mappedLanguage) {
            alert(`Language ${langauge.value} is not supported.`);
            setProcessing(false);
            return;
        }

        startInterval();
        
        try {
            const baseUrl = 'http://localhost:5000';
            // Ensure we're using HTTP/HTTPS, not WebSocket (ws://)
            const apiUrl = baseUrl.startsWith('ws') ? 
                baseUrl.replace('ws', 'http') : 
                baseUrl;

            // Prepare request data
            const requestData = {
                language: mappedLanguage,
                code: sourceCode
            };

            // Only include input for non-LaTeX languages
            if (mappedLanguage !== 'latex') {
                requestData.input = input;
            }

            console.log('Sending compilation request:', requestData); // Debug log

            const response = await axios.post(
                `${apiUrl}/api/compile`,
                requestData,
                { 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 30000 // Increase timeout for LaTeX compilation
                }
            );

            console.log('Received response:', response.data); // Debug log

            // Handle response
            if (mappedLanguage === 'latex') {
                if (!response.data.pdfBase64) {
                    throw new Error('LaTeX compilation failed - no PDF generated');
                }
                
                setOutput({
                    status: response.data.success ? 'success' : 'error',
                    pdfBase64: response.data.pdfBase64,
                    log: response.data.log || response.data.compile_output || response.data.stderr || 'LaTeX compilation log',
                    stderr: response.data.stderr || '',
                    output: '' // LaTeX doesn't have regular output
                });
            } else {
                setOutput({
                    status: response.data.success ? 'success' : 'error',
                    output: response.data.output || '',
                    memory: response.data.memory || '0',
                    time: response.data.time || '0',
                    stderr: response.data.stderr || '',
                    compile_output: response.data.compile_output || ''
                });
            }

        } catch (err) {
            console.error("Compilation error:", err);
            
            // Enhanced error handling for LaTeX
            const errorMessage = mappedLanguage === 'latex' 
                ? 'LaTeX compilation failed. Check logs for details.'
                : 'Compilation failed';
                
            const errorDetails = err.response?.data?.message || err.message;
            const errorLog = err.response?.data?.log || 
                            err.response?.data?.compile_output || 
                            err.response?.data?.stderr || 
                            'No additional error information available';

            setOutput({
                status: 'error',
                output: errorMessage,
                stderr: errorDetails,
                log: errorLog,
                pdfBase64: null
            });
        } finally {
            setProcessing(false);
            stopInterval();
        }
    }

    return (
        <button 
            aria-label="Compile Button" 
            className={`flex justify-center items-center w-52 mr-1 relative px-5 py-1 overflow-hidden border rounded group ${
                processing ? 'border-gray-500 cursor-not-allowed' : 'border-black hover:border-gray-600'
            }`}
            disabled={processing} 
            onClick={compileCode}
        >
            <span className="absolute top-0 left-0 w-0 h-0 transition-all duration-200 border-t-2 border-gray-600 group-hover:w-full ease"></span>
            <span className="absolute bottom-0 right-0 w-0 h-0 transition-all duration-200 border-b-2 border-gray-600 group-hover:w-full ease"></span>
            <span className="absolute top-0 left-0 w-full h-0 transition-all duration-300 delay-200 bg-gray-600 group-hover:h-full ease"></span>
            <span className="absolute bottom-0 left-0 w-full h-0 transition-all duration-300 delay-200 bg-gray-600 group-hover:h-full ease"></span>
            <span className="absolute inset-0 w-full h-full duration-300 delay-300 bg-gray-900 opacity-0 group-hover:opacity-100"></span>
            <span className="relative transition-colors duration-300 delay-200 group-hover:text-white ease">
                {langauge.id === 'latex' ? (status === 'Compile and Execute' ? 'Compile PDF' : status) : status}
            </span>
        </button>
    );
}

export default CompileButton;
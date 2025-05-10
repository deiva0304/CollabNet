import React, { useEffect, useRef, useState } from 'react';
import { Camera, Mic, MicOff, Video, VideoOff } from 'lucide-react';

const VideoConference = ({ roomID, videoEnabled, audioEnabled, currentUser }) => {
  const [peers, setPeers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const peerStreams = useRef({});

  useEffect(() => {
    // Initialize WebRTC when component mounts
    const initializeMedia = async () => {
      try {
        if (videoEnabled || audioEnabled) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: videoEnabled, 
            audio: audioEnabled
          });
          
          setLocalStream(stream);
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          
          // Here we would connect to a signaling server
          // and establish peer connections
          initializeSignalingConnection();
        } else {
          // If both video and audio are disabled, stop any existing stream
          if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
          }
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    initializeMedia();

    // Cleanup function
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Clean up peer connections
      Object.values(peerConnections.current).forEach(connection => {
        connection.close();
      });
      
      // Disconnect from signaling server
      disconnectFromSignalingServer();
    };
  }, [videoEnabled, audioEnabled]);

  const initializeSignalingConnection = () => {
    // This would typically connect to a WebSocket server for signaling
    console.log(`Initializing signaling connection for room: ${roomID}`);
    
    // Simulate some peers for demonstration
    setPeers([
      { id: 'peer1', name: 'Alice', hasVideo: true, hasAudio: true },
      { id: 'peer2', name: 'Bob', hasVideo: false, hasAudio: true },
    ]);
  };

  const disconnectFromSignalingServer = () => {
    console.log('Disconnecting from signaling server');
    setPeers([]);
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !videoTracks[0].enabled;
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 p-4">
      <h2 className="text-white text-lg mb-4">Video Conference - Room: {roomID}</h2>
      
      <div className="flex flex-wrap gap-4 flex-grow">
        {/* Local video */}
        {(videoEnabled || audioEnabled) && (
          <div className="relative bg-gray-800 rounded-lg overflow-hidden w-64 h-48">
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline
              className={`w-full h-full object-cover ${!videoEnabled ? 'hidden' : ''}`}
            />
            
            {!videoEnabled && (
              <div className="flex items-center justify-center w-full h-full">
                <div className="bg-blue-600 rounded-full p-4">
                  <span className="text-2xl text-white font-bold">
                    {currentUser?.name?.charAt(0) || 'Y'}
                  </span>
                </div>
              </div>
            )}
            
            <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-70 px-2 py-1 rounded text-white text-sm">
              {currentUser?.name || 'You'} (You)
            </div>
            
            <div className="absolute bottom-2 right-2 flex space-x-1">
              {!audioEnabled && (
                <div className="bg-red-500 p-1 rounded-full">
                  <MicOff size={16} />
                </div>
              )}
              {!videoEnabled && (
                <div className="bg-red-500 p-1 rounded-full">
                  <VideoOff size={16} />
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Peer videos */}
        {peers.map(peer => (
          <div key={peer.id} className="relative bg-gray-800 rounded-lg overflow-hidden w-64 h-48">
            {peer.hasVideo ? (
              <div className="w-full h-full bg-gray-700"></div> // Placeholder for peer video
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <div className="bg-green-600 rounded-full p-4">
                  <span className="text-2xl text-white font-bold">
                    {peer.name.charAt(0)}
                  </span>
                </div>
              </div>
            )}
            
            <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-70 px-2 py-1 rounded text-white text-sm">
              {peer.name}
            </div>
            
            <div className="absolute bottom-2 right-2 flex space-x-1">
              {!peer.hasAudio && (
                <div className="bg-red-500 p-1 rounded-full">
                  <MicOff size={16} />
                </div>
              )}
              {!peer.hasVideo && (
                <div className="bg-red-500 p-1 rounded-full">
                  <VideoOff size={16} />
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Message when no video or audio is enabled */}
        {!videoEnabled && !audioEnabled && peers.length === 0 && (
          <div className="flex-grow flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p>Video and audio are disabled</p>
              <p className="text-sm mt-2">Enable video or audio from the header controls to start</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="flex justify-center mt-4 space-x-4">
        <button 
          onClick={toggleVideo} 
          className={`p-3 rounded-full ${videoEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
          disabled={!videoEnabled}
        >
          {videoEnabled ? <Video className="text-white" /> : <VideoOff className="text-gray-400" />}
        </button>
        
        <button 
          onClick={toggleAudio} 
          className={`p-3 rounded-full ${audioEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
          disabled={!audioEnabled}
        >
          {audioEnabled ? <Mic className="text-white" /> : <MicOff className="text-gray-400" />}
        </button>
      </div>
    </div>
  );
};

export default VideoConference;
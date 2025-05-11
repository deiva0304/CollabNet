import React, { useEffect, useRef, useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaDesktop, FaExpand } from 'react-icons/fa';

const VideoConference = ({ roomID, videoEnabled, audioEnabled, currentUser }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [screenSharingStream, setScreenSharingStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [fullscreenVideo, setFullscreenVideo] = useState(null);
  const [socket, setSocket] = useState(null);
  const [peers, setPeers] = useState([]);

  const localVideoRef = useRef(null);
  const peerConnections = useRef({});

  // Initialize socket connection
  useEffect(() => {
    // Make sure we use a proper WebSocket URL format
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/rtc/${roomID}`);
    
    setSocket(ws);

    ws.onopen = () => {
      console.log('Connected to signaling server');
      // Announce ourselves to the room when we connect
      ws.send(JSON.stringify({
        type: 'join',
        roomId: roomID,
        userId: currentUser?.id || Date.now().toString()
      }));
    };

    ws.onclose = () => {
      console.log('Disconnected from signaling server');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'leave',
          roomId: roomID,
          userId: currentUser?.id || Date.now().toString()
        }));
        ws.close();
      }
    };
  }, [roomID, currentUser]);

  // Handle incoming socket messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message.type);
        
        switch (message.type) {
          case 'new-peer':
            handleNewPeer(message.peerId);
            break;
          case 'offer':
            await handleOffer(message);
            break;
          case 'answer':
            await handleAnswer(message);
            break;
          case 'ice-candidate':
            await handleICECandidate(message);
            break;
          case 'peer-disconnected':
            handlePeerDisconnected(message.peerId);
            break;
          case 'existing-peers':
            handleExistingPeers(message.peers);
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    };

    socket.onmessage = handleMessage;

    return () => {
      if (socket) {
        socket.onmessage = null;
      }
    };
  }, [socket]);

  // Setup media streams when video/audio enabled changes
  useEffect(() => {
    const setupStream = async () => {
      try {
        await setupMediaStream();
      } catch (error) {
        console.error('Error setting up media stream:', error);
      }
    };
    
    setupStream();
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, [videoEnabled, audioEnabled]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up all peer connections
      Object.values(peerConnections.current).forEach(pc => {
        if (pc && typeof pc.close === 'function') {
          pc.close();
        }
      });
      
      // Stop all local media tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Stop screen sharing if active
      if (screenSharingStream) {
        screenSharingStream.getTracks().forEach(track => track.stop());
      }
      
      // Close socket connection
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  const setupMediaStream = async () => {
    try {
      // Stop existing tracks first
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      
      if (videoEnabled || audioEnabled) {
        console.log(`Getting user media - video: ${videoEnabled}, audio: ${audioEnabled}`);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled,
          audio: audioEnabled
        });
        
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Update tracks in existing peer connections
        Object.entries(peerConnections.current).forEach(([peerId, pc]) => {
          if (!pc) return;
          
          // Get current senders
          const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          const audioSender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
          
          // Handle video track
          if (videoEnabled) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
              if (videoSender) {
                console.log(`Replacing video track for peer ${peerId}`);
                videoSender.replaceTrack(videoTrack);
              } else {
                console.log(`Adding new video track for peer ${peerId}`);
                pc.addTrack(videoTrack, stream);
              }
            }
          } else if (videoSender && videoSender.track) {
            videoSender.track.enabled = false;
          }
          
          // Handle audio track
          if (audioEnabled) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
              if (audioSender) {
                console.log(`Replacing audio track for peer ${peerId}`);
                audioSender.replaceTrack(audioTrack);
              } else {
                console.log(`Adding new audio track for peer ${peerId}`);
                pc.addTrack(audioTrack, stream);
              }
            }
          } else if (audioSender && audioSender.track) {
            audioSender.track.enabled = false;
          }
        });
        
        // Renegotiate connections if needed
        for (const peerId in peerConnections.current) {
          await renegotiateConnection(peerId);
        }
      } else {
        // If both video and audio are disabled, ensure local view is cleared
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const renegotiateConnection = async (peerId) => {
    const pc = peerConnections.current[peerId];
    if (!pc) return;
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.send(JSON.stringify({
        type: 'offer',
        offer: pc.localDescription,
        to: peerId,
        from: currentUser?.id || 'local-user'
      }));
    } catch (err) {
      console.error(`Error renegotiating with peer ${peerId}:`, err);
    }
  };

  const handleNewPeer = (peerId) => {
    console.log(`New peer joined: ${peerId}`);
    createPeerConnection(peerId, true);
  };

  const handleExistingPeers = (peerIds) => {
    console.log(`Existing peers: ${peerIds.join(', ')}`);
    setPeers(peerIds);
    peerIds.forEach(peerId => createPeerConnection(peerId, true));
  };

  const handleOffer = async (message) => {
    console.log(`Received offer from ${message.from}`);
    
    try {
      const pc = createPeerConnection(message.from, false);
      
      // Make sure remote description is set before creating an answer
      await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.send(JSON.stringify({
        type: 'answer',
        answer: answer,
        to: message.from,
        from: currentUser?.id || 'local-user'
      }));
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (message) => {
    console.log(`Received answer from ${message.from}`);
    
    try {
      const pc = peerConnections.current[message.from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
      } else {
        console.warn(`No peer connection found for ${message.from}`);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleICECandidate = async (message) => {
    try {
      const pc = peerConnections.current[message.from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
      } else {
        console.warn(`No peer connection found for ${message.from} when handling ICE candidate`);
      }
    } catch (e) {
      console.error('Error adding ICE candidate:', e);
    }
  };

  const handlePeerDisconnected = (peerId) => {
    console.log(`Peer disconnected: ${peerId}`);
    
    // Close the peer connection
    if (peerConnections.current[peerId]) {
      peerConnections.current[peerId].close();
      delete peerConnections.current[peerId];
    }
    
    // Remove the stream from state
    setRemoteStreams(prev => {
      const newRemoteStreams = {...prev};
      delete newRemoteStreams[peerId];
      return newRemoteStreams;
    });
    
    // Remove from peers list
    setPeers(prev => prev.filter(id => id !== peerId));
    
    // Exit fullscreen if this was the fullscreen video
    if (fullscreenVideo === peerId) {
      setFullscreenVideo(null);
    }
  };

  const createPeerConnection = (peerId, isInitiator) => {
    // Check if we already have a connection to this peer
    if (peerConnections.current[peerId]) {
      return peerConnections.current[peerId];
    }
    
    console.log(`Creating ${isInitiator ? 'initiator' : 'receiver'} peer connection for ${peerId}`);
    
    // Configure ICE servers - include TURN servers for improved NAT traversal
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
        // Add TURN servers here if available - they are important for reliable connections
      ],
      iceCandidatePoolSize: 10
    });
    
    // Store the connection
    peerConnections.current[peerId] = pc;
    
    // Add existing local tracks to the peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track to peer connection for ${peerId}`);
        pc.addTrack(track, localStream);
      });
    }
    
    // Add screen sharing track if it exists
    if (screenSharingStream) {
      screenSharingStream.getTracks().forEach(track => {
        console.log(`Adding screen sharing track to peer connection for ${peerId}`);
        pc.addTrack(track, screenSharingStream);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${peerId}`);
        socket.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: peerId,
          from: currentUser?.id || 'local-user'
        }));
      }
    };
    
    // Log ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${peerId}: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === 'disconnected' || 
          pc.iceConnectionState === 'failed' ||
          pc.iceConnectionState === 'closed') {
        handlePeerDisconnected(peerId);
      }
    };
    
    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log(`Received ${event.track.kind} track from ${peerId}`);
      
      // Clone the stream to avoid issues with multiple video elements
      setRemoteStreams(prev => {
        // Create a new MediaStream if one doesn't exist for this peer
        if (!prev[peerId]) {
          const newStream = new MediaStream();
          newStream.addTrack(event.track);
          return { ...prev, [peerId]: newStream };
        } else {
          // Check if the track already exists in the stream
          const existingTrack = prev[peerId].getTracks().find(t => t.kind === event.track.kind);
          if (existingTrack) {
            prev[peerId].removeTrack(existingTrack);
          }
          
          // Add the new track
          prev[peerId].addTrack(event.track);
          // Create a new state object to trigger a re-render
          return { ...prev };
        }
      });
    };
    
    // Handle negotiation needed event
    pc.onnegotiationneeded = async () => {
      try {
        console.log(`Negotiation needed for peer ${peerId}`);
        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          socket.send(JSON.stringify({
            type: 'offer',
            offer: pc.localDescription,
            to: peerId,
            from: currentUser?.id || 'local-user'
          }));
        }
      } catch (err) {
        console.error('Error during negotiation:', err);
      }
    };
    
    // Create and send offer if we're the initiator
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          console.log(`Sending offer to ${peerId}`);
          socket.send(JSON.stringify({
            type: 'offer',
            offer: pc.localDescription,
            to: peerId,
            from: currentUser?.id || 'local-user'
          }));
        })
        .catch(error => console.error('Error creating offer:', error));
    }
    
    return pc;
  };

  const startScreenSharing = async () => {
    try {
      // Request screen sharing
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false // Most browsers don't support audio in getDisplayMedia
      });
      
      // Stop previous screen sharing if active
      if (screenSharingStream) {
        screenSharingStream.getTracks().forEach(track => track.stop());
      }
      
      // Save the new stream
      setScreenSharingStream(stream);
      setIsScreenSharing(true);
      
      // Show screen in local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Replace video tracks in all peer connections
      Object.values(peerConnections.current).forEach(pc => {
        const senders = pc.getSenders();
        const sender = senders.find(s => s.track && s.track.kind === 'video');
        
        if (sender) {
          console.log('Replacing video track with screen sharing track');
          sender.replaceTrack(stream.getVideoTracks()[0]);
        } else {
          console.log('Adding screen sharing track');
          pc.addTrack(stream.getVideoTracks()[0], stream);
        }
      });
      
      // Handle when user stops screen sharing
      stream.getVideoTracks()[0].onended = () => {
        stopScreenSharing();
      };
    } catch (error) {
      console.error('Error starting screen sharing:', error);
    }
  };

  const stopScreenSharing = () => {
    // Stop all tracks in the screen sharing stream
    if (screenSharingStream) {
      screenSharingStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    
    setScreenSharingStream(null);
    setIsScreenSharing(false);
    
    // Restore camera view if active
    if (localStream && localStream.getVideoTracks().length > 0 && videoEnabled) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      
      // Replace screen sharing tracks with camera tracks in all peer connections
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && localStream.getVideoTracks()[0]) {
          console.log('Replacing screen sharing track with camera track');
          sender.replaceTrack(localStream.getVideoTracks()[0]);
        }
      });
    } else if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  const toggleFullscreen = (videoId) => {
    setFullscreenVideo(fullscreenVideo === videoId ? null : videoId);
  };

  // Debug utility to show active connections
  const getActiveConnections = () => {
    return Object.keys(remoteStreams).length;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-xl font-bold">Video Conference: {roomID}</h2>
        <div className="flex space-x-2">
          <button
            onClick={isScreenSharing ? stopScreenSharing : startScreenSharing}
            className={`p-2 rounded-full ${isScreenSharing ? 'bg-red-600' : 'bg-blue-600'} text-white`}
            title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
            disabled={!videoEnabled && !isScreenSharing}
          >
            <FaDesktop />
          </button>
          <span className="text-white text-sm">
            {getActiveConnections()} active connections
          </span>
        </div>
      </div>
      
      {/* Video grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${fullscreenVideo ? 'hidden' : 'block'}`}>
        {/* Local video */}
        {(videoEnabled || isScreenSharing) && (
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-sm px-2 py-1 rounded">
              {currentUser?.name || 'You'} (You)
            </div>
            <div className="absolute bottom-2 right-2 flex space-x-2">
              <button
                onClick={() => toggleFullscreen('local')}
                className="p-1 rounded-full bg-gray-700 text-white"
                title="Fullscreen"
              >
                <FaExpand size={14} />
              </button>
            </div>
          </div>
        )}
        
        {/* Remote videos */}
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <div key={peerId} className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              ref={el => {
                if (el && stream) {
                  // Only set srcObject if it's different
                  if (el.srcObject !== stream) {
                    el.srcObject = stream;
                  }
                }
              }}
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-sm px-2 py-1 rounded">
              Peer {peerId.substring(0, 6)}
            </div>
            <div className="absolute bottom-2 right-2 flex space-x-2">
              <button
                onClick={() => toggleFullscreen(peerId)}
                className="p-1 rounded-full bg-gray-700 text-white"
                title="Fullscreen"
              >
                <FaExpand size={14} />
              </button>
            </div>
          </div>
        ))}
        
        {/* Placeholder if no videos */}
        {!videoEnabled && !isScreenSharing && Object.keys(remoteStreams).length === 0 && (
          <div className="flex items-center justify-center aspect-video bg-gray-800 rounded-lg col-span-full">
            <p className="text-gray-400 text-center">
              No video streams available.
              <br />
              Enable your camera or start screen sharing.
            </p>
          </div>
        )}
      </div>
      
      {/* Fullscreen video */}
      {fullscreenVideo && (
        <div className="relative bg-black rounded-lg overflow-hidden flex-1">
          {fullscreenVideo === 'local' ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              ref={el => {
                if (el && remoteStreams[fullscreenVideo]) {
                  el.srcObject = remoteStreams[fullscreenVideo];
                }
              }}
            />
          )}
          <div className="absolute top-2 right-2">
            <button
              onClick={() => toggleFullscreen(null)}
              className="p-2 rounded-full bg-gray-700 text-white"
              title="Exit Fullscreen"
            >
              <FaExpand />
            </button>
          </div>
        </div>
      )}
      
      {/* Audio only participants */}
      {!videoEnabled && audioEnabled && (
        <div className="mt-4">
          <h3 className="text-white font-bold mb-2">Audio Participants</h3>
          <div className="flex items-center space-x-2 bg-gray-800 p-3 rounded-lg">
            <div className="bg-blue-600 p-2 rounded-full text-white">
              <FaMicrophone />
            </div>
            <span className="text-white">{currentUser?.name || 'You'} (You)</span>
          </div>
          
          {/* Audio-only remote peers */}
          {Object.entries(remoteStreams)
            .filter(([_, stream]) => stream.getAudioTracks().length > 0 && stream.getVideoTracks().length === 0)
            .map(([peerId, _]) => (
              <div key={peerId} className="flex items-center space-x-2 bg-gray-800 p-3 rounded-lg mt-2">
                <div className="bg-green-600 p-2 rounded-full text-white">
                  <FaMicrophone />
                </div>
                <span className="text-white">Peer {peerId.substring(0, 6)}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

export default VideoConference;
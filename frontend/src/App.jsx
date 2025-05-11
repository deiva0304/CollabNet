import { useState, useEffect, React, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import ShortUniqueId from 'short-unique-id';
import { Analytics } from '@vercel/analytics/react';

const EnhancedCodeEditor = lazy(() => import('./pages/EnhancedCodeEditor'));
const RoomSelector = lazy(() => import('./components/RoomSelector'));

const uuid = new ShortUniqueId({ length: 6 });

const loadingScreen = (
  <div className="flex items-center justify-center h-screen">
    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
        Loading...
      </span>
    </div>
  </div>
);

function App() {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('coderoom-username');
    if (savedName) {
      setUserName(savedName);
    } else {
      const name = prompt("Please enter your name (under 10 characters)") || `User${Math.floor(Math.random() * 1000)}`;
      const trimmedName = name.trim().slice(0, 10);
      localStorage.setItem('coderoom-username', trimmedName);
      setUserName(trimmedName);
    }
  }, []);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route
            path="/:roomId"
            element={
              <Suspense fallback={loadingScreen}>
                <EnhancedCodeEditorWrapper 
                  userName={userName}
                  setUserName={setUserName}
                />
              </Suspense>
            }
          />
          <Route
            path="/"
            element={
              <Suspense fallback={loadingScreen}>
                <RoomSelector 
                  userName={userName}
                  setUserName={setUserName}
                />
              </Suspense>
            }
          />
        </Routes>
      </BrowserRouter>
      <Analytics />
    </>
  );
}

function EnhancedCodeEditorWrapper({ userName, setUserName }) {
  const navigate = useNavigate();
  const { roomId } = useParams();
  
  // Validate room ID format
  useEffect(() => {
    if (!roomId || roomId.length !== 6) {
      const newRoomID = uuid();
      navigate(`/${newRoomID}`, { replace: true });
    }
  }, [roomId, navigate]);

  const handleLeaveRoom = () => {
    navigate('/');
  };

  // Only render the editor component when we have a valid room ID
  // The key prop ensures the component is completely re-mounted when the room changes
  return roomId && roomId.length === 6 ? (
    <EnhancedCodeEditor 
      key={roomId}
      roomID={roomId} 
      userName={userName}
      setUserName={setUserName}
      onLeaveRoom={handleLeaveRoom}
    />
  ) : loadingScreen;
}

export default App;
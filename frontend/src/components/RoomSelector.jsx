import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ShortUniqueId from 'short-unique-id';

const uuid = new ShortUniqueId({ length: 6 });

const RoomSelector = ({ userName, setUserName }) => {
  const navigate = useNavigate();
  const [roomInput, setRoomInput] = useState('');
  const [error, setError] = useState('');

  const handleCreateRoom = () => {
    const newRoomID = uuid();
    navigate(`/${newRoomID}`);
  };

  const handleJoinRoom = () => {
    const roomID = roomInput.trim();
    
    if (!roomID) {
      setError('Please enter a room ID');
      return;
    }
    
    if (roomID.length !== 6) {
      setError('Room ID should be 6 characters long');
      return;
    }
    
    navigate(`/${roomID}`);
  };

  const handleNameChange = (e) => {
    const newName = e.target.value.slice(0, 10);
    setUserName(newName);
    localStorage.setItem('coderoom-username', newName);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-48"
          />
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-6">Welcome to CollabNet</h1>
        
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-bold mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={userName}
            onChange={handleNameChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter your name"
            maxLength={10}
          />
        </div>
        
        <div className="mb-6">
          <button
            onClick={handleCreateRoom}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full mb-4"
          >
            Create New Room
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">OR</span>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-bold mb-2">
            Join Existing Room
          </label>
          <div className="flex">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => {
                setError('');
                setRoomInput(e.target.value);
              }}
              className="shadow appearance-none border rounded-l w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter room ID"
            />
            <button
              onClick={handleJoinRoom}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-r focus:outline-none focus:shadow-outline"
            >
              Join
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-xs italic mt-2">{error}</p>
          )}
        </div>
        
        <div className="text-center text-gray-400 text-sm">
          <p>Real-time collaborative code editor</p>
          <p className="mt-2">© 2025 CollabNet</p>
        </div>
      </div>
    </div>
  );
};

export default RoomSelector;
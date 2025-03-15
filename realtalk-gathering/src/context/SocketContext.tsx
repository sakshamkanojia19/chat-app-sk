
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

// Socket context type definition
interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
}

// Create context
const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Provider component
export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    setConnecting(true);

    // Connect to the Socket.IO server
    const socketUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : 'http://localhost:5000';
    
    console.log('Connecting to socket server at:', socketUrl);
    
    const newSocket = io(socketUrl, {
      auth: {
        token
      },
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    setSocket(newSocket);

    const handleConnect = () => {
      console.log('Socket connected successfully');
      setConnected(true);
      setConnecting(false);
      toast.success('Connected to chat server');
    };

    const handleDisconnect = (reason: string) => {
      console.log('Socket disconnected. Reason:', reason);
      setConnected(false);
      toast.error('Disconnected from chat server');
    };

    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error);
      setConnecting(false);
      toast.error('Connection error: ' + (error.message || 'Unknown error'));
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);
    
    // Handle friend requests via socket
    newSocket.on('new_friend_request', (data) => {
      console.log('New friend request received:', data);
      toast.info(`New friend request from ${data.user.name}`);
    });
    
    // Handle friend request responses
    newSocket.on('friend_request_response', (data) => {
      console.log('Friend request response received:', data);
      const message = data.accepted 
        ? `${data.user?.name || 'Someone'} accepted your friend request` 
        : `${data.user?.name || 'Someone'} declined your friend request`;
      
      toast.info(message);
    });

    // Handle user status changes
    newSocket.on('user_status_change', (data) => {
      console.log('User status changed:', data);
    });

    // Handle new messages (even when not in chat window)
    newSocket.on('message_received', (data) => {
      console.log('New message received:', data);
      if (data.sender.name) {
        toast.info(`New message from ${data.sender.name}`);
      }
    });

    // Cleanup on component unmount
    return () => {
      console.log('Cleaning up socket connection');
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('new_friend_request');
      newSocket.off('friend_request_response');
      newSocket.off('user_status_change');
      newSocket.off('message_received');
      newSocket.disconnect();
    };
  }, [user, token]);

  return (
    <SocketContext.Provider value={{ socket, connected, connecting }}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook for using the socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

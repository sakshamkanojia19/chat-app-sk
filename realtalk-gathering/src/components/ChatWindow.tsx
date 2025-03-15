
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { Send, Phone, Video, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import axios from 'axios';
import { toast } from 'sonner';

// Message interface to match backend schema
interface Message {
  _id: string;
  sender: string;
  recipient?: string;
  content: string;
  chat?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatWindowProps {
  friend: {
    _id: string;
    name: string;
    avatar: string;
    isOnline: boolean;
  };
}

const ChatWindow = ({ friend }: ChatWindowProps) => {
  const { user, token } = useAuth();
  const { socket, connected } = useSocket();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [friendTyping, setFriendTyping] = useState(false);
  const { ref, inView } = useInView({
    threshold: 1,
  });
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Fetch or create chat when friend changes
  useEffect(() => {
    const accessChat = async () => {
      if (!user || !friend || !token) return;
      
      try {
        setLoading(true);
        
        // Get or create a chat with this friend
        const response = await axios.post(
          `${apiUrl}/chats`,
          { userId: friend._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setChatId(response.data._id);
        
        // Join the chat room via socket
        if (socket && connected) {
          socket.emit('join_chat', response.data._id);
        }
        
        // Fetch messages for this chat
        fetchMessages(response.data._id);
      } catch (error) {
        console.error('Error accessing chat:', error);
        toast.error('Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };
    
    accessChat();
    
    // Cleanup: leave chat room
    return () => {
      if (socket && chatId) {
        socket.emit('leave_chat', chatId);
      }
    };
  }, [user, friend, token, socket, connected]);

  // Fetch messages
  const fetchMessages = async (chatId: string) => {
    if (!token) return;
    
    try {
      const response = await axios.get(
        `${apiUrl}/messages/${chatId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages(response.data);
      
      // Mark messages as read
      axios.put(
        `${apiUrl}/messages/read/${chatId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (newMessage: Message) => {
        if (chatId && newMessage.chat === chatId) {
          setMessages((prev) => [...prev, newMessage]);
          setFriendTyping(false);
          
          if (typingTimeout) {
            clearTimeout(typingTimeout);
          }
          
          // Mark message as read
          if (token) {
            axios.put(
              `${apiUrl}/messages/read/${chatId}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }
      };

      const handleTyping = (data: { chatId: string; user: { _id: string } }) => {
        if (data.chatId === chatId && data.user._id === friend._id) {
          setFriendTyping(true);
          
          if (typingTimeout) {
            clearTimeout(typingTimeout);
          }
          
          const timeout = setTimeout(() => {
            setFriendTyping(false);
          }, 3000);
          
          setTypingTimeout(timeout);
        }
      };

      const handleStopTyping = (data: { chatId: string; user: { _id: string } }) => {
        if (data.chatId === chatId && data.user._id === friend._id) {
          setFriendTyping(false);
          
          if (typingTimeout) {
            clearTimeout(typingTimeout);
          }
        }
      };

      socket.on('message_received', handleNewMessage);
      socket.on('typing', handleTyping);
      socket.on('stop_typing', handleStopTyping);

      return () => {
        socket.off('message_received', handleNewMessage);
        socket.off('typing', handleTyping);
        socket.off('stop_typing', handleStopTyping);
        
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }
      };
    }
  }, [socket, chatId, friend._id, typingTimeout, token]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !user || !connected || !chatId || !token) return;
    
    try {
      const newMessage = {
        content: message,
        chatId: chatId,
      };
      
      setMessage('');
      
      // Send message to server
      const response = await axios.post(
        `${apiUrl}/messages`,
        newMessage,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Add to messages list
      setMessages((prev) => [...prev, response.data]);
      
      // Emit via socket
      if (socket) {
        socket.emit('new_message', response.data);
      }
      
      // Stop typing indicator
      if (socket) {
        socket.emit('stop_typing', chatId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleTyping = () => {
    if (socket && connected && chatId) {
      socket.emit('typing', chatId);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Display loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-10 h-10 border-4 border-t-transparent border-chat-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh]">
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img 
              src={friend.avatar} 
              alt={friend.name} 
              className="w-10 h-10 rounded-full object-cover"
            />
            {friend.isOnline && <span className="status-online"></span>}
          </div>
          <div>
            <h3 className="font-medium text-chat-dark">{friend.name}</h3>
            <p className="text-xs text-gray-500">
              {friend.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button className="p-2 rounded-full hover:bg-gray-100">
            <Phone className="w-5 h-5 text-chat-primary" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100">
            <Video className="w-5 h-5 text-chat-primary" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100">
            <Info className="w-5 h-5 text-chat-primary" />
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.length > 0 ? (
            messages.map((msg, index) => {
              const isSentByMe = msg.sender === user?._id;
              
              return (
                <div 
                  key={msg._id} 
                  ref={index === messages.length - 1 ? ref : undefined}
                  className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={isSentByMe ? 'chat-bubble-sent' : 'chat-bubble-received'}
                  >
                    <p>{msg.content}</p>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {formatTime(msg.createdAt)}
                    </p>
                  </motion.div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 my-8">
              <p>No messages yet</p>
              <p className="text-sm">Start a conversation!</p>
            </div>
          )}
          
          {/* Friend typing indicator */}
          <AnimatePresence>
            {friendTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex justify-start"
              >
                <div className="chat-bubble-received flex items-center space-x-1 py-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleTyping}
            placeholder="Type a message..."
            className="subtle-input flex-grow"
            disabled={!connected || !chatId}
          />
          <button 
            type="submit" 
            className="btn-primary !px-4 !py-3"
            disabled={!connected || !message.trim() || !chatId}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;

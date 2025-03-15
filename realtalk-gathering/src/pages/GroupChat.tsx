
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import Navbar from '@/components/Navbar';
import { 
  MessageCircle, 
  Users, 
  Send, 
  ArrowLeft, 
  PlusCircle, 
  X, 
  Edit,
  Check,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';

// Types
interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
    avatar: string;
  };
  content: string;
  chat: string;
  createdAt: string;
}

interface GroupData {
  _id: string;
  chatName: string;
  isGroupChat: boolean;
  users: Array<{
    _id: string;
    name: string;
    email: string;
    avatar: string;
    isOnline: boolean;
  }>;
  groupAdmin: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

const GroupChat = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { socket, connected } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Check if current user is admin
  useEffect(() => {
    if (groupData && user) {
      setIsAdmin(groupData.groupAdmin._id === user._id);
    }
  }, [groupData, user]);

  // Fetch group data
  useEffect(() => {
    const fetchGroupData = async () => {
      if (!id || !token) return;
      
      try {
        setLoading(true);
        const response = await axios.get(`${apiUrl}/chats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const group = response.data.find((chat: any) => chat._id === id);
        if (group) {
          setGroupData(group);
          setNewGroupName(group.chatName);
          
          // Join the chat room
          if (socket && connected) {
            socket.emit('join_chat', id);
          }
          
          // Fetch messages
          const messagesResponse = await axios.get(`${apiUrl}/messages/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMessages(messagesResponse.data);
        } else {
          toast.error('Group not found');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching group data:', error);
        toast.error('Failed to load group data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroupData();
    
    // Cleanup - leave chat room
    return () => {
      if (socket && connected && id) {
        socket.emit('leave_chat', id);
      }
    };
  }, [id, token, socket, connected, navigate, apiUrl]);

  // Fetch friends for adding to group
  useEffect(() => {
    const fetchFriends = async () => {
      if (!token) return;
      
      try {
        const response = await axios.get(`${apiUrl}/users/friends`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Filter out friends already in the group
        if (groupData) {
          const groupMemberIds = groupData.users.map(u => u._id);
          setFriends(response.data.filter((friend: any) => 
            !groupMemberIds.includes(friend._id)
          ));
        } else {
          setFriends(response.data);
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };
    
    if (isAdmin) {
      fetchFriends();
    }
  }, [token, groupData, isAdmin, apiUrl]);
  
  // Listen for new messages
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (newMsg: Message) => {
      if (newMsg.chat === id) {
        setMessages(prev => [...prev, newMsg]);
      }
    };
    
    socket.on('message_received', handleNewMessage);
    
    return () => {
      socket.off('message_received', handleNewMessage);
    };
  }, [socket, id]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !id || !user || !token) return;
    
    try {
      setSending(true);
      
      const messageData = {
        content: newMessage,
        chatId: id
      };
      
      const response = await axios.post(
        `${apiUrl}/messages`, 
        messageData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNewMessage('');
      
      // Emit message event via socket
      if (socket && connected) {
        socket.emit('new_message', {
          ...response.data,
          chat: { _id: id }
        });
      }
      
      // Add to local messages immediately
      setMessages(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };
  
  const handleAddMembers = async () => {
    if (!isAdmin || selectedFriends.length === 0 || !id || !token) return;
    
    try {
      // Add each friend one by one
      for (const friendId of selectedFriends) {
        await axios.put(
          `${apiUrl}/chats/group/add`,
          { chatId: id, userId: friendId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      toast.success(`Added ${selectedFriends.length} member(s) to the group`);
      
      // Refresh group data
      const response = await axios.get(`${apiUrl}/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedGroup = response.data.find((chat: any) => chat._id === id);
      if (updatedGroup) {
        setGroupData(updatedGroup);
      }
      
      setSelectedFriends([]);
    } catch (error) {
      console.error('Error adding members:', error);
      toast.error('Failed to add members to the group');
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    if (!isAdmin || !id || !token) return;
    
    try {
      await axios.put(
        `${apiUrl}/chats/group/remove`,
        { chatId: id, userId: memberId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Member removed from the group');
      
      // Refresh group data
      const response = await axios.get(`${apiUrl}/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedGroup = response.data.find((chat: any) => chat._id === id);
      if (updatedGroup) {
        setGroupData(updatedGroup);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member from the group');
    }
  };
  
  const handleRenameGroup = async () => {
    if (!isAdmin || !newGroupName.trim() || !id || !token) return;
    
    try {
      await axios.put(
        `${apiUrl}/chats/group/${id}`,
        { chatId: id, chatName: newGroupName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Group name updated successfully');
      
      // Update local state
      if (groupData) {
        setGroupData({
          ...groupData,
          chatName: newGroupName
        });
      }
      
      setEditingName(false);
    } catch (error) {
      console.error('Error renaming group:', error);
      toast.error('Failed to update group name');
    }
  };
  
  const handleLeaveGroup = async () => {
    if (!user || !id || !token) return;
    
    try {
      await axios.put(
        `${apiUrl}/chats/group/remove`,
        { chatId: id, userId: user._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('You have left the group');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave the group');
    }
  };
  
  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-chat-light">
        <Navbar />
        <div className="flex justify-center items-center h-[80vh]">
          <div className="w-12 h-12 border-4 border-chat-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  if (!groupData) {
    return (
      <div className="min-h-screen bg-chat-light">
        <Navbar />
        <div className="flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <p className="text-xl text-gray-600">Group not found</p>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="mt-4 px-4 py-2 bg-chat-primary text-white rounded-lg"
            >
              Go Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-chat-light">
      <Navbar />
      
      <main className="container mx-auto pt-28 pb-10 px-4">
        <div className="glass-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/dashboard')} 
                className="mr-3 p-2 rounded-full hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              {editingName ? (
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1"
                    autoFocus
                  />
                  <button 
                    onClick={handleRenameGroup}
                    className="ml-2 p-1 rounded-full hover:bg-green-100 text-green-600"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingName(false);
                      setNewGroupName(groupData.chatName);
                    }}
                    className="ml-1 p-1 rounded-full hover:bg-red-100 text-red-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold">{groupData.chatName}</h1>
                  {isAdmin && (
                    <button 
                      onClick={() => setEditingName(true)} 
                      className="ml-2 p-1 rounded-full hover:bg-gray-100"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <button className="p-2 rounded-full hover:bg-gray-100">
                  <Info className="w-5 h-5 text-gray-600" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Group Info</DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue="members">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="members">Members ({groupData.users.length})</TabsTrigger>
                    {isAdmin && <TabsTrigger value="add">Add Members</TabsTrigger>}
                  </TabsList>
                  
                  <TabsContent value="members">
                    <ScrollArea className="h-72">
                      <div className="space-y-3 p-2">
                        {groupData.users.map(member => (
                          <div key={member._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center">
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-10 h-10 rounded-full object-cover mr-3"
                              />
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-xs text-gray-500">{member.email}</p>
                              </div>
                            </div>
                            
                            {isAdmin && member._id !== user?._id && (
                              <button
                                onClick={() => handleRemoveMember(member._id)}
                                className="p-1 rounded-full hover:bg-red-100 text-red-600"
                                title="Remove from group"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            )}
                            
                            {member._id === groupData.groupAdmin._id && (
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs">Admin</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={handleLeaveGroup}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Leave Group
                      </button>
                    </div>
                  </TabsContent>
                  
                  {isAdmin && (
                    <TabsContent value="add">
                      <ScrollArea className="h-72">
                        <div className="space-y-3 p-2">
                          {friends.length > 0 ? (
                            friends.map(friend => (
                              <div
                                key={friend._id}
                                onClick={() => toggleFriendSelection(friend._id)}
                                className={`flex items-center p-2 rounded-lg cursor-pointer ${
                                  selectedFriends.includes(friend._id)
                                    ? 'bg-chat-primary bg-opacity-10'
                                    : 'hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedFriends.includes(friend._id)}
                                  onChange={() => {}}
                                  className="mr-3"
                                />
                                <img
                                  src={friend.avatar}
                                  alt={friend.name}
                                  className="w-10 h-10 rounded-full object-cover mr-3"
                                />
                                <div>
                                  <p className="font-medium">{friend.name}</p>
                                  <p className="text-xs text-gray-500">{friend.email}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <p>No friends to add</p>
                              <p className="text-sm">Add friends from the dashboard first</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      
                      <div className="mt-4 flex justify-end gap-2">
                        <DialogClose asChild>
                          <button className="px-4 py-2 border border-gray-300 rounded-lg">
                            Cancel
                          </button>
                        </DialogClose>
                        <button
                          onClick={handleAddMembers}
                          disabled={selectedFriends.length === 0}
                          className="px-4 py-2 bg-chat-primary text-white rounded-lg disabled:opacity-50"
                        >
                          Add Selected
                        </button>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Messages */}
          <div className="h-[calc(100vh-280px)] overflow-y-auto p-4">
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${message.sender._id === user?._id ? 'justify-end' : 'justify-start'}`}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`max-w-[70%] px-4 py-2 rounded-lg ${
                        message.sender._id === user?._id
                          ? 'bg-chat-primary text-white rounded-tr-none'
                          : 'bg-white border rounded-tl-none'
                      }`}
                    >
                      {message.sender._id !== user?._id && (
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          {message.sender.name}
                        </p>
                      )}
                      <p>{message.content}</p>
                      <p className="text-xs text-right mt-1 opacity-70">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </motion.div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">No messages yet</p>
                <p className="text-sm text-gray-400">Be the first to send a message!</p>
              </div>
            )}
          </div>
          
          {/* Message Input */}
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="subtle-input flex-grow"
                placeholder="Type your message..."
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="btn-primary px-4 py-2 disabled:opacity-50"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
      
      {/* Connection status */}
      <div className={`fixed bottom-4 right-4 flex items-center space-x-2 py-2 px-4 rounded-full text-sm ${
        connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>
  );
};

export default GroupChat;

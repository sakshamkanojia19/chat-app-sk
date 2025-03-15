
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import Navbar from '@/components/Navbar';
import ChatWindow from '@/components/ChatWindow';
import FriendList from '@/components/FriendList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, UserPlus, Users } from 'lucide-react';
import FriendRequests from '@/components/FriendRequests';
import GroupList from '@/components/GroupList';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, token } = useAuth();
  const { connected, socket } = useSocket();
  const navigate = useNavigate();
  
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('chats');
  const [loading, setLoading] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Fetch friends and friend requests
  const fetchFriends = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/users/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error('Failed to load friends');
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const response = await axios.get(`${apiUrl}/users/friend-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Transform data to match component requirements
      const formattedRequests = [
        ...response.data.incoming.map(req => ({
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar,
          status: 'incoming'
        })),
        ...response.data.outgoing.map(req => ({
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar,
          status: 'outgoing'
        }))
      ];
      
      setFriendRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast.error('Failed to load friend requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${apiUrl}/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter only group chats
      const groups = response.data
        .filter(chat => chat.isGroupChat)
        .map(chat => ({
          _id: chat._id,
          name: chat.chatName,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.chatName)}&background=random`,
          members: chat.users.length,
          lastMessage: chat.lastMessage?.content || 'No messages yet'
        }));
      
      setGroups(groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  // Initial data fetching
  useEffect(() => {
    if (token) {
      fetchFriends();
      fetchFriendRequests();
      fetchGroups();
    }
  }, [token]);

  // Listen for socket events related to friend requests
  useEffect(() => {
    if (socket) {
      socket.on('new_friend_request', () => {
        fetchFriendRequests();
        toast.info('You have a new friend request!');
      });

      socket.on('friend_request_response', (data) => {
        fetchFriends();
        fetchFriendRequests();
        
        if (data.accepted) {
          toast.success('Friend request accepted!');
        } else {
          toast.info('Friend request declined');
        }
      });

      return () => {
        socket.off('new_friend_request');
        socket.off('friend_request_response');
      };
    }
  }, [socket]);

  const handleFriendSelect = (friend: any) => {
    setSelectedFriend(friend);
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      await axios.post(
        `${apiUrl}/users/accept-request`,
        { userId: requestId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Notify via socket
      socket?.emit('friend_request_response', { 
        userId: requestId, 
        accepted: true 
      });
      
      toast.success('Friend request accepted');
      
      // Refresh lists
      fetchFriends();
      fetchFriendRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request');
    }
  };

  const handleRejectFriendRequest = async (requestId: string) => {
    try {
      await axios.post(
        `${apiUrl}/users/reject-request`,
        { userId: requestId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Notify via socket
      socket?.emit('friend_request_response', { 
        userId: requestId, 
        accepted: false 
      });
      
      toast.success('Friend request rejected');
      
      // Refresh list
      fetchFriendRequests();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Failed to reject friend request');
    }
  };

  const handleGroupSelect = (groupId: string) => {
    navigate(`/group/${groupId}`);
  };

  const handleListUpdate = () => {
    fetchFriendRequests();
  };

  return (
    <div className="min-h-screen bg-chat-light">
      <Navbar />
      
      <main className="pt-28 pb-10 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <motion.aside 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full lg:w-80 flex-shrink-0"
            >
              <div className="glass-card p-4 h-full">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="chats" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Chats</span>
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      <span className="hidden sm:inline">Requests</span>
                    </TabsTrigger>
                    <TabsTrigger value="groups" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Groups</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="chats" className="mt-0">
                    <FriendList 
                      friends={friends} 
                      onSelectFriend={handleFriendSelect} 
                      selectedFriendId={selectedFriend?._id}
                      onFriendListUpdate={handleListUpdate}
                    />
                  </TabsContent>
                  
                  <TabsContent value="requests" className="mt-0">
                    <FriendRequests 
                      requests={friendRequests}
                      onAccept={handleAcceptFriendRequest}
                      onReject={handleRejectFriendRequest}
                    />
                  </TabsContent>
                  
                  <TabsContent value="groups" className="mt-0">
                    <GroupList 
                      groups={groups}
                      onSelectGroup={handleGroupSelect}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </motion.aside>
            
            {/* Chat Window */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex-grow glass-card overflow-hidden"
            >
              {selectedFriend ? (
                <ChatWindow friend={selectedFriend} />
              ) : (
                <div className="h-[70vh] flex flex-col items-center justify-center p-8 text-center">
                  <MessageCircle className="w-16 h-16 text-chat-primary opacity-40 mb-4" />
                  <h3 className="text-xl font-medium text-chat-dark mb-2">Start a conversation</h3>
                  <p className="text-gray-500 max-w-md">
                    Select a friend from the list to start chatting or explore groups to join the conversation.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
      
      {/* Connection status indicator */}
      <div className={`fixed bottom-4 right-4 flex items-center space-x-2 py-2 px-4 rounded-full text-sm ${
        connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>
  );
};

export default Dashboard;

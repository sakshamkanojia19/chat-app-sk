
import { useState } from 'react';
import { Search, UserPlus, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

interface Friend {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  isOnline: boolean;
}

interface FriendListProps {
  friends: Friend[];
  onSelectFriend: (friend: Friend) => void;
  selectedFriendId: string | null;
  onFriendListUpdate?: () => void;
}

const FriendList = ({ friends, onSelectFriend, selectedFriendId, onFriendListUpdate }: FriendListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { socket } = useSocket();
  const { token } = useAuth();

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = async () => {
    if (!searchTerm.trim() || !token) return;
    
    try {
      setIsSearching(true);
      
      const response = await axios.get(
        `${apiUrl}/users?search=${searchTerm}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newFriendEmail.trim() || !token) return;
    
    try {
      setLoading(true);
      
      console.log('Sending friend request to:', newFriendEmail);
      
      // Send friend request via API
      const response = await axios.post(
        `${apiUrl}/users/friend-request`,
        { email: newFriendEmail },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Friend request response:', response.data);
      
      if (response.data && response.data.userId) {
        // Notify via socket
        socket?.emit('friend_request', { userId: response.data.userId });
        console.log('Emitted socket event for friend request');
      }
      
      toast.success('Friend request sent successfully');
      setNewFriendEmail('');
      setShowAddFriend(false);
      
      // Refresh the friend list if callback provided
      if (onFriendListUpdate) {
        onFriendListUpdate();
      }
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast.error(error.response?.data?.message || 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // Send friend request via API
      const response = await axios.post(
        `${apiUrl}/users/friend-request`,
        { userId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data && response.data.userId) {
        // Notify via socket
        socket?.emit('friend_request', { userId });
      }
      
      toast.success('Friend request sent successfully');
      
      // Clear search
      setSearchTerm('');
      setSearchResults([]);
      
      // Refresh the friend list if callback provided
      if (onFriendListUpdate) {
        onFriendListUpdate();
      }
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast.error(error.response?.data?.message || 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-chat-dark">Friends</h3>
        <button 
          onClick={() => setShowAddFriend(!showAddFriend)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <UserPlus className="w-5 h-5 text-chat-primary" />
        </button>
      </div>
      
      <AnimatePresence>
        {showAddFriend && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <form onSubmit={handleAddFriend} className="flex flex-col space-y-2">
              <input
                type="email"
                value={newFriendEmail}
                onChange={(e) => setNewFriendEmail(e.target.value)}
                className="subtle-input"
                placeholder="Friend's email"
                required
              />
              <button 
                type="submit" 
                className="btn-primary py-2" 
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Request'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="subtle-input pl-10 w-full"
          placeholder="Search friends or users..."
        />
        {searchTerm && (
          <button
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => {
              setSearchTerm('');
              setSearchResults([]);
            }}
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
      
      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-4 border p-2 rounded-lg bg-gray-50">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Search Results</h4>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {searchResults.map(user => (
              <li 
                key={user._id}
                className="p-2 rounded-lg hover:bg-gray-100 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <img 
                    src={user.avatar || `https://api.dicebear.com/7.x/avatars/svg?seed=${user.email}`} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <h5 className="text-sm font-medium">{user.name}</h5>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSendRequest(user._id)}
                  className="p-1 rounded-full bg-chat-primary text-white"
                  title="Add friend"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {isSearching && (
        <div className="text-center py-2">
          <div className="inline-block w-5 h-5 border-2 border-t-transparent border-chat-primary rounded-full animate-spin"></div>
        </div>
      )}
      
      <div className="flex-grow overflow-y-auto">
        {filteredFriends.length > 0 ? (
          <ul className="space-y-2">
            {filteredFriends.map(friend => (
              <li 
                key={friend._id}
                onClick={() => onSelectFriend(friend)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedFriendId === friend._id 
                    ? 'bg-chat-primary bg-opacity-10' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    <img 
                      src={friend.avatar || `https://api.dicebear.com/7.x/avatars/svg?seed=${friend.email}`} 
                      alt={friend.name} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {friend.isOnline ? (
                      <span className="status-online"></span>
                    ) : (
                      <span className="status-offline"></span>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-medium text-chat-dark truncate">{friend.name}</h4>
                    <p className="text-xs text-gray-500 truncate">{friend.email}</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {friend.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No friends found</p>
            <p className="text-sm">Try a different search or add new friends</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendList;

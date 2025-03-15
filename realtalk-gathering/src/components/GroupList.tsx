
import { useState } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface Group {
  _id: string;
  name: string;
  avatar: string;
  members: number;
  lastMessage: string;
}

interface GroupListProps {
  groups: Group[];
  onSelectGroup: (groupId: string) => void;
}

const GroupList = ({ groups, onSelectGroup }: GroupListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd make an API call to create a new group
    console.log('Creating new group:', newGroupName);
    setNewGroupName('');
    setShowCreateGroup(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-chat-dark">Groups</h3>
        <button 
          onClick={() => setShowCreateGroup(!showCreateGroup)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <Plus className="w-5 h-5 text-chat-primary" />
        </button>
      </div>
      
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <form onSubmit={handleCreateGroup} className="flex flex-col space-y-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="subtle-input"
                placeholder="Group name"
                required
              />
              <button type="submit" className="btn-primary py-2">
                Create Group
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
          className="subtle-input pl-10 w-full"
          placeholder="Search groups..."
        />
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {filteredGroups.length > 0 ? (
          <ul className="space-y-2">
            {filteredGroups.map(group => (
              <li 
                key={group._id}
                onClick={() => onSelectGroup(group._id)}
                className="p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    <img 
                      src={group.avatar} 
                      alt={group.name} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-medium text-chat-dark truncate">{group.name}</h4>
                    <p className="text-xs text-gray-500 truncate">{group.lastMessage}</p>
                  </div>
                  <div className="flex items-center text-xs text-gray-400">
                    <Users className="w-3 h-3 mr-1" />
                    {group.members}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No groups found</p>
            <p className="text-sm">Try a different search or create a new group</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupList;

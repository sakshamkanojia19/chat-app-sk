
import { Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface FriendRequest {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  status: 'incoming' | 'outgoing';
}

interface FriendRequestsProps {
  requests: FriendRequest[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

const FriendRequests = ({ requests, onAccept, onReject }: FriendRequestsProps) => {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const incomingRequests = requests.filter(req => req.status === 'incoming');
  const outgoingRequests = requests.filter(req => req.status === 'outgoing');

  const handleAccept = (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    onAccept(requestId);
    // We'll remove the ID when the parent component refreshes the requests
  };

  const handleReject = (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    onReject(requestId);
    // We'll remove the ID when the parent component refreshes the requests
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {incomingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h3 className="text-sm font-medium text-gray-500 mb-3">Incoming Requests</h3>
            <ul className="space-y-3">
              {incomingRequests.map(request => (
                <motion.li 
                  key={request._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-white rounded-lg shadow-sm border"
                >
                  <div className="flex items-center">
                    <img 
                      src={request.avatar || `https://api.dicebear.com/7.x/avatars/svg?seed=${request.email}`} 
                      alt={request.name} 
                      className="w-10 h-10 rounded-full object-cover mr-3"
                    />
                    <div className="flex-grow min-w-0">
                      <h4 className="font-medium text-chat-dark truncate">{request.name}</h4>
                      <p className="text-xs text-gray-500 truncate">{request.email}</p>
                    </div>
                    <div className="flex space-x-2">
                      {processingIds.has(request._id) ? (
                        <div className="p-2">
                          <div className="w-4 h-4 border-2 border-t-transparent border-chat-primary rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleAccept(request._id)}
                            className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                            aria-label="Accept request"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(request._id)}
                            className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                            aria-label="Reject request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
        
        {outgoingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h3 className="text-sm font-medium text-gray-500 mb-3">Sent Requests</h3>
            <ul className="space-y-3">
              {outgoingRequests.map(request => (
                <motion.li 
                  key={request._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <img 
                      src={request.avatar || `https://api.dicebear.com/7.x/avatars/svg?seed=${request.email}`} 
                      alt={request.name} 
                      className="w-10 h-10 rounded-full object-cover mr-3"
                    />
                    <div className="flex-grow min-w-0">
                      <h4 className="font-medium text-chat-dark truncate">{request.name}</h4>
                      <p className="text-xs text-gray-500 truncate">{request.email}</p>
                    </div>
                    <div className="text-xs text-gray-500 italic">Pending</div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      
      {requests.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No friend requests</p>
          <p className="text-sm">When you receive or send friend requests, they'll appear here</p>
        </div>
      )}
    </div>
  );
};

export default FriendRequests;

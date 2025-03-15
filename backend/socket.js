const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/userModel');
const Chat = require('./models/chatModel');

const createSocketServer = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Keep track of online users
  const onlineUsers = new Map();

  // Socket middleware to authenticate users
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user to socket
      socket.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
      };
      
      next();
    } catch (error) {
      return next(new Error('Authentication error: ' + error.message));
    }
  });

  // Socket connections
  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user._id}`);
    
    // Update user online status in the database
    await User.findByIdAndUpdate(socket.user._id, { isOnline: true });
    
    // Store user in the online users map
    onlineUsers.set(socket.user._id.toString(), socket.id);
    
    // Join a room with the user's ID for direct messages
    socket.join(socket.user._id.toString());
    
    // Emit to all users that this user is online
    socket.broadcast.emit('user_status_change', {
      userId: socket.user._id,
      isOnline: true,
    });

    // Join chat event
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`User ${socket.user._id} joined chat: ${chatId}`);
    });

    // Leave chat event
    socket.on('leave_chat', (chatId) => {
      socket.leave(chatId);
      console.log(`User ${socket.user._id} left chat: ${chatId}`);
    });

    // New message event
    socket.on('new_message', (message) => {
      // Emit to all users in the chat except sender
      socket.to(message.chat).emit('message_received', message);
      
      // Also send to the recipient's personal room if they're not in the chat
      const recipientIds = message.chat.users?.filter(userId => 
        userId.toString() !== socket.user._id.toString()
      );
      
      if (recipientIds && recipientIds.length > 0) {
        recipientIds.forEach(recipientId => {
          const recipientSocketId = onlineUsers.get(recipientId.toString());
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('message_received', message);
          }
        });
      }
    });

    // Typing indicator
    socket.on('typing', (chatId) => {
      socket.to(chatId).emit('typing', {
        chatId,
        user: socket.user,
      });
    });

    // Stop typing indicator
    socket.on('stop_typing', (chatId) => {
      socket.to(chatId).emit('stop_typing', {
        chatId,
        user: socket.user,
      });
    });

    // Friend request events
    socket.on('friend_request', ({ userId }) => {
      const receiverSocketId = onlineUsers.get(userId);
      
      if (receiverSocketId) {
        // User is online, send the request in real-time
        io.to(receiverSocketId).emit('new_friend_request', {
          user: socket.user,
        });
      }
      
      // Always emit to the user's unique room for when they come online
      socket.to(userId).emit('new_friend_request', {
        user: socket.user,
      });
      
      console.log(`Friend request sent from ${socket.user._id} to ${userId}`);
    });

    // Friend request response events
    socket.on('friend_request_response', ({ userId, accepted }) => {
      const receiverSocketId = onlineUsers.get(userId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('friend_request_response', {
          user: socket.user,
          accepted,
        });
      }
      
      console.log(`Friend request ${accepted ? 'accepted' : 'rejected'} by ${socket.user._id} for user ${userId}`);
    });

    // Disconnect event
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user._id}`);
      
      // Update user online status
      await User.findByIdAndUpdate(socket.user._id, { isOnline: false });
      
      // Remove from online users map
      onlineUsers.delete(socket.user._id.toString());
      
      // Emit to all users that this user is offline
      io.emit('user_status_change', {
        userId: socket.user._id,
        isOnline: false,
      });
    });
  });

  return io;
};

module.exports = { createSocketServer };

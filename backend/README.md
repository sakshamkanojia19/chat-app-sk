
# Chat Application Backend

This is the backend for the chat application. It provides API endpoints for user authentication, chat management, messaging, and friend requests.

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/chatapp
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   JWT_EXPIRES_IN=24h
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user (requires authentication)

### Users
- `GET /api/users/profile` - Get user profile (requires authentication)
- `PUT /api/users/profile` - Update user profile (requires authentication)
- `GET /api/users` - Get all users (requires authentication)
- `GET /api/users/friends` - Get user's friends (requires authentication)
- `GET /api/users/friend-requests` - Get friend requests (requires authentication)
- `POST /api/users/friend-request` - Send friend request (requires authentication)
- `POST /api/users/accept-request` - Accept friend request (requires authentication)
- `POST /api/users/reject-request` - Reject friend request (requires authentication)

### Chats
- `GET /api/chats` - Get all chats for a user (requires authentication)
- `POST /api/chats` - Access or create a one-on-one chat (requires authentication)
- `POST /api/chats/group` - Create a group chat (requires authentication)
- `PUT /api/chats/group/rename` - Rename a group chat (requires authentication)
- `PUT /api/chats/group/add` - Add a user to a group (requires authentication)
- `PUT /api/chats/group/remove` - Remove a user from a group (requires authentication)

### Messages
- `POST /api/messages` - Send a new message (requires authentication)
- `GET /api/messages/:chatId` - Get all messages for a chat (requires authentication)
- `PUT /api/messages/read/:chatId` - Mark messages as read (requires authentication)

## Socket Events

The application uses Socket.IO for real-time messaging. The following events are supported:

### Server to Client
- `message_received` - Notify when a new message is received
- `typing` - Notify when a user is typing
- `stop_typing` - Notify when a user stops typing
- `user_status_change` - Notify when a user changes online status
- `new_friend_request` - Notify when a new friend request is received

### Client to Server
- `join_chat` - Join a specific chat room
- `leave_chat` - Leave a specific chat room
- `new_message` - Send a new message
- `typing` - Indicate that user is typing
- `stop_typing` - Indicate that user has stopped typing
- `friend_request` - Send a friend request

## Models

The application uses the following MongoDB models:

### User
- name (String, required)
- email (String, required, unique)
- password (String, required)
- avatar (String)
- isOnline (Boolean)
- friends (Array of User references)
- pendingRequests (Array of {user, status})

### Chat
- isGroupChat (Boolean)
- chatName (String)
- users (Array of User references)
- lastMessage (Message reference)
- groupAdmin (User reference)

### Message
- sender (User reference)
- content (String)
- chat (Chat reference)
- readBy (Array of User references)

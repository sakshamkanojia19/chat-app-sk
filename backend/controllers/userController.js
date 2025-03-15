const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isOnline: user.isOnline,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.avatar = req.body.avatar || user.avatar;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      isOnline: updatedUser.isOnline,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ],
      }
    : {};

  // Don't return the current user
  const users = await User.find({
    ...keyword,
    _id: { $ne: req.user._id },
  }).select('-password');
  
  res.json(users);
});

// @desc    Send friend request (modified to accept email)
// @route   POST /api/users/friend-request
// @access  Private
const sendFriendRequest = asyncHandler(async (req, res) => {
  const { userId, email } = req.body;
  let recipient;

  // Find recipient user by email or ID
  if (email) {
    recipient = await User.findOne({ email: email.toLowerCase() });
    if (!recipient) {
      res.status(404);
      throw new Error('User with this email not found');
    }
  } else if (userId) {
    recipient = await User.findById(userId);
    if (!recipient) {
      res.status(404);
      throw new Error('User not found');
    }
  } else {
    res.status(400);
    throw new Error('Please provide userId or email');
  }

  // Check if trying to add self
  if (recipient._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot send friend request to yourself');
  }

  // Check if users are already friends
  if (recipient.friends.includes(req.user._id)) {
    res.status(400);
    throw new Error('You are already friends with this user');
  }

  // Check if there's an existing request
  const existingIncomingRequest = recipient.pendingRequests.find(
    (request) => request.user.toString() === req.user._id.toString() && request.status === 'incoming'
  );
  
  const existingOutgoingRequest = req.user.pendingRequests.find(
    (request) => request.user.toString() === recipient._id.toString() && request.status === 'outgoing'
  );

  if (existingIncomingRequest || existingOutgoingRequest) {
    res.status(400);
    throw new Error('Friend request already sent');
  }

  // Add to recipient's incoming requests
  recipient.pendingRequests.push({
    user: req.user._id,
    status: 'incoming',
  });
  await recipient.save();

  // Add to sender's outgoing requests
  req.user.pendingRequests.push({
    user: recipient._id,
    status: 'outgoing',
  });
  await req.user.save();

  res.status(201).json({ 
    message: 'Friend request sent',
    userId: recipient._id 
  });
});

// @desc    Accept friend request
// @route   POST /api/users/accept-request
// @access  Private
const acceptFriendRequest = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  // Find sender user
  const sender = await User.findById(userId);
  if (!sender) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if request exists
  const requestIndex = req.user.pendingRequests.findIndex(
    (request) => request.user.toString() === userId && request.status === 'incoming'
  );

  if (requestIndex === -1) {
    res.status(400);
    throw new Error('No friend request found from this user');
  }

  // Add each user to the other's friends list
  req.user.friends.push(userId);
  sender.friends.push(req.user._id);

  // Remove from pendingRequests
  req.user.pendingRequests.splice(requestIndex, 1);
  
  const senderRequestIndex = sender.pendingRequests.findIndex(
    (request) => request.user.toString() === req.user._id.toString() && request.status === 'outgoing'
  );
  
  if (senderRequestIndex !== -1) {
    sender.pendingRequests.splice(senderRequestIndex, 1);
  }

  await req.user.save();
  await sender.save();

  res.json({ message: 'Friend request accepted' });
});

// @desc    Reject friend request
// @route   POST /api/users/reject-request
// @access  Private
const rejectFriendRequest = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  // Find request index
  const requestIndex = req.user.pendingRequests.findIndex(
    (request) => request.user.toString() === userId && request.status === 'incoming'
  );

  if (requestIndex === -1) {
    res.status(400);
    throw new Error('No friend request found from this user');
  }

  // Remove from pendingRequests
  req.user.pendingRequests.splice(requestIndex, 1);
  await req.user.save();

  // Also remove from sender's outgoing requests
  const sender = await User.findById(userId);
  if (sender) {
    const senderRequestIndex = sender.pendingRequests.findIndex(
      (request) => request.user.toString() === req.user._id.toString() && request.status === 'outgoing'
    );
    
    if (senderRequestIndex !== -1) {
      sender.pendingRequests.splice(senderRequestIndex, 1);
      await sender.save();
    }
  }

  res.json({ message: 'Friend request rejected' });
});

// @desc    Get friend requests
// @route   GET /api/users/friend-requests
// @access  Private
const getFriendRequests = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('pendingRequests.user', 'name email avatar')
    .select('pendingRequests');

  const incomingRequests = user.pendingRequests.filter(
    (request) => request.status === 'incoming'
  );

  const outgoingRequests = user.pendingRequests.filter(
    (request) => request.status === 'outgoing'
  );

  res.json({
    incoming: incomingRequests,
    outgoing: outgoingRequests,
  });
});

// @desc    Get user's friends
// @route   GET /api/users/friends
// @access  Private
const getFriends = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('friends', 'name email avatar isOnline')
    .select('friends');

  res.json(user.friends);
});

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriends,
};

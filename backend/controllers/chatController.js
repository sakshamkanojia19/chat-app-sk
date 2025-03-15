
const asyncHandler = require('express-async-handler');
const Chat = require('../models/chatModel');
const User = require('../models/userModel');

// @desc    Access or create a chat between two users
// @route   POST /api/chats
// @access  Private
const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  // Check if chat exists
  let chat = await Chat.findOne({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate('users', '-password')
    .populate('lastMessage');

  if (chat) {
    return res.json(chat);
  }

  // If not, create a new chat
  const otherUser = await User.findById(userId);
  if (!otherUser) {
    res.status(404);
    throw new Error('User not found');
  }

  const chatData = {
    chatName: 'direct',
    isGroupChat: false,
    users: [req.user._id, userId],
  };

  chat = await Chat.create(chatData);
  chat = await Chat.findById(chat._id).populate('users', '-password');

  res.status(201).json(chat);
});

// @desc    Get all chats for a user
// @route   GET /api/chats
// @access  Private
const getChats = asyncHandler(async (req, res) => {
  let chats = await Chat.find({
    users: { $elemMatch: { $eq: req.user._id } },
  })
    .populate('users', '-password')
    .populate('groupAdmin', '-password')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

  res.json(chats);
});

// @desc    Create a group chat
// @route   POST /api/chats/group
// @access  Private
const createGroupChat = asyncHandler(async (req, res) => {
  const { name, users } = req.body;

  if (!name || !users) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  // Parse users if it's a string
  let usersList = users;
  if (typeof users === 'string') {
    usersList = JSON.parse(users);
  }

  // Add current user to the group
  usersList.push(req.user._id.toString());

  // Remove duplicates
  usersList = [...new Set(usersList)];

  if (usersList.length < 3) {
    res.status(400);
    throw new Error('A group chat requires at least 3 users');
  }

  const groupChat = await Chat.create({
    chatName: name,
    isGroupChat: true,
    users: usersList,
    groupAdmin: req.user._id,
  });

  const fullGroupChat = await Chat.findById(groupChat._id)
    .populate('users', '-password')
    .populate('groupAdmin', '-password');

  res.status(201).json(fullGroupChat);
});

// @desc    Rename a group chat
// @route   PUT /api/chats/group/:id
// @access  Private
const renameGroup = asyncHandler(async (req, res) => {
  const { chatId, chatName } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { chatName },
    { new: true }
  )
    .populate('users', '-password')
    .populate('groupAdmin', '-password');

  if (!updatedChat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  res.json(updatedChat);
});

// @desc    Add a user to a group
// @route   PUT /api/chats/group/add
// @access  Private
const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  // Check if the requester is the admin
  if (chat.groupAdmin.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the group admin can add users');
  }

  // Check if user is already in the group
  if (chat.users.includes(userId)) {
    res.status(400);
    throw new Error('User is already in the group');
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { $push: { users: userId } },
    { new: true }
  )
    .populate('users', '-password')
    .populate('groupAdmin', '-password');

  res.json(updatedChat);
});

// @desc    Remove a user from a group
// @route   PUT /api/chats/group/remove
// @access  Private
const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  // Check if the requester is the admin or the user is removing themselves
  if (
    chat.groupAdmin.toString() !== req.user._id.toString() &&
    userId !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Only the group admin can remove users');
  }

  // Check if user is in the group
  if (!chat.users.includes(userId)) {
    res.status(400);
    throw new Error('User is not in the group');
  }

  // Don't allow removing the admin
  if (
    userId === chat.groupAdmin.toString() &&
    req.user._id.toString() === chat.groupAdmin.toString()
  ) {
    res.status(400);
    throw new Error('Admin cannot be removed from the group');
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { $pull: { users: userId } },
    { new: true }
  )
    .populate('users', '-password')
    .populate('groupAdmin', '-password');

  res.json(updatedChat);
});

module.exports = {
  accessChat,
  getChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
};

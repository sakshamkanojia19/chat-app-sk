
const asyncHandler = require('express-async-handler');
const Message = require('../models/messageModel');
const Chat = require('../models/chatModel');
const User = require('../models/userModel');

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    res.status(400);
    throw new Error('Please provide message content and chat ID');
  }

  // Check if chat exists and user is part of it
  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  // Check if user is part of this chat
  if (!chat.users.some(userId => userId.toString() === req.user._id.toString())) {
    res.status(403);
    throw new Error('You are not part of this chat');
  }

  const newMessage = {
    sender: req.user._id,
    content,
    chat: chatId,
    readBy: [req.user._id], // User who sends message has read it
  };

  let message = await Message.create(newMessage);

  message = await Message.findById(message._id)
    .populate('sender', 'name avatar')
    .populate('chat');

  // Update lastMessage in chat
  await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

  res.status(201).json(message);
});

// @desc    Get all messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  // Check if chat exists
  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  // Check if user is part of this chat
  if (!chat.users.some(userId => userId.toString() === req.user._id.toString())) {
    res.status(403);
    throw new Error('You are not part of this chat');
  }

  const messages = await Message.find({ chat: chatId })
    .populate('sender', 'name avatar')
    .populate('readBy', 'name')
    .sort({ createdAt: 1 });

  res.json(messages);
});

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:chatId
// @access  Private
const markMessagesRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  // Check if chat exists
  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  // Check if user is part of this chat
  if (!chat.users.some(userId => userId.toString() === req.user._id.toString())) {
    res.status(403);
    throw new Error('You are not part of this chat');
  }

  // Mark all unread messages in this chat as read by this user
  await Message.updateMany(
    { 
      chat: chatId, 
      readBy: { $ne: req.user._id } 
    },
    { 
      $addToSet: { readBy: req.user._id } 
    }
  );

  res.json({ message: 'Messages marked as read' });
});

module.exports = { sendMessage, getMessages, markMessagesRead };

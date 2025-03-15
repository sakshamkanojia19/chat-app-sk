
const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  markMessagesRead,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, sendMessage);

router.route('/:chatId')
  .get(protect, getMessages);

router.route('/read/:chatId')
  .put(protect, markMessagesRead);

module.exports = router;

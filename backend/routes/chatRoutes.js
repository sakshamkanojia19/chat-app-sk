
const express = require('express');
const router = express.Router();
const {
  accessChat,
  getChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, accessChat)
  .get(protect, getChats);

router.route('/group')
  .post(protect, createGroupChat);

router.route('/group/rename')
  .put(protect, renameGroup);

router.route('/group/add')
  .put(protect, addToGroup);

router.route('/group/remove')
  .put(protect, removeFromGroup);

module.exports = router;

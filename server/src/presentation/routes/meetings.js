/**
 * Meetings Routes
 */

const express = require('express');
const router  = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { validateCreateMeeting, validateDeleteMeeting } = require('../middleware/validate');

module.exports = (controller) => {

  // GET /api/meetings
  router.get('/',
    asyncHandler((req, res) => controller.list(req, res))
  );

  // POST /api/meetings
  router.post('/',
    validateCreateMeeting,
    asyncHandler((req, res) => controller.create(req, res))
  );

  // DELETE /api/meetings/:id
  router.delete('/:id',
    validateDeleteMeeting,
    asyncHandler((req, res) => controller.remove(req, res))
  );

  return router;
};
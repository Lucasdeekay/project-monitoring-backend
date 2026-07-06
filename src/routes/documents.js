const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getDocumentsByProject,
  uploadDocument,
  deleteDocument,
  downloadDocument,
  configureMulter,
} = require('../controllers/documentController');

router.use(authenticateToken);

const upload = configureMulter();

router.get('/project/:projectId', getDocumentsByProject);
router.post('/', upload, uploadDocument);
router.get('/:id/download', downloadDocument);
router.delete('/:id', deleteDocument);

module.exports = router;

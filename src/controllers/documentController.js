const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const logger = require('../utils/logger');

<<<<<<< HEAD
const UPLOAD_DIR = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
=======
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
>>>>>>> origin/master

const ensureUploadDir = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
};

const getDocumentsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const documents = await query(
      'SELECT * FROM documents WHERE project_id = ? ORDER BY upload_date DESC',
      [projectId]
    );

    res.json({
      success: true,
      data: documents.map(doc => ({
        id: doc.id,
        projectId: doc.project_id,
        name: doc.name,
        type: doc.type,
        filePath: doc.file_path,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        uploadDate: doc.upload_date,
      })),
    });
  } catch (error) {
    logger.error('Get documents error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.',
      });
    }

    const { projectId, documentType } = req.body;
    const file = req.file;

    const result = await query(
      `INSERT INTO documents (project_id, name, type, file_path, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        file.originalname,
        documentType || 'other',
        file.path,
        file.size ? String(file.size) : null,
        file.mimetype,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully.',
      data: {
        id: result.insertId,
        name: file.originalname,
        type: documentType || 'other',
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });
  } catch (error) {
    logger.error('Upload document error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const docs = await query('SELECT * FROM documents WHERE id = ?', [id]);
    if (docs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.',
      });
    }

    const doc = docs[0];
    if (fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }

    await query('DELETE FROM documents WHERE id = ?', [id]);

    res.json({ success: true, message: 'Document deleted.' });
  } catch (error) {
    logger.error('Delete document error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const docs = await query('SELECT * FROM documents WHERE id = ?', [id]);
    if (docs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.',
      });
    }

    const doc = docs[0];
    if (!fs.existsSync(doc.file_path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server.',
      });
    }

    res.download(doc.file_path, doc.name);
  } catch (error) {
    logger.error('Download document error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to download document.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const configureMulter = () => {
  const multer = require('multer');
  ensureUploadDir();

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    },
  });

  return multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  }).single('file');
};

module.exports = {
  getDocumentsByProject,
  uploadDocument,
  deleteDocument,
  downloadDocument,
  configureMulter,
};

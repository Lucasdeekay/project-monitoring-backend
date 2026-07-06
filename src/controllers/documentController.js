const { put, del } = require('@vercel/blob');
const { query } = require('../config/database');
const logger = require('../utils/logger');

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

    const blob = await put(
      `uploads/${Date.now()}-${file.originalname}`,
      file.buffer,
      { access: 'public', contentType: file.mimetype }
    );

    const result = await query(
      `INSERT INTO documents (project_id, name, type, file_path, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        file.originalname,
        documentType || 'other',
        blob.url,
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
        filePath: blob.url,
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

    try {
      await del(doc.file_path);
    } catch {
      logger.warn('Failed to delete blob, continuing with DB cleanup');
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
    res.redirect(doc.file_path);
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

  return multer({
    storage: multer.memoryStorage(),
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

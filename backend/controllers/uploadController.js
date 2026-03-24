const Business = require('../models/Business');
const { AppError } = require('../middleware/errorHandler');
const { audit } = require('../middleware/auditMiddleware');
const path = require('path');
const fs   = require('fs');

// Helper: try R2 upload, fall back to local /uploads dir
async function storeFile(base64Data, mimeType, filename) {
  const buffer = Buffer.from(base64Data, 'base64');

  // Try Cloudflare R2 if configured
  if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY) {
    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const r2 = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId:     process.env.R2_ACCESS_KEY,
          secretAccessKey: process.env.R2_SECRET_KEY,
        },
      });
      const key = `billflow/${filename}`;
      await r2.send(new PutObjectCommand({
        Bucket:      process.env.R2_BUCKET || 'billflow',
        Key:         key,
        Body:        buffer,
        ContentType: mimeType,
      }));
      return `${process.env.R2_PUBLIC_URL}/${key}`;
    } catch (err) {
      console.warn('R2 upload failed, falling back to local:', err.message);
    }
  }

  // Local fallback — save to /public/uploads
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${filename}`;
}

// POST /api/business/:id/upload-logo
const uploadLogo = async (req, res, next) => {
  try {
    const { imageData, mimeType = 'image/png' } = req.body;
    if (!imageData) return next(new AppError('imageData (base64) is required.', 400));

    // Validate size (~500KB max for logo)
    const bytes = (imageData.length * 3) / 4;
    if (bytes > 600 * 1024) return next(new AppError('Logo must be under 500KB.', 400));

    const ext      = mimeType.split('/')[1] || 'png';
    const filename = `logo_${req.params.id}_${Date.now()}.${ext}`;
    const url      = await storeFile(imageData, mimeType, filename);

    const business = await Business.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { logoUrl: url },
      { new: true }
    );
    if (!business) return next(new AppError('Business not found.', 404));

    await audit(req, 'business.logo_uploaded', 'business', business._id, `Business: ${business.name}`);

    res.json({ success: true, message: 'Logo uploaded.', data: { logoUrl: url } });
  } catch (err) { next(err); }
};

// POST /api/business/:id/upload-signature
const uploadSignature = async (req, res, next) => {
  try {
    const { imageData, mimeType = 'image/png' } = req.body;
    if (!imageData) return next(new AppError('imageData (base64) is required.', 400));

    const bytes = (imageData.length * 3) / 4;
    if (bytes > 300 * 1024) return next(new AppError('Signature must be under 300KB.', 400));

    const ext      = mimeType.split('/')[1] || 'png';
    const filename = `sig_${req.params.id}_${Date.now()}.${ext}`;
    const url      = await storeFile(imageData, mimeType, filename);

    const business = await Business.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { signatureUrl: url },
      { new: true }
    );
    if (!business) return next(new AppError('Business not found.', 404));

    res.json({ success: true, message: 'Signature uploaded.', data: { signatureUrl: url } });
  } catch (err) { next(err); }
};

module.exports = { uploadLogo, uploadSignature };

import cloudinary from '../config/cloudinary';

export const uploadPdf = async (filePath: string) => {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: 'raw',
    folder: 'receipts',
  });

  return { url: result.secure_url, publicId: result.public_id };
};

export const deletePdf = async (publicId: string) => {
  const res = await cloudinary.uploader.destroy(publicId, {
    resource_type: 'raw',
    invalidate: true,
  });

  if (res.result !== 'ok')
    console.log('Error trying to delete pdf from cloudinary:', res);
};

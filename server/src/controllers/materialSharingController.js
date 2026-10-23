const materialSharingService = require('../services/materialSharingService');

async function share(req, res, next) {
  try {
    const result = await materialSharingService.shareMaterial(
      req.params.id,
      req.user.id,
      req.body?.email
    );

    return res.status(201).json({
      message: 'Material shared successfully',
      share: {
        id: result._id.toString(),
        material: result.material.toString(),
        recipient: result.recipient.toString(),
        createdAt: result.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function revokeShare(req, res, next) {
  try {
    const result = await materialSharingService.revokeMaterialShare(
      req.params.id,
      req.user.id,
      req.params.recipientId
    );

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = { share, revokeShare };

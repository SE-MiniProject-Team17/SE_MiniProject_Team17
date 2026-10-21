
const AppError = require('../utils/AppError');

/**
 * Creates resource-level authorization middleware.
 *
 * getResource(req) must return the resource or null.
 * hasAccess(req, resource) may implement an explicit access-grant policy.
 *
 * A missing resource and an unauthorized resource both return the same
 * access-denied response to avoid exposing resource details.
 */
function requireResourceAccess({
  getResource,
  ownerField = 'owner',
  hasAccess,
}) {
  if (typeof getResource !== 'function') {
    throw new TypeError('getResource must be a function');
  }

  if (typeof ownerField !== 'string' || !ownerField) {
    throw new TypeError('ownerField must be a non-empty string');
  }

  if (hasAccess !== undefined && typeof hasAccess !== 'function') {
    throw new TypeError('hasAccess must be a function when provided');
  }

  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return next(AppError.accessDenied());
      }

      const resource = await getResource(req);

      if (!resource) {
        return next(AppError.accessDenied());
      }

      const owner = resource[ownerField];
      const ownerId = owner && typeof owner === 'object' && owner._id
        ? owner._id.toString()
        : owner == null
          ? null
          : owner.toString();

      const ownsResource = ownerId === req.user.id.toString();
      const hasGrantedAccess = hasAccess
        ? await hasAccess(req, resource)
        : false;

      if (!ownsResource && !hasGrantedAccess) {
        return next(AppError.accessDenied());
      }

      req.authorizedResource = resource;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = requireResourceAccess;

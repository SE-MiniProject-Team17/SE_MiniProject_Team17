const AppError = require('../utils/AppError');

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 500;

function validateMaterialMetadata(data) {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const subject = typeof data.subject === 'string' ? data.subject.trim() : '';
  const description =
    typeof data.description === 'string' ? data.description.trim() : '';

  if (!title) {
    throw AppError.validation('title', 'Title is required');
  }

  if (title.length > TITLE_MAX) {
    throw AppError.validation(
      'title',
      `Title must be at most ${TITLE_MAX} characters`
    );
  }

  if (!subject) {
    throw AppError.validation('subject', 'Subject is required');
  }

  if (typeof data.description !== 'string') {
    throw AppError.validation('description', 'Description is required');
  }

  if (description.length > DESCRIPTION_MAX) {
    throw AppError.validation(
      'description',
      `Description must be at most ${DESCRIPTION_MAX} characters`
    );
  }

  return { title, subject, description };
}

module.exports = {
  validateMaterialMetadata,
  TITLE_MAX,
  DESCRIPTION_MAX,
};
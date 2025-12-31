const { logger } = require('@librechat/data-schemas');

// ActionablePlus E-commerce Consulting Categories
const options = [
  {
    label: 'com_ui_cat_cro',
    value: 'cro',
  },
  {
    label: 'com_ui_cat_analytics',
    value: 'analytics',
  },
  {
    label: 'com_ui_cat_marketing',
    value: 'marketing',
  },
  {
    label: 'com_ui_cat_seo',
    value: 'seo',
  },
  {
    label: 'com_ui_cat_ux',
    value: 'ux',
  },
  {
    label: 'com_ui_cat_market_research',
    value: 'market_research',
  },
  {
    label: 'com_ui_cat_growth',
    value: 'growth',
  },
  {
    label: 'com_ui_cat_gtm',
    value: 'gtm',
  },
  {
    label: 'com_ui_cat_technical',
    value: 'technical',
  },
  {
    label: 'com_ui_cat_operations',
    value: 'operations',
  },
];

module.exports = {
  /**
   * Retrieves the categories asynchronously.
   * @returns {Promise<TGetCategoriesResponse>} An array of category objects.
   * @throws {Error} If there is an error retrieving the categories.
   */
  getCategories: async () => {
    try {
      // const categories = await Categories.find();
      return options;
    } catch (error) {
      logger.error('Error getting categories', error);
      return [];
    }
  },
};

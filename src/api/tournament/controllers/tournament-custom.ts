export default {
  async findWithSearch(ctx) {
    const { page = 1, pageSize = 10, name } = ctx.query;

    let filters = {};
    if (name) {
      filters = {
        $or: [
          { name: { $containsi: name } },
          { name_unaccent: { $containsi: name } }
        ]
      };
    }

    const uid = 'api::tournament.tournament';

    const tournaments = await strapi.documents(uid).findMany({
      filters,
      sort: [{ createdAt: 'desc' }],
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      },
      populate: '*'
    });

    const total = await strapi.documents(uid).count({ filters });
    const totalPage = Math.ceil(total / parseInt(pageSize));

    return ctx.send({
      data: tournaments,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPage
      }
    });
  }
}; 
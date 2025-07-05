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
  },

  async findByDocumentId(ctx) {
    const { documentId } = ctx.params;

    try {
      // Sử dụng Document Service API để lấy tournament theo documentId
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId,
        populate: '*'
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      return ctx.send({ data: tournament });
    } catch (error) {
      return ctx.badRequest('Invalid documentId');
    }
  },

  async updateByDocumentId(ctx) {
    const { documentId } = ctx.params;
    const { data } = ctx.request.body;

    try {
      // Kiểm tra xem tournament có tồn tại không
      const existingTournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId,
        populate: '*'
      });

      if (!existingTournament) {
        return ctx.notFound('Tournament not found');
      }

      // Xử lý trường banner
      let updateData = { ...data };
      
      if (data.hasOwnProperty('banner')) {
        if (data.banner === null) {
          // Trường hợp 1: banner = null → Loại bỏ banner
          updateData.banner = null;
        } else {
          // Trường hợp 2: banner không phải null → Loại bỏ banner ra khỏi updateData
          delete updateData.banner;
        }
      }
      // Trường hợp 3: Không có trường banner → Không thay đổi banner hiện tại

      // Cập nhật tournament
      const updatedTournament = await strapi.documents('api::tournament.tournament').update({
        documentId,
        data: updateData
      });

      // Publish document
      await strapi.documents('api::tournament.tournament').publish({
        documentId
      });

      // Lấy tournament đã cập nhật với populate
      const fullTournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId,
        populate: '*'
      });

      return ctx.send({ 
        data: fullTournament,
        message: 'Tournament updated successfully'
      });
    } catch (error) {
      console.error('Update tournament error:', error);
      return ctx.badRequest('Failed to update tournament');
    }
  },

  
}; 
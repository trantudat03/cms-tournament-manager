export default {
  async findByCurrentUser(ctx) {
    // Lấy user từ JWT (ctx.state.user)
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("Missing or invalid JWT");
    }

    // Lấy query parameters cho phân trang
    const { page = 1, pageSize = 10 } = ctx.query;

    // Tìm các system-tournament có userId trùng với user.id với phân trang
    const entries = await strapi.entityService.findMany('api::system-tournament.system-tournament', {
      filters: { userId: user.documentId },
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      },
      populate: {
        logoSystem: true,
        tournaments: {
          populate: '*'
        }
      }
    });

    // Đếm tổng số bản ghi để trả về pagination (dùng query.count thay vì entityService.count)
    const total = await strapi.db.query('api::system-tournament.system-tournament').count({
      where: { userId: user.documentId }
    });
    const totalPage = Math.ceil(total / parseInt(pageSize));

    return ctx.send({
      data: entries,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPage
      }
    });
  },

  async createByCurrentUser(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("Missing or invalid JWT");
    }

    // Lấy dữ liệu từ body và gán userId
    const data = {
      ...ctx.request.body.data,
      userId: user.documentId
    };

    // Tạo system-tournament bằng Document Service API
    const entry = await strapi.documents('api::system-tournament.system-tournament').create({
      data,
      populate: {
        logoSystem: true,
        tournaments: { populate: '*' },
        system_package: true
      }
    });

    // Publish document
    await strapi.documents('api::system-tournament.system-tournament').publish({
      documentId: entry.documentId
    });

    // Cập nhật type của user thành system-owner
    await strapi.documents('plugin::users-permissions.user').update({
      documentId: user.documentId,
      data: { type: 'system-owner' }
    });

    return ctx.send({ data: entry });
  },

  async updateByCurrentUser(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("Missing or invalid JWT");
    }

    const { id } = ctx.params;
    const uid = 'api::system-tournament.system-tournament';

    // Lấy document theo documentId bằng API mới
    const entity = await strapi.documents(uid).findOne({ documentId: id });
    if (!entity || entity.userId !== user.documentId) {
      return ctx.forbidden("You are not allowed to update this system-tournament");
    }

    // Cập nhật bằng API mới
    const updated = await strapi.documents(uid).update({
      documentId: id,
      data: ctx.request.body.data
    });

    return ctx.send({ data: updated });
  },

  async findTournaments(ctx) {
    const user = ctx.state.user;
    if (!user || user.type !== 'system-owner') {
      return ctx.unauthorized("Only system-owner can access this resource");
    }

    const { page = 1, pageSize = 10, name } = ctx.query;

    // Xây dựng filter tìm kiếm không dấu và có dấu
    let filters = {};
    if (name) {
      // Tìm kiếm không phân biệt dấu và không dấu
      // Sử dụng $or với $containsi (Strapi v4+)
      filters = {
        $or: [
          { name: { $containsi: name } },
          { name_unaccent: { $containsi: name } } // nếu có trường name_unaccent
        ]
      };
    }

    // Lấy danh sách tournament với phân trang, sắp xếp mới nhất trước
    const tournaments = await strapi.entityService.findMany('api::tournament.tournament', {
      filters,
      sort: { createdAt: 'desc' },
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      },
      populate: '*'
    });

    // Đếm tổng số bản ghi
    const total = await strapi.db.query('api::tournament.tournament').count({ where: filters });
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
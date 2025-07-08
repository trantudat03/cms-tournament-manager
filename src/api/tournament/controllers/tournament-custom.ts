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

  async createBracket(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;

    try {
      if (!user) {
        return ctx.unauthorized("Missing or invalid JWT");
      }

      // Lấy tournament
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: String(id),
        populate: {
          rounds: true,
          system_tournament: true
        }
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Kiểm tra xem user có quyền truy cập tournament này không
      const tournamentWithSystem = tournament as any;
      if (tournamentWithSystem.system_tournament?.userId !== user.documentId) {
        return ctx.forbidden("You are not allowed to access this tournament");
      }

      // Kiểm tra xem tournament đã có rounds chưa (đã được xử lý trong utility function)
      if (tournamentWithSystem.rounds && tournamentWithSystem.rounds.length > 0) {
        return ctx.badRequest('Tournament already has rounds. Cannot create bracket again.');
      }

      // Kiểm tra maxParticipants
      if (!tournament.maxParticipants || tournament.maxParticipants <= 0) {
        return ctx.badRequest('Tournament must have maxParticipants greater than 0');
      }

      // Tạo bracket
      const bracket = await strapi.service('api::tournament.tournament').createTournamentBracket(
        tournament.documentId,
        tournament.maxParticipants
      );

      // Lấy tournament đã cập nhật với bracket
      const updatedTournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: String(id),
        populate: {
          rounds: {
            populate: {
              matches: {
                populate: '*'
              }
            }
          }
        }
      });

      return ctx.send({
        data: updatedTournament,
        message: 'Tournament bracket created successfully',
        bracket: bracket
      });
    } catch (error) {
      console.error('Create bracket error:', error);
      return ctx.badRequest('Failed to create tournament bracket', { error: error.message });
    }
  },

  async getBracket(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;

    try {
      if (!user) {
        return ctx.unauthorized("Missing or invalid JWT");
      }

      // Lấy thông tin bracket của tournament
      const bracket = await strapi.service('api::tournament.tournament').getBracketInfo(id);

      if (!bracket) {
        return ctx.notFound('Tournament not found');
      }

      // Kiểm tra xem user có quyền truy cập tournament này không
      const bracketWithSystem = bracket as any;
      if (bracketWithSystem.system_tournament?.userId !== user.documentId) {
        return ctx.forbidden("You are not allowed to access this tournament");
      }

      return ctx.send({
        data: bracket
      });
    } catch (error) {
      console.error('Get bracket error:', error);
      return ctx.badRequest('Failed to get tournament bracket', { error: error.message });
    }
  },
}; 
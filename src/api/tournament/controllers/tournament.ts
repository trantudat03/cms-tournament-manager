/**
 * tournament controller
 */

import { factories } from '@strapi/strapi'
import pusher from '../../../utils/pusher'

export default factories.createCoreController('api::tournament.tournament', ({ strapi }) => ({
  async create(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized("Missing or invalid JWT");
      }

      // Kiểm tra xem user có phải là system-owner không
      if (user.type !== 'system-owner') {
        return ctx.forbidden("Only system-owner can create tournaments");
      }

      // Lấy system-tournament của user
      const systemTournaments = await strapi.documents('api::system-tournament.system-tournament').findMany({
        filters: { userId: user.documentId },
        populate: '*'
      });

      if (!systemTournaments || systemTournaments.length === 0) {
        return ctx.badRequest("User does not have a system-tournament");
      }

      const systemTournament = systemTournaments[0];

      if (!systemTournament) {
        return ctx.badRequest("User does not have a system-tournament");
      }

      // Tạo tournament với system_tournament được set
      // Ép banner = null nếu không truyền lên để tránh tự động gán banner
      const tournamentData = {
        ...ctx.request.body.data,
        system_tournament: systemTournament.documentId,
        banner: ctx.request.body.data?.banner ? Number(ctx.request.body.data.banner) : null
      };

      const tournament = await strapi.documents('api::tournament.tournament').create({
        data: tournamentData,
      });
      
      await strapi.documents('api::tournament.tournament').publish({
        documentId: tournament.documentId,
      });

      // Lấy đầy đủ thông tin tournament đã populate (bao gồm brackets, rounds và matches được tạo tự động)
      const fullTournament = await strapi.service('api::tournament.tournament').getTournamentWithMatches(tournament.documentId);

      return ctx.send({ data: fullTournament });
    } catch (error) {
      console.error('Error creating tournament:', error);
      return ctx.badRequest('Failed to create tournament', { error: error.message });
    }
  },

  async update(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    // Ép banner = null nếu không truyền lên để tránh tự động gán banner
    const updateData = {
      ...data,
      banner: data?.banner || null
    };

    // Update tournament bằng Document Service API
    await strapi.documents('api::tournament.tournament').update({
        documentId: id,
        data: updateData,
      });
    await strapi.documents('api::tournament.tournament').publish({
        documentId: id,
    });

    // Lấy đầy đủ thông tin tournament đã populate với kiểm tra matches
    const fullTournament = await strapi.service('api::tournament.tournament').getTournamentWithMatches(id);

    return ctx.send({ data: fullTournament });
  },

  async findOne(ctx) {
    const { id } = ctx.params;

    try {
      // Sử dụng service mới để lấy tournament với kiểm tra matches
      const tournament = await strapi.service('api::tournament.tournament').getTournamentWithMatches(id);

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      return ctx.send({ data: tournament });
    } catch (error) {
      console.error('Error finding tournament:', error);
      return ctx.badRequest('Failed to find tournament', { error: error.message });
    }
  },

  async findMany(ctx) {
    try {
      const { query } = ctx;
      let filters = query.filters || {};
      
      // Sử dụng Document Service API với populate đầy đủ
      const tournaments = await strapi.documents('api::tournament.tournament').findMany({
        filters,
        populate: {
          brackets: {
            populate: {
              rounds: {
                populate: {
                  matches: {
                    populate: '*'
                  }
                }
              }
            }
          },
          system_tournament: {
            populate: '*'
          },
          players: {
            populate: {
              avatar: true,
              system_tournaments: true
            }
          }
        },
        sort: { createdAt: 'desc' },
        pagination: {
          page: ((query.pagination as any)?.page) || 1,
          pageSize: ((query.pagination as any)?.pageSize) || 25
        }
      });

      // Kiểm tra và tái tạo matches cho từng tournament nếu cần
      for (const tournament of tournaments) {
        try {
          await strapi.service('api::tournament.tournament').checkAndRegenerateMatches(tournament.documentId);
        } catch (error) {
          console.error(`Error checking matches for tournament ${tournament.documentId}:`, error);
        }
      }

      return ctx.send({
        data: tournaments,
        meta: {
          count: tournaments.length
        }
      });
    } catch (error) {
      console.error('Error finding tournaments:', error);
      return ctx.badRequest('Failed to find tournaments', { error: error.message });
    }
  }
}));

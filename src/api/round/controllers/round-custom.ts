/**
 * round custom controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::round.round', ({ strapi }) => ({
  async findByTournament(ctx) {
    try {
      const { tournamentId } = ctx.params;
      
      if (!tournamentId) {
        return ctx.badRequest('Tournament ID is required');
      }

      // Sử dụng strapi.documents để tìm theo documentId
      const rounds = await strapi.documents('api::round.round').findMany({
        filters: {
          tournament: {
            documentId: { $eq: tournamentId }
          }
        },
        populate: {
          matches: {
            populate: {
              nextMatchWinner: true,
              nextMatchLoser: true,
              previousMatch1: true,
              previousMatch2: true,
            }
          }
        },
        sort: { order: 'asc' }
      });

      // Trả về response theo chuẩn Strapi Document API
      return ctx.send({
        data: rounds,
        meta: {
          count: rounds.length
        }
      });
    } catch (error) {
      return ctx.internalServerError('Error fetching rounds', { error: error.message });
    }
  },

  async findAllWithPopulate(ctx) {
    try {
      const { query } = ctx;
      let filters = query.filters || {};
      
      // Xử lý filters để đảm bảo type đúng cho documentId
      if ((filters as any).tournament && typeof (filters as any).tournament === 'string') {
        (filters as any).tournament = {
          documentId: { $eq: (filters as any).tournament }
        };
      }
      
      // Sử dụng strapi.documents với pagination
      const rounds = await strapi.documents('api::round.round').findMany({
        filters,
        populate: {
          tournament: true,
          matches: {
            populate: {
              nextMatchWinner: true,
              nextMatchLoser: true,
              previousMatch1: true,
              previousMatch2: true,
              round: true,
              tournament: true
            }
          }
        },
        sort: { order: 'asc' },
        pagination: {
          page: ((query.pagination as any)?.page) || 1,
          pageSize: ((query.pagination as any)?.pageSize) || 25
        }
      });

      // Trả về response theo chuẩn Strapi Document API
      return ctx.send({
        data: rounds,
        meta: {
          count: rounds.length
        }
      });
    } catch (error) {
      return ctx.internalServerError('Error fetching rounds', { error: error.message });
    }
  }
})); 
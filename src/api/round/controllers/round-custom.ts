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

      // Lấy tất cả brackets của tournament trước
      const brackets = await strapi.documents('api::bracket.bracket').findMany({
        filters: {
          tournament: { documentId: { $eq: tournamentId } }
        }
      });

      const bracketIds = brackets.map(b => b.documentId);

      // Sau đó lấy rounds của các brackets đó
      const rounds = await strapi.documents('api::round.round').findMany({
        filters: {
          bracket: {
            documentId: { $in: bracketIds }
          }
        },
        populate: {
          bracket: {
            populate: {
              tournament: true
            }
          },
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
        // Nếu filter theo tournament, cần chuyển thành filter theo bracket
        const brackets = await strapi.documents('api::bracket.bracket').findMany({
          filters: {
            tournament: { documentId: { $eq: (filters as any).tournament } }
          }
        });
        const bracketIds = brackets.map(b => b.documentId);
        
        delete (filters as any).tournament;
        (filters as any).bracket = {
          documentId: { $in: bracketIds }
        };
      }
      
      // Sử dụng strapi.documents với pagination
      const rounds = await strapi.documents('api::round.round').findMany({
        filters,
        populate: {
          bracket: {
            populate: {
              tournament: true
            }
          },
          matches: {
            populate: {
              nextMatchWinner: true,
              nextMatchLoser: true,
              previousMatch1: true,
              previousMatch2: true,
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
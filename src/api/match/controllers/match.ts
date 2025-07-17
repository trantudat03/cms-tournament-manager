/**
 * match controller
 */

import { factories } from '@strapi/strapi'
import pusher from '../../../utils/pusher'

export default factories.createCoreController('api::match.match', ({ strapi }) => ({
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const { data } = ctx.request.body;

      // Update match bằng Document Service API
      await strapi.documents('api::match.match').update({
        documentId: id,
        data: data,
      });
      
      await strapi.documents('api::match.match').publish({
        documentId: id,
      });

      // Lấy đầy đủ thông tin match đã populate
      const fullMatch = await strapi.documents('api::match.match').findOne({
        documentId: id,
        populate: {
          nextMatchLoser: true,
          nextMatchWinner: true,
          previousMatch1: true,
          previousMatch2: true,
        }
    });

      if (!fullMatch) {
        return ctx.notFound('Match not found');
      }

      // Gửi event realtime qua Pusher
      // Gửi đến channel của tournament cụ thể
     
        const matchSummary = {
          id: fullMatch.id,
          name: fullMatch.name,
          status: fullMatch.statusMatch,
          score1: fullMatch.score1,
          score2: fullMatch.score2,
          playerName1: fullMatch.playerName1,
          playerName2: fullMatch.playerName2,
          winner: fullMatch.winner,
          nextMatchLoser: fullMatch.nextMatchLoser,
          nextMatchWinner: fullMatch.nextMatchWinner,
          previousMatch1: fullMatch.previousMatch1,
          previousMatch2: fullMatch.previousMatch2,
          startTime: fullMatch.startTime,
          endTime: fullMatch.endTime,
          matchNumber: fullMatch.matchNumber,
          statusMatch: fullMatch.statusMatch,
          updatedAt: fullMatch.updatedAt
        };
        
        // await pusher.trigger(`tournament-${tournamentId}`, 'match-updated', matchSummary);        
        // Gửi thêm event đến channel riêng cho match
        await pusher.trigger(`match-${id}`, 'match-updated', matchSummary);

      return ctx.send({ data: fullMatch });
    } catch (error) {
      console.error('Error updating match:', error);
      return ctx.badRequest('Failed to update match', { error: error.message });
    }
  },

  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      
      // Lấy match với populate đầy đủ
      const match = await strapi.documents('api::match.match').findOne({
        documentId: id,
        populate: {
          round: {
            populate: {
              tournament: {
                populate: '*'
              }
            }
          },
          team1: {
            populate: '*'
          },
          team2: {
            populate: '*'
          }
        }
      });

      if (!match) {
        return ctx.notFound('Match not found');
      }

      return ctx.send({ data: match });
    } catch (error) {
      console.error('Error finding match:', error);
      return ctx.badRequest('Failed to find match', { error: error.message });
    }
  },

  async find(ctx) {
    try {
      // Lấy query parameters
      const { page = 1, pageSize = 25, sort = 'createdAt:desc', filters = {} } = ctx.query;
      
      // Lấy matches với populate đầy đủ
      const matches = await strapi.documents('api::match.match').findMany({
        filters: filters as any,
        sort: Array.isArray(sort) ? sort : [sort as string],
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string)
        },
        populate: {
          round: {
            populate: {
              tournament: {
                populate: '*'
              }
            }
          },
          team1: {
            populate: '*'
          },
          team2: {
            populate: '*'
          }
        }
      });

      // Đếm tổng số matches
      const total = await strapi.documents('api::match.match').count({ filters: filters as any });
      const totalPage = Math.ceil(total / parseInt(pageSize as string));

      return ctx.send({
        data: matches,
        meta: {
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            total,
            totalPage
          }
        }
      });
    } catch (error) {
      console.error('Error finding matches:', error);
      return ctx.badRequest('Failed to find matches', { error: error.message });
    }
  }
}));

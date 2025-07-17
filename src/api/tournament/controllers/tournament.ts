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

      // Lấy đầy đủ thông tin tournament đã populate (bao gồm rounds và matches được tạo tự động)
      const fullTournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: tournament.documentId,
        populate: {
          rounds: {
            populate: {
              matches: {
                populate: '*'
              }
            }
          },
          system_tournament: {
            populate: '*'
          }
        }
      });

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

    // Lấy đầy đủ thông tin tournament đã populate
    const fullTournament = await strapi.documents('api::tournament.tournament').findOne({
      documentId: id,
      populate: {
        rounds: {
          populate: {
            matches: {
              populate: '*'
            }
          }
        },
        system_tournament: {
          populate: '*'
        }
      }
    });

    return ctx.send({ data: fullTournament });
  },

  async find(ctx) {
    // Lấy query parameters
    const { page = 1, pageSize = 25, sort = 'createdAt:desc', filters = {} } = ctx.query;
    
    // Lấy tournaments với populate đầy đủ
    const tournaments = await strapi.documents('api::tournament.tournament').findMany({
      filters: filters as any,
      sort: Array.isArray(sort) ? sort : [sort as string],
      pagination: {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string)
      },
      populate: {
        rounds: {
          populate: {
            matches: {
              populate: '*'
            }
          }
        },
        system_tournament: {
          populate: '*'
        }
      }
    });

    // Đếm tổng số tournaments
    const total = await strapi.documents('api::tournament.tournament').count({ filters: filters as any });
    const totalPage = Math.ceil(total / parseInt(pageSize as string));

    return ctx.send({
      data: tournaments,
      meta: {
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
          total,
          totalPage
        }
      }
    });
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    
    // Lấy tournament với populate đầy đủ
    const tournament = await strapi.documents('api::tournament.tournament').findOne({
      documentId: id,
      populate: {
        rounds: {
          populate: {
            matches: {
              populate: '*'
            }
          }
        },
        system_tournament: {
          populate: '*'
        }
      }
    });

    if (!tournament) {
      return ctx.notFound('Tournament not found');
    }

    return ctx.send({ data: tournament });
  }
}));

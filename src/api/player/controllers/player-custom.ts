/**
 * player-custom controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::player.player', ({ strapi }) => ({
  // Lấy danh sách players theo system-tournament
  async findBySystemTournament(ctx) {
    try {
      const { systemTournamentId } = ctx.params;
      const { page = 1, pageSize = 10, sort = 'createdAt:desc', filters = {} } = ctx.query;

      // Parse filters từ query string
      let parsedFilters = {};
      if (typeof filters === 'string') {
        try {
          parsedFilters = JSON.parse(filters);
        } catch (e) {
          parsedFilters = {};
        }
      } else if (typeof filters === 'object') {
        parsedFilters = filters;
      }

      const players = await strapi.service('api::player.player-custom').findBySystemTournament({
        systemTournamentId,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        sort,
        filters: parsedFilters,
        user: ctx.state.user
      });

      return ctx.send({
        data: players.results,
        meta: {
          pagination: players.pagination
        }
      });
    } catch (error) {
      return ctx.badRequest('Error fetching players by system tournament', { error: error.message });
    }
  },

  // Tạo player mới và liên kết với system-tournament
  async createForSystemTournament(ctx) {
    try {
      const { systemTournamentId } = ctx.params;
      const { userId, createUser, ...playerData } = ctx.request.body;

      const player = await strapi.service('api::player.player-custom').createForSystemTournament({
        systemTournamentId,
        playerData,
        user: ctx.state.user,
        userId,
        createUser
      });

      return ctx.created({
        data: player
      });
    } catch (error) {
      return ctx.badRequest('Error creating player for system tournament', { error: error.message });
    }
  },

  // Cập nhật player theo system-tournament
  async updateForSystemTournament(ctx) {
    try {
      const { id, systemTournamentId } = ctx.params;
      const updateData = ctx.request.body;

      const player = await strapi.service('api::player.player-custom').updateForSystemTournament({
        id,
        systemTournamentId,
        updateData,
        user: ctx.state.user
      });

      return ctx.send({
        data: player
      });
    } catch (error) {
      return ctx.badRequest('Error updating player for system tournament', { error: error.message });
    }
  },

  // Xóa player khỏi system-tournament
  async deleteFromSystemTournament(ctx) {
    try {
      const { id, systemTournamentId } = ctx.params;

      await strapi.service('api::player.player-custom').deleteFromSystemTournament({
        id,
        systemTournamentId,
        user: ctx.state.user
      });

      return ctx.send({
        message: 'Player removed from system tournament successfully'
      });
    } catch (error) {
      return ctx.badRequest('Error removing player from system tournament', { error: error.message });
    }
  },

  // Thêm player vào system-tournament
  async addToSystemTournament(ctx) {
    try {
      const { id, systemTournamentId } = ctx.params;

      const player = await strapi.service('api::player.player-custom').addToSystemTournament({
        id,
        systemTournamentId,
        user: ctx.state.user
      });

      return ctx.send({
        data: player,
        message: 'Player added to system tournament successfully'
      });
    } catch (error) {
      return ctx.badRequest('Error adding player to system tournament', { error: error.message });
    }
  },

  // Lấy thông tin chi tiết player theo system-tournament
  async findOneBySystemTournament(ctx) {
    try {
      const { id, systemTournamentId } = ctx.params;

      const player = await strapi.service('api::player.player-custom').findOneBySystemTournament({
        id,
        systemTournamentId,
        user: ctx.state.user
      });

      if (!player) {
        return ctx.notFound('Player not found in this system tournament');
      }

      return ctx.send({
        data: player
      });
    } catch (error) {
      return ctx.badRequest('Error fetching player details', { error: error.message });
    }
  },

  // Tìm kiếm players trong system-tournament
  async searchInSystemTournament(ctx) {
    try {
      const { systemTournamentId } = ctx.params;
      const { query, page = 1, pageSize = 10, name, rankLevel, countryCode, gender, statusPlayer } = ctx.query;

      // Xây dựng filters object từ query parameters
      const filters: any = {};
      if (name) filters.name = name as string;
      if (rankLevel) filters.rankLevel = rankLevel as string;
      if (countryCode) filters.countryCode = countryCode as string;
      if (gender) filters.gender = gender as string;
      if (statusPlayer) filters.statusPlayer = statusPlayer as string;

      const players = await strapi.service('api::player.player-custom').searchInSystemTournament({
        systemTournamentId,
        query,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        user: ctx.state.user,
        filters
      });

      return ctx.send({
        data: players.results,
        meta: {
          pagination: players.pagination
        }
      });
    } catch (error) {
      return ctx.badRequest('Error searching players', { error: error.message });
    }
  },

  // Lấy thống kê players trong system-tournament
  async getStatsBySystemTournament(ctx) {
    try {
      const { systemTournamentId } = ctx.params;

      const stats = await strapi.service('api::player.player-custom').getStatsBySystemTournament({
        systemTournamentId,
        user: ctx.state.user
      });

      return ctx.send({
        data: stats
      });
    } catch (error) {
      return ctx.badRequest('Error fetching player stats', { error: error.message });
    }
  },

  // Gán user cho player
  async assignUserToPlayer(ctx) {
    try {
      const { playerId, systemTournamentId } = ctx.params;
      const { userId } = ctx.request.body;

      if (!userId) {
        return ctx.badRequest('userId is required');
      }

      const player = await strapi.service('api::player.player-custom').assignUserToPlayer({
        playerId,
        userId,
        systemTournamentId,
        user: ctx.state.user
      });

      return ctx.send({
        data: player,
        message: 'User assigned to player successfully'
      });
    } catch (error) {
      return ctx.badRequest('Error assigning user to player', { error: error.message });
    }
  },

  // Hủy gán user khỏi player
  async unassignUserFromPlayer(ctx) {
    try {
      const { playerId, systemTournamentId } = ctx.params;

      const player = await strapi.service('api::player.player-custom').unassignUserFromPlayer({
        playerId,
        systemTournamentId,
        user: ctx.state.user
      });

      return ctx.send({
        data: player,
        message: 'User unassigned from player successfully'
      });
    } catch (error) {
      return ctx.badRequest('Error unassigning user from player', { error: error.message });
    }
  },

  // Cập nhật player với user mới
  async updatePlayerWithUser(ctx) {
    try {
      const { playerId, systemTournamentId } = ctx.params;
      const { userId } = ctx.request.body;

      const player = await strapi.service('api::player.player-custom').updatePlayerWithUser({
        playerId,
        userId,
        systemTournamentId,
        user: ctx.state.user
      });

      return ctx.send({
        data: player,
        message: 'Player updated with user successfully'
      });
    } catch (error) {
      return ctx.badRequest('Error updating player with user', { error: error.message });
    }
  },

  // Lấy danh sách players có user được gán trong system-tournament
  async findPlayersWithUsers(ctx) {
    try {
      const { systemTournamentId } = ctx.params;
      const { page = 1, pageSize = 10 } = ctx.query;

      const players = await strapi.service('api::player.player-custom').findPlayersWithUsers({
        systemTournamentId,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        user: ctx.state.user
      });

      return ctx.send({
        data: players.results,
        meta: {
          pagination: players.pagination
        }
      });
    } catch (error) {
      return ctx.badRequest('Error fetching players with users', { error: error.message });
    }
  },

  // Lấy danh sách players chưa có user được gán trong system-tournament
  async findPlayersWithoutUsers(ctx) {
    try {
      const { systemTournamentId } = ctx.params;
      const { page = 1, pageSize = 10 } = ctx.query;

      const players = await strapi.service('api::player.player-custom').findPlayersWithoutUsers({
        systemTournamentId,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        user: ctx.state.user
      });

      return ctx.send({
        data: players.results,
        meta: {
          pagination: players.pagination
        }
      });
    } catch (error) {
      return ctx.badRequest('Error fetching players without users', { error: error.message });
    }
  }
})); 
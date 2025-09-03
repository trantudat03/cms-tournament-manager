/**
 * player-custom service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::player.player', ({ strapi }) => {
  const coreService = strapi.service('api::player.player');
  
  // Utility function để tạo slug từ name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Loại bỏ ký tự đặc biệt
      .replace(/\s+/g, '-') // Thay thế khoảng trắng bằng dấu gạch ngang
      .replace(/-+/g, '-') // Loại bỏ dấu gạch ngang liên tiếp
      .trim();
  };
  
  return {
    // Extend core service methods
    ...coreService,
  // Lấy danh sách players theo system-tournament
  async findBySystemTournament({ systemTournamentId, page = 1, pageSize = 10, sort = 'createdAt:desc', filters = {}, user }) {
    const start = (page - 1) * pageSize;
    const limit = pageSize;

    // Kiểm tra quyền truy cập
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to access this system tournament');
    }

    const query: any = {
      filters: {
        ...filters,
        system_tournaments: {
          id: systemTournamentId
        }
      },
      sort,
      start,
      limit,
      populate: {
        avatar: true,
        system_tournaments: true,
        tournaments: true,
        matches: true,
        users_permissions_user: true
      }
    };

    const players = await strapi.documents('api::player.player').findMany(query);
    
    // Calculate pagination manually since findMany doesn't return pagination
    const total = players.length;
    const pageCount = Math.ceil(total / pageSize);
    
    return { 
      results: players, 
      pagination: {
        page,
        pageSize,
        pageCount,
        total
      }
    };
  },

  // Tạo player mới và liên kết với system-tournament
  async createForSystemTournament({ systemTournamentId, playerData, user, userId = null, createUser = null }) {
    // Kiểm tra system-tournament có tồn tại không
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to create players in this system tournament');
    }

    // Tạo slug từ name nếu có
    let slug = null;
    if (playerData.name) {
      const baseSlug = generateSlug(playerData.name);
      // Thêm timestamp để đảm bảo unique
      slug = `${baseSlug}-${Date.now()}`;
    }

    // Xử lý user - có thể là userId, tạo user mới, hoặc không có user
    let finalUserId = null;
    
    if (createUser) {
      // Tạo user mới
      try {
        const newUser = await strapi.documents('plugin::users-permissions.user').create({
          data: {
            username: createUser.username,
            email: createUser.email,
            password: createUser.password,
            confirmed: createUser.confirmed !== undefined ? createUser.confirmed : true,
            blocked: createUser.blocked !== undefined ? createUser.blocked : false,
            role: createUser.role || 1, // Default role
            type: 'customer' // Sử dụng customer type cho player
          }
        });
        finalUserId = newUser.id;
      } catch (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }
    } else if (userId) {
      // Kiểm tra user có tồn tại không (nếu có userId)
      const targetUser = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: userId
      });

      if (!targetUser) {
        throw new Error('User not found');
      }
      finalUserId = userId;
    }
    // Nếu không có createUser và userId, finalUserId sẽ là null (player không có user)

    // Tạo player mới
    const player = await strapi.documents('api::player.player').create({
      data: {
        ...playerData,
        slug,
        system_tournaments: [systemTournamentId],
        users_permissions_user: finalUserId
      },
      populate: {
        avatar: true,
        system_tournaments: true,
        users_permissions_user: true
      }
    });

    return player;
  },

  // Cập nhật player theo system-tournament
  async updateForSystemTournament({ id, systemTournamentId, updateData, user }) {
    // Kiểm tra system-tournament có tồn tại không
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to update players in this system tournament');
    }

    // Kiểm tra player có thuộc system-tournament này không
    const existingPlayer: any = await strapi.documents('api::player.player').findOne({
      documentId: id,
      populate: {
        system_tournaments: true
      }
    });

    if (!existingPlayer) {
      throw new Error('Player not found');
    }

    const isInSystemTournament = existingPlayer.system_tournaments.some(
      (st: any) => st.id === parseInt(systemTournamentId)
    );

    if (!isInSystemTournament) {
      throw new Error('Player does not belong to this system tournament');
    }

    // Tạo slug mới nếu name được cập nhật
    let updatedData = { ...updateData };
    if (updateData.name && updateData.name !== existingPlayer.name) {
      const baseSlug = generateSlug(updateData.name);
      // Thêm timestamp để đảm bảo unique
      updatedData.slug = `${baseSlug}-${Date.now()}`;
    }

    // Cập nhật player
    const updatedPlayer = await strapi.documents('api::player.player').update({
      documentId: id,
      data: updatedData,
      populate: {
        avatar: true,
        system_tournaments: true
      }
    });

    return updatedPlayer;
  },

  // Xóa player khỏi system-tournament (chỉ xóa liên kết, không xóa player)
  async deleteFromSystemTournament({ id, systemTournamentId, user }) {
    // Kiểm tra system-tournament có tồn tại không
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to remove players from this system tournament');
    }

    const player: any = await strapi.documents('api::player.player').findOne({
      documentId: id,
      populate: {
        system_tournaments: true
      }
    });

    if (!player) {
      throw new Error('Player not found');
    }

    // Lọc bỏ system-tournament khỏi danh sách
    const updatedSystemTournaments = player.system_tournaments
      .filter((st: any) => st.id !== parseInt(systemTournamentId))
      .map((st: any) => st.id);

    // Cập nhật player với danh sách system-tournaments mới
    await strapi.documents('api::player.player').update({
      documentId: id,
      data: {
        system_tournaments: updatedSystemTournaments
      }
    });

    return true;
  },

  // Thêm player vào system-tournament
  async addToSystemTournament({ id, systemTournamentId, user }) {
    // Kiểm tra system-tournament có tồn tại không
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to add players to this system tournament');
    }

    const player: any = await strapi.documents('api::player.player').findOne({
      documentId: id,
      populate: {
        system_tournaments: true
      }
    });

    if (!player) {
      throw new Error('Player not found');
    }

    // Kiểm tra player đã có trong system-tournament chưa
    const isAlreadyInSystemTournament = player.system_tournaments.some(
      (st: any) => st.id === parseInt(systemTournamentId)
    );

    if (isAlreadyInSystemTournament) {
      throw new Error('Player is already in this system tournament');
    }

    // Thêm system-tournament vào danh sách
    const updatedSystemTournaments = [
      ...player.system_tournaments.map((st: any) => st.id),
      parseInt(systemTournamentId)
    ];

    const updatedPlayer = await strapi.documents('api::player.player').update({
      documentId: id,
      data: {
        system_tournaments: updatedSystemTournaments
      },
      populate: {
        avatar: true,
        system_tournaments: true
      }
    });

    return updatedPlayer;
  },

  // Lấy thông tin chi tiết player theo system-tournament
  async findOneBySystemTournament({ id, systemTournamentId, user }) {
    // Kiểm tra system-tournament có tồn tại không
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to access this system tournament');
    }

    const player: any = await strapi.documents('api::player.player').findOne({
      documentId: id,
      populate: {
        avatar: true,
        system_tournaments: true,
        tournaments: true,
        matches: true,
        users_permissions_user: true
      }
    });

    if (!player) {
      return null;
    }

    // Kiểm tra player có thuộc system-tournament này không
    const isInSystemTournament = player.system_tournaments.some(
      (st: any) => st.id === parseInt(systemTournamentId)
    );

    if (!isInSystemTournament) {
      return null;
    }

    return player;
  },

  // Tìm kiếm players trong system-tournament
  async searchInSystemTournament({ systemTournamentId, query, page = 1, pageSize = 10, user, filters = {} }: {
    systemTournamentId: string;
    query?: string;
    page?: number;
    pageSize?: number;
    user: any;
    filters?: {
      name?: string;
      rankLevel?: string;
      countryCode?: string;
      gender?: string;
      statusPlayer?: string;
    };
  }) {
    // Kiểm tra system-tournament có tồn tại không
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to search players in this system tournament');
    }

    const start = (page - 1) * pageSize;
    const limit = pageSize;

    // Xây dựng query dựa trên việc có query hay không
    let searchQuery: any = {
      filters: {
        system_tournaments: {
          id: systemTournament.id
        }
      },
      sort: 'createdAt:desc',
      start,
      limit,
      populate: {
        avatar: true,
        system_tournaments: true
      }
    };

    // Thêm filters cụ thể nếu có
    if (filters && Object.keys(filters).length > 0) {
      // Xử lý từng filter cụ thể
      if (filters.name) {
        searchQuery.filters.name = {
          $containsi: filters.name
        };
      }
      
      if (filters.rankLevel) {
        searchQuery.filters.rankLevel = {
          $containsi: filters.rankLevel
        };
      }
      
      if (filters.countryCode) {
        searchQuery.filters.countryCode = {
          $containsi: filters.countryCode
        };
      }
      
      if (filters.gender) {
        searchQuery.filters.gender = {
          $containsi: filters.gender
        };
      }
      
      if (filters.statusPlayer) {
        searchQuery.filters.statusPlayer = {
          $containsi: filters.statusPlayer
        };
      }
    }
    // Nếu không có filters cụ thể, sử dụng query chung
    else if (query && query.trim() !== '') {
      searchQuery.filters.$or = [
        {
          name: {
            $containsi: query.trim()
          }
        },
        {
          rankLevel: {
            $containsi: query.trim()
          }
        },
        {
          countryCode: {
            $containsi: query.trim()
          }
        },
        {
          gender: {
            $containsi: query.trim()
          }
        }
      ];
    }

    const players = await strapi.documents('api::player.player').findMany(searchQuery);
    
    // Calculate pagination manually since findMany doesn't return pagination
    const total = players.length;
    const pageCount = Math.ceil(total / pageSize);
    
    return { 
      results: players, 
      pagination: {
        page,
        pageSize,
        pageCount,
        total
      }
    };
  },

  // Lấy thống kê players trong system-tournament
  async getStatsBySystemTournament({ systemTournamentId, user }) {
    // Kiểm tra system-tournament có tồn tại không
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to access stats for this system tournament');
    }

    const players: any[] = await strapi.documents('api::player.player').findMany({
      filters: {
        system_tournaments: {
          id: systemTournamentId
        }
      },
      populate: {
        matches: true
      }
    });

    const stats = {
      totalPlayers: players.length,
      activePlayers: players.filter(p => p.statusPlayer === 'Active').length,
      inactivePlayers: players.filter(p => p.statusPlayer === 'Inactive').length,
      suspendedPlayers: players.filter(p => p.statusPlayer === 'Suspended').length,
      malePlayers: players.filter(p => p.gender === 'Male').length,
      femalePlayers: players.filter(p => p.gender === 'Female').length,
      otherGenderPlayers: players.filter(p => p.gender === 'Other').length,
      playersWithMatches: players.filter(p => p.matches && p.matches.length > 0).length,
      averageRankPoint: players.length > 0 
        ? Math.round(players.reduce((sum, p) => sum + (p.rankPoint || 0), 0) / players.length)
        : 0
    };

    return stats;
  },

  // Gán user cho player
  async assignUserToPlayer({ playerId, userId, systemTournamentId, user }) {
    // Kiểm tra system-tournament có tồn tại không
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to assign users to players in this system tournament');
    }

    // Kiểm tra player có tồn tại và thuộc system-tournament không
    const player: any = await strapi.documents('api::player.player').findOne({
      documentId: playerId,
      populate: {
        system_tournaments: true,
        users_permissions_user: true
      }
    });

    if (!player) {
      throw new Error('Player not found');
    }

    const isInSystemTournament = player.system_tournaments.some(
      (st: any) => st.id === parseInt(systemTournamentId)
    );

    if (!isInSystemTournament) {
      throw new Error('Player does not belong to this system tournament');
    }

    // Kiểm tra user có tồn tại không
    const targetUser = await strapi.documents('plugin::users-permissions.user').findOne({
      documentId: userId
    });

    if (!targetUser) {
      throw new Error('User not found');
    }

    // Kiểm tra player đã có user chưa
    if (player.users_permissions_user) {
      throw new Error('Player already has an assigned user');
    }

    // Gán user cho player
    const updatedPlayer = await strapi.documents('api::player.player').update({
      documentId: playerId,
      data: {
        users_permissions_user: userId
      },
      populate: {
        avatar: true,
        system_tournaments: true,
        users_permissions_user: true
      }
    });

    return updatedPlayer;
  },

  // Hủy gán user khỏi player
  async unassignUserFromPlayer({ playerId, systemTournamentId, user }) {
    // Kiểm tra system-tournament có tồn tại không
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to unassign users from players in this system tournament');
    }

    // Kiểm tra player có tồn tại và thuộc system-tournament không
    const player: any = await strapi.documents('api::player.player').findOne({
      documentId: playerId,
      populate: {
        system_tournaments: true,
        users_permissions_user: true
      }
    });

    if (!player) {
      throw new Error('Player not found');
    }

    const isInSystemTournament = player.system_tournaments.some(
      (st: any) => st.id === parseInt(systemTournamentId)
    );

    if (!isInSystemTournament) {
      throw new Error('Player does not belong to this system tournament');
    }

    // Kiểm tra player có user không
    if (!player.users_permissions_user) {
      throw new Error('Player does not have an assigned user');
    }

    // Hủy gán user khỏi player
    const updatedPlayer = await strapi.documents('api::player.player').update({
      documentId: playerId,
      data: {
        users_permissions_user: null
      },
      populate: {
        avatar: true,
        system_tournaments: true,
        users_permissions_user: true
      }
    });

    return updatedPlayer;
  },

  // Cập nhật player với user mới
  async updatePlayerWithUser({ playerId, userId, systemTournamentId, user }) {
    // Kiểm tra system-tournament có tồn tại không
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to update players with users in this system tournament');
    }

    // Kiểm tra player có tồn tại và thuộc system-tournament không
    const player: any = await strapi.documents('api::player.player').findOne({
      documentId: playerId,
      populate: {
        system_tournaments: true,
        users_permissions_user: true
      }
    });

    if (!player) {
      throw new Error('Player not found');
    }

    const isInSystemTournament = player.system_tournaments.some(
      (st: any) => st.id === parseInt(systemTournamentId)
    );

    if (!isInSystemTournament) {
      throw new Error('Player does not belong to this system tournament');
    }

    // Kiểm tra user có tồn tại không (nếu có userId)
    if (userId) {
      const targetUser = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: userId
      });

      if (!targetUser) {
        throw new Error('User not found');
      }
    }

    // Cập nhật user cho player
    const updatedPlayer = await strapi.documents('api::player.player').update({
      documentId: playerId,
      data: {
        users_permissions_user: userId || null
      },
      populate: {
        avatar: true,
        system_tournaments: true,
        users_permissions_user: true
      }
    });

    return updatedPlayer;
  },

  // Lấy danh sách players có user được gán trong system-tournament
  async findPlayersWithUsers({ systemTournamentId, page = 1, pageSize = 10, user }) {
    // Kiểm tra system-tournament có tồn tại không
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to access players with users in this system tournament');
    }

    const start = (page - 1) * pageSize;
    const limit = pageSize;

    const query: any = {
      filters: {
        system_tournaments: {
          id: systemTournamentId
        },
        users_permissions_user: {
          $notNull: true
        }
      },
      sort: 'createdAt:desc',
      start,
      limit,
      populate: {
        avatar: true,
        system_tournaments: true,
        users_permissions_user: true
      }
    };

    const players = await strapi.documents('api::player.player').findMany(query);
    
    // Calculate pagination manually since findMany doesn't return pagination
    const total = players.length;
    const pageCount = Math.ceil(total / pageSize);
    
    return { 
      results: players, 
      pagination: {
        page,
        pageSize,
        pageCount,
        total
      }
    };
  },

  // Lấy danh sách players chưa có user được gán trong system-tournament
  async findPlayersWithoutUsers({ systemTournamentId, page = 1, pageSize = 10, user }) {
    // Kiểm tra system-tournament có tồn tại không
    const systemTournament = await strapi.documents('api::system-tournament.system-tournament').findOne({
      documentId: systemTournamentId
    });
    if (!systemTournament) {
      throw new Error('System tournament not found');
    }

    // Đảm bảo user.documentId = userId trong system-tournament
    if (systemTournament.userId !== user.documentId) {
      throw new Error('Access denied: User does not have permission to access players without users in this system tournament');
    }

    const start = (page - 1) * pageSize;
    const limit = pageSize;

    const query: any = {
      filters: {
        system_tournaments: {
          id: systemTournamentId
        },
        users_permissions_user: {
          $null: true
        }
      },
      sort: 'createdAt:desc',
      start,
      limit,
      populate: {
        avatar: true,
        system_tournaments: true,
        users_permissions_user: true
      }
    };

    const players = await strapi.documents('api::player.player').findMany(query);
    
    // Calculate pagination manually since findMany doesn't return pagination
    const total = players.length;
    const pageCount = Math.ceil(total / pageSize);
    
    return { 
      results: players, 
      pagination: {
        page,
        pageSize,
        pageCount,
        total
      }
    };
  }
  };
});
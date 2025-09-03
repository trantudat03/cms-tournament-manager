import { TournamentBracket } from '../../../utils/tournament-bracket';

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
    const { name, maxParticipants } = ctx.request.body;
    const user = ctx.state.user;

    try {
      if (!user) {
        return ctx.unauthorized("Missing or invalid JWT");
      }

      // Kiểm tra thông tin bắt buộc từ body
      if (!maxParticipants || maxParticipants <= 0) {
        return ctx.badRequest('maxParticipants is required and must be greater than 0');
      }

      // Lấy tournament
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: String(id),
        populate: {
          brackets: {
            populate: {
              rounds: {
                populate: {
                  matches: true
                }
              }
            }
          },
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

      // Cho phép tạo nhiều bracket - không cần kiểm tra giới hạn
      // Logic này cho phép tournament có nhiều bracket (ví dụ: Main Bracket, Consolation Bracket, etc.)

      // Tạo bracket sử dụng document API với thông tin từ body
      const bracket = await TournamentBracket.createBracket(
        tournament.documentId,
        maxParticipants,
        name
      );

      // Lấy tournament đã cập nhật với bracket
      const updatedTournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: String(id),
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
          }
        }
      });

      return ctx.send({
        data: updatedTournament,
        message: `Bracket "${bracket.bracket?.name || 'Main Bracket'}" created successfully`
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

      // Sử dụng document API để lấy tournament với kiểm tra matches
      await TournamentBracket.checkAndRegenerateMatches(id);
      
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: id,
        populate: {
          brackets: {
            populate: {
              rounds: {
                populate: {
                  matches: {
                    populate: '*'
                  }
                }
              },
              players: true
            }
          },
          system_tournament: true,
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

      return ctx.send({
        data: tournament
      });
    } catch (error) {
      console.error('Get bracket error:', error);
      return ctx.badRequest('Failed to get tournament bracket', { error: error.message });
    }
  },

  // Thêm endpoints mới cho quản lý brackets
  async getTournamentBrackets(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;

    try {
      if (!user) {
        return ctx.unauthorized("Missing or invalid JWT");
      }

      // Sử dụng document API để lấy tournament với kiểm tra matches
      await TournamentBracket.checkAndRegenerateMatches(id);
      
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: id,
        populate: {
          brackets: {
            populate: {
              rounds: {
                populate: {
                  matches: {
                    populate: '*'
                  }
                }
              },
              players: true
            }
          },
          system_tournament: true,
        }
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Kiểm tra quyền truy cập
      const tournamentWithSystem = tournament as any;
      if (tournamentWithSystem.system_tournament?.userId !== user.documentId) {
        return ctx.forbidden("You are not allowed to access this tournament");
      }

      return ctx.send({
        data: tournament.brackets
      });
    } catch (error) {
      console.error('Get tournament brackets error:', error);
      return ctx.badRequest('Failed to get tournament brackets', { error: error.message });
    }
  },

  async createNewBracket(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    const { data } = ctx.request.body;

    try {
      if (!user) {
        return ctx.unauthorized("Missing or invalid JWT");
      }

      // Lấy tournament
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: String(id),
        populate: {
          system_tournament: true
        }
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Kiểm tra quyền truy cập
      const tournamentWithSystem = tournament as any;
      if (tournamentWithSystem.system_tournament?.userId !== user.documentId) {
        return ctx.forbidden("You are not allowed to access this tournament");
      }

      // Tạo bracket mới sử dụng document API
      const bracket = await TournamentBracket.createNewBracket(id, data);

      return ctx.send({
        data: bracket,
        message: 'Bracket created successfully'
      });
    } catch (error) {
      console.error('Create new bracket error:', error);
      return ctx.badRequest('Failed to create new bracket', { error: error.message });
    }
  },

  // Thêm endpoint để tái tạo matches cho bracket
  async regenerateBracketMatches(ctx) {
    const { id, bracketId } = ctx.params;
    const user = ctx.state.user;

    try {
      if (!user) {
        return ctx.unauthorized("Missing or invalid JWT");
      }

      // Lấy tournament
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: String(id),
        populate: {
          system_tournament: true
        }
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Kiểm tra quyền truy cập
      const tournamentWithSystem = tournament as any;
      if (tournamentWithSystem.system_tournament?.userId !== user.documentId) {
        return ctx.forbidden("You are not allowed to access this tournament");
      }

      // Tái tạo matches cho bracket sử dụng document API
      const result = await TournamentBracket.regenerateMatches(
        bracketId, 
        tournament.maxParticipants
      );

      return ctx.send({
        data: result,
        message: 'Bracket matches regenerated successfully'
      });
    } catch (error) {
      console.error('Regenerate bracket matches error:', error);
      return ctx.badRequest('Failed to regenerate bracket matches', { error: error.message });
    }
  },

  // Thêm endpoint để kiểm tra và tái tạo matches cho toàn bộ tournament
  async checkAndRegenerateMatches(ctx) {
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
          system_tournament: true
        }
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Kiểm tra quyền truy cập
      const tournamentWithSystem = tournament as any;
      if (tournamentWithSystem.system_tournament?.userId !== user.documentId) {
        return ctx.forbidden("You are not allowed to access this tournament");
      }

      // Kiểm tra và tái tạo matches sử dụng document API
      const results = await TournamentBracket.checkAndRegenerateMatches(id);

      return ctx.send({
        data: results,
        message: 'Tournament matches checked and regenerated successfully'
      });
    } catch (error) {
      console.error('Check and regenerate matches error:', error);
      return ctx.badRequest('Failed to check and regenerate matches', { error: error.message });
    }
  },

  // Thêm player vào tournament
  async addPlayerToTournament(ctx) {
    const { id, playerId } = ctx.params;
    const user = ctx.state.user;

    try {
      if (!user) {
        return ctx.unauthorized("Missing or invalid JWT");
      }

      // Lấy tournament
      const tournament: any = await strapi.documents('api::tournament.tournament').findOne({
        documentId: id,
        populate: {
          system_tournament: true,
          players: true
        }
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Kiểm tra quyền truy cập
      if (tournament.system_tournament?.userId !== user.documentId) {
        return ctx.forbidden("You are not allowed to access this tournament");
      }

      // Kiểm tra player có tồn tại không
      const player = await strapi.documents('api::player.player').findOne({
        documentId: playerId,
        populate: {
          system_tournaments: true
        }
      });

      if (!player) {
        return ctx.notFound('Player not found');
      }

      // Kiểm tra player có thuộc system-tournament này không
      const playerWithSystem: any = player;
      const isInSystemTournament = playerWithSystem.system_tournaments.some(
        (st: any) => st.id === tournament.system_tournament.id
      );

      if (!isInSystemTournament) {
        return ctx.badRequest('Player does not belong to this system tournament');
      }

      // Kiểm tra player đã có trong tournament chưa
      const isAlreadyInTournament = tournament.players.some(
        (p: any) => p.documentId === playerId
      );

      if (isAlreadyInTournament) {
        return ctx.badRequest('Player is already in this tournament');
      }

      // Kiểm tra số lượng participants
      if (tournament.maxParticipants && tournament.players.length >= tournament.maxParticipants) {
        return ctx.badRequest('Tournament is full. Cannot add more players');
      }

      // Thêm player vào tournament
      const updatedPlayers = [
        ...tournament.players.map((p: any) => p.documentId),
        playerId
      ];

      const updatedTournament = await strapi.documents('api::tournament.tournament').update({
        documentId: id,
        data: {
          players: updatedPlayers,
          currentParticipants: tournament.players.length + 1
        },
        populate: {
          players: {
            populate: {
              avatar: true,
              system_tournaments: true
            }
          },
          system_tournament: true
        }
      });

      return ctx.send({
        data: updatedTournament,
        message: 'Player added to tournament successfully'
      });
    } catch (error) {
      console.error('Add player to tournament error:', error);
      return ctx.badRequest('Failed to add player to tournament', { error: error.message });
    }
  },

  // Xóa player khỏi tournament
  async removePlayerFromTournament(ctx) {
    const { id, playerId } = ctx.params;
    const user = ctx.state.user;

    try {
      if (!user) {
        return ctx.unauthorized("Missing or invalid JWT");
      }

      // Lấy tournament
      const tournament: any = await strapi.documents('api::tournament.tournament').findOne({
        documentId: id,
        populate: {
          system_tournament: true,
          players: true
        }
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Kiểm tra quyền truy cập
      if (tournament.system_tournament?.userId !== user.documentId) {
        return ctx.forbidden("You are not allowed to access this tournament");
      }

      // Kiểm tra player có trong tournament không
      const isInTournament = tournament.players.some(
        (p: any) => p.documentId === playerId
      );

      if (!isInTournament) {
        return ctx.badRequest('Player is not in this tournament');
      }

      // Xóa player khỏi tournament
      const updatedPlayers = tournament.players
        .filter((p: any) => p.documentId !== playerId)
        .map((p: any) => p.documentId);

      const updatedTournament = await strapi.documents('api::tournament.tournament').update({
        documentId: id,
        data: {
          players: updatedPlayers,
          currentParticipants: tournament.players.length - 1
        },
        populate: {
          players: {
            populate: {
              avatar: true,
              system_tournaments: true
            }
          },
          system_tournament: true
        }
      });

      return ctx.send({
        data: updatedTournament,
        message: 'Player removed from tournament successfully'
      });
    } catch (error) {
      console.error('Remove player from tournament error:', error);
      return ctx.badRequest('Failed to remove player from tournament', { error: error.message });
    }
  },

  // Lấy danh sách players trong tournament
  async getTournamentPlayers(ctx) {
    const { id } = ctx.params;
    const { page = 1, pageSize = 10, sort = 'createdAt:desc', query, name, rankLevel, countryCode, gender, statusPlayer } = ctx.query;
    const user = ctx.state.user;

    try {
      if (!user) {
        return ctx.unauthorized("Missing or invalid JWT");
      }

      // Lấy tournament
      const tournament: any = await strapi.documents('api::tournament.tournament').findOne({
        documentId: id,
        populate: {
          system_tournament: true
        }
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Kiểm tra quyền truy cập
      if (tournament.system_tournament?.userId !== user.documentId) {
        return ctx.forbidden("You are not allowed to access this tournament");
      }

      // Xây dựng filters object từ query parameters
      const filters: any = {
        tournaments: {
          documentId: id
        }
      };

      // Thêm các filter bổ sung
      if (query) {
        filters.$or = [
          { name: { $containsi: query } },
          { rankLevel: { $containsi: query } },
          { countryCode: { $containsi: query } }
        ];
      }
      if (name) filters.name = { $containsi: name as string };
      if (rankLevel) filters.rankLevel = { $containsi: rankLevel as string };
      if (countryCode) filters.countryCode = { $containsi: countryCode as string };
      if (gender) filters.gender = { $containsi: gender as string };
      if (statusPlayer) filters.statusPlayer = { $containsi: statusPlayer as string };

      // Lấy danh sách players với pagination
      const start = (parseInt(page as string) - 1) * parseInt(pageSize as string);
      const limit = parseInt(pageSize as string);

      // Parse sort parameter
      let sortArray = [];
      if (sort) {
        const [field, order] = (sort as string).split(':');
        sortArray = [{ [field]: order || 'desc' }];
      } else {
        sortArray = [{ createdAt: 'desc' }];
      }

      const players = await strapi.documents('api::player.player').findMany({
        filters,
        sort: sortArray,
        start,
        limit,
        populate: {
          avatar: true,
          system_tournaments: true,
          tournaments: true,
          matches: true
        }
      });

      // Đếm tổng số players
      const total = await strapi.documents('api::player.player').count({ filters });

      return ctx.send({
        data: players,
        meta: {
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            pageCount: Math.ceil(total / parseInt(pageSize as string)),
            total
          }
        }
      });
    } catch (error) {
      console.error('Get tournament players error:', error);
      return ctx.badRequest('Failed to get tournament players', { error: error.message });
    }
  },

  // Lấy danh sách players có trong system-tournament nhưng không có trong tournament
  async getAvailablePlayersForTournament(ctx) {
    const { id } = ctx.params;
    const { page = 1, pageSize = 10, sort = 'createdAt:desc', query, name, rankLevel, countryCode, gender, statusPlayer } = ctx.query;
    const user = ctx.state.user;

    try {
      if (!user) {
        return ctx.unauthorized("Missing or invalid JWT");
      }

      // Lấy tournament
      const tournament: any = await strapi.documents('api::tournament.tournament').findOne({
        documentId: id,
        populate: {
          system_tournament: true,
          players: true
        }
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Kiểm tra quyền truy cập
      if (tournament.system_tournament?.userId !== user.documentId) {
        return ctx.forbidden("You are not allowed to access this tournament");
      }

      // Xây dựng filters object từ query parameters
      const filters: any = {
        system_tournaments: {
          id: tournament.system_tournament.id
        }
      };

      // Thêm các filter bổ sung
      if (query) {
        filters.$or = [
          { name: { $containsi: query } },
          { rankLevel: { $containsi: query } },
          { countryCode: { $containsi: query } }
        ];
      }
      if (name) filters.name = { $containsi: name as string };
      if (rankLevel) filters.rankLevel = { $containsi: rankLevel as string };
      if (countryCode) filters.countryCode = { $containsi: countryCode as string };
      if (gender) filters.gender = { $containsi: gender as string };
      if (statusPlayer) filters.statusPlayer = { $containsi: statusPlayer as string };

      // Lấy tất cả players trong system-tournament
      const allPlayers = await strapi.documents('api::player.player').findMany({
        filters,
        populate: {
          avatar: true,
          system_tournaments: true,
          tournaments: true,
          matches: true
        }
      });

      // Lọc ra players không có trong tournament hiện tại
      const availablePlayers = allPlayers.filter((player: any) => {
        return !player.tournaments.some((t: any) => t.documentId === id);
      });

      // Áp dụng sorting
      const sortedPlayers = availablePlayers.sort((a: any, b: any) => {
        const [field, order] = (sort as string).split(':');
        const aValue = a[field];
        const bValue = b[field];
        
        if (order === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Áp dụng pagination
      const start = (parseInt(page as string) - 1) * parseInt(pageSize as string);
      const limit = parseInt(pageSize as string);
      const players = sortedPlayers.slice(start, start + limit);

      // Đếm tổng số players
      const total = availablePlayers.length;

      return ctx.send({
        data: players,
        meta: {
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            pageCount: Math.ceil(total / parseInt(pageSize as string)),
            total
          }
        }
      });
    } catch (error) {
      console.error('Get available players for tournament error:', error);
      return ctx.badRequest('Failed to get available players for tournament', { error: error.message });
    }
  },

  // Thêm nhiều players vào tournament
  async addMultiplePlayersToTournament(ctx) {
    const { id } = ctx.params;
    const { playerIds } = ctx.request.body;
    const user = ctx.state.user;

    try {
      if (!user) {
        return ctx.unauthorized("Missing or invalid JWT");
      }

      if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
        return ctx.badRequest('playerIds must be a non-empty array');
      }

      // Lấy tournament
      const tournament: any = await strapi.documents('api::tournament.tournament').findOne({
        documentId: id,
        populate: {
          system_tournament: true,
          players: true
        }
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Kiểm tra quyền truy cập
      if (tournament.system_tournament?.userId !== user.documentId) {
        return ctx.forbidden("You are not allowed to access this tournament");
      }

      // Kiểm tra số lượng participants
      if (tournament.maxParticipants && 
          tournament.players.length + playerIds.length > tournament.maxParticipants) {
        return ctx.badRequest(`Cannot add ${playerIds.length} players. Tournament capacity would be exceeded.`);
      }

      // Lấy thông tin tất cả players
      const players = await strapi.documents('api::player.player').findMany({
        filters: {
          documentId: {
            $in: playerIds
          }
        },
        populate: {
          system_tournaments: true
        }
      });

      if (players.length !== playerIds.length) {
        return ctx.badRequest('Some players not found');
      }

      // Kiểm tra tất cả players có thuộc system-tournament này không
      const invalidPlayers = players.filter((player: any) => {
        return !player.system_tournaments.some(
          (st: any) => st.id === tournament.system_tournament.id
        );
      });

      if (invalidPlayers.length > 0) {
        return ctx.badRequest('Some players do not belong to this system tournament');
      }

      // Kiểm tra players đã có trong tournament chưa
      const existingPlayerIds = tournament.players.map((p: any) => p.documentId);
      const duplicatePlayers = playerIds.filter(id => existingPlayerIds.includes(id));

      if (duplicatePlayers.length > 0) {
        return ctx.badRequest(`Players with IDs [${duplicatePlayers.join(', ')}] are already in this tournament`);
      }

      // Thêm players vào tournament
      const updatedPlayers = [
        ...tournament.players.map((p: any) => p.documentId),
        ...playerIds
      ];

      const updatedTournament = await strapi.documents('api::tournament.tournament').update({
        documentId: id,
        data: {
          players: updatedPlayers,
          currentParticipants: tournament.players.length + playerIds.length
        },
        populate: {
          players: {
            populate: {
              avatar: true,
              system_tournaments: true
            }
          },
          system_tournament: true
        }
      });

      return ctx.send({
        data: updatedTournament,
        message: `${playerIds.length} players added to tournament successfully`
      });
    } catch (error) {
      console.error('Add multiple players to tournament error:', error);
      return ctx.badRequest('Failed to add players to tournament', { error: error.message });
    }
  },
}; 
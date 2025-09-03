/**
 * player-custom routes
 */

export default {
  routes: [
    // Lấy danh sách players theo system-tournament
    {
      method: 'GET',
      path: '/players/system-tournament/:systemTournamentId',
      handler: 'player-custom.findBySystemTournament',
      config: {
        auth: {},
      },
    },
    // Tạo player mới và liên kết với system-tournament
    {
      method: 'POST',
      path: '/players/system-tournament/:systemTournamentId',
      handler: 'player-custom.createForSystemTournament',
      config: {
        auth: {},
      },
    },
    // Cập nhật player theo system-tournament
    {
      method: 'PUT',
      path: '/players/:id/system-tournament/:systemTournamentId',
      handler: 'player-custom.updateForSystemTournament',
      config: {
        auth: {},
      },
    },
    // Xóa player khỏi system-tournament
    {
      method: 'DELETE',
      path: '/players/:id/system-tournament/:systemTournamentId',
      handler: 'player-custom.deleteFromSystemTournament',
      config: {
        auth: {},
      },
    },
    // Thêm player vào system-tournament
    {
      method: 'POST',
      path: '/players/:id/system-tournament/:systemTournamentId/add',
      handler: 'player-custom.addToSystemTournament',
      config: {
        auth: {},
      },
    },
    // Lấy thông tin chi tiết player theo system-tournament
    {
      method: 'GET',
      path: '/players/:id/system-tournament/:systemTournamentId',
      handler: 'player-custom.findOneBySystemTournament',
      config: {
        auth: {},
      },
    },
    // Tìm kiếm players trong system-tournament
    {
      method: 'GET',
      path: '/players/system-tournament/:systemTournamentId/search',
      handler: 'player-custom.searchInSystemTournament',
      config: {
        auth: {},
      },
    },
    // Lấy thống kê players trong system-tournament
    {
      method: 'GET',
      path: '/players/system-tournament/:systemTournamentId/stats',
      handler: 'player-custom.getStatsBySystemTournament',
      config: {
        auth: {},
      },
    },
    // Gán user cho player
    {
      method: 'POST',
      path: '/players/:playerId/system-tournament/:systemTournamentId/assign-user',
      handler: 'player-custom.assignUserToPlayer',
      config: {
        auth: {},
      },
    },
    // Hủy gán user khỏi player
    {
      method: 'DELETE',
      path: '/players/:playerId/system-tournament/:systemTournamentId/unassign-user',
      handler: 'player-custom.unassignUserFromPlayer',
      config: {
        auth: {},
      },
    },
    // Cập nhật player với user mới
    {
      method: 'PUT',
      path: '/players/:playerId/system-tournament/:systemTournamentId/update-user',
      handler: 'player-custom.updatePlayerWithUser',
      config: {
        auth: {},
      },
    },
    // Lấy danh sách players có user được gán trong system-tournament
    {
      method: 'GET',
      path: '/players/system-tournament/:systemTournamentId/with-users',
      handler: 'player-custom.findPlayersWithUsers',
      config: {
        auth: {},
      },
    },
    // Lấy danh sách players chưa có user được gán trong system-tournament
    {
      method: 'GET',
      path: '/players/system-tournament/:systemTournamentId/without-users',
      handler: 'player-custom.findPlayersWithoutUsers',
      config: {
        auth: {},
      },
    },
  ],
}; 
export default {
  routes: [
    {
      method: 'GET',
      path: '/tournaments/search',
      handler: 'tournament-custom.findWithSearch',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/tournaments/document/:documentId',
      handler: 'tournament-custom.findByDocumentId',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/tournaments/document/:documentId',
      handler: 'tournament-custom.updateByDocumentId',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/tournaments/:id/create-bracket',
      handler: 'tournament-custom.createBracket',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/tournaments/:id/bracket',
      handler: 'tournament-custom.getBracket',
      config: {
        auth: {},
      },
    },
    // Thêm player vào tournament
    {
      method: 'POST',
      path: '/tournaments/:id/players/:playerId/add',
      handler: 'tournament-custom.addPlayerToTournament',
      config: {
        auth: {},
      },
    },
    // Xóa player khỏi tournament
    {
      method: 'DELETE',
      path: '/tournaments/:id/players/:playerId/remove',
      handler: 'tournament-custom.removePlayerFromTournament',
      config: {
        auth: {},
      },
    },
    // Lấy danh sách players trong tournament
    {
      method: 'GET',
      path: '/tournaments/:id/players',
      handler: 'tournament-custom.getTournamentPlayers',
      config: {
        auth: {},
      },
    },
    // Lấy danh sách players có trong system-tournament nhưng không có trong tournament
    {
      method: 'GET',
      path: '/tournaments/:id/players/available',
      handler: 'tournament-custom.getAvailablePlayersForTournament',
      config: {
        auth: {},
      },
    },
    // Thêm nhiều players vào tournament
    {
      method: 'POST',
      path: '/tournaments/:id/players/bulk-add',
      handler: 'tournament-custom.addMultiplePlayersToTournament',
      config: {
        auth: {},
      },
    },
  ],
}; 
/**
 * round custom routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/rounds/tournament/:tournamentId',
      handler: 'round-custom.findByTournament',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/rounds/with-populate',
      handler: 'round-custom.findAllWithPopulate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 
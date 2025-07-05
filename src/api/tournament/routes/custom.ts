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
  ],
}; 
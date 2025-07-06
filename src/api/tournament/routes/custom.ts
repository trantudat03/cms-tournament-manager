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
  ],
}; 
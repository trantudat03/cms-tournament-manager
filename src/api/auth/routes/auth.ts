export default {
  routes: [
    {
      method: 'POST',
      path: '/auth/local/register',
      handler: 'auth.register',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/auth/search-user',
      handler: 'auth.searchUser',
      config: {
        auth: {},
      },
    },
  ],
}; 
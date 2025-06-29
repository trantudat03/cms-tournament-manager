export default (config, { strapi }) => {
  return async (ctx, next) => {
    // Only apply to register endpoint
    if (ctx.request.url === '/api/auth/local/register' && ctx.request.method === 'POST') {
      const { numberphone, type, ...otherParams } = ctx.request.body;
      
      // Validate phone number if provided
      if (numberphone) {
        if (numberphone.length < 10 || numberphone.length > 12) {
          return ctx.badRequest('Phone number must be between 10-12 characters');
        }
      }

      // Add custom fields to request body
      ctx.request.body = {
        ...otherParams,
        numberphone: numberphone || null,
        type: type || 'customer',
        provider: 'local'
      };
    }

    await next();
  };
}; 
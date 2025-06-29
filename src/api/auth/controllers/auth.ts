import { factories } from '@strapi/strapi';

export default factories.createCoreController('plugin::users-permissions.user', ({ strapi }) => ({
  async register(ctx) {
    const pluginStore = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
    });

    const settings = await pluginStore.get({
      key: 'advanced',
    }) as any;

    if (!settings.allow_register) {
      throw new Error('Register action is currently disabled');
    }

    // Lấy role mặc định (authenticated)
    const defaultRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } });

    const params = {
      ...ctx.request.body,
      provider: 'local',
      role: defaultRole ? defaultRole.id : undefined, // Gán role mặc định
    };

    // Add custom fields validation
    if (params.numberphone) {
      if (params.numberphone.length < 10 || params.numberphone.length > 12) {
        return ctx.badRequest('Phone number must be between 10-12 characters');
      }
    }

    const user = await strapi.plugins['users-permissions'].services.user.add(params);

    // Tự loại bỏ các trường nhạy cảm
    const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user;

    if (settings.email_confirmation) {
      try {
        await strapi.plugins['users-permissions'].services.user.sendConfirmationEmail(sanitizedUser);
      } catch (err) {
        throw new Error(err.message);
      }

      return ctx.send({
        user: sanitizedUser,
      });
    }

    const jwt = strapi.plugins['users-permissions'].services.jwt.issue({ id: user.id });

    return ctx.send({
      jwt,
      user: sanitizedUser,
    });
  },
})); 
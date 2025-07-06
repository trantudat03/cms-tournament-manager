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

    // Kiểm tra nếu user có type là system-owner thì tạo system-tournament
    if (user.type === 'system-owner') {
      try {
        await strapi.documents('api::system-tournament.system-tournament').create({
          data: {
            name: `${user.username}'s System`,
            description: `System tournament for ${user.username}`,
            phoneNumber: user.numberphone || '',
            userId: user.documentId.toString(), // Sử dụng user.id thay vì documentId
            isUseTrial: true, // Mặc định sử dụng trial
            publishedAt: new Date(),
          },
        });
      } catch (error) {
        console.error('Error creating system-tournament:', error);
        // Không throw error để không ảnh hưởng đến việc tạo user
      }
    }

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
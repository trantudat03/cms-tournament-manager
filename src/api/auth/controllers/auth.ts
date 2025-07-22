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

    // Kiểm tra email đã tồn tại chưa
    const existingUsers = await strapi.documents('plugin::users-permissions.user').findMany({
      filters: { email: ctx.request.body.email },
    });
    const existingUser = existingUsers[0];

    if (existingUser) {
      return ctx.badRequest('Email already exists');
    }

    // Lấy role mặc định (authenticated)
    const defaultRoles = await strapi.documents('plugin::users-permissions.role').findMany({
      filters: { type: 'authenticated' },
    });
    const defaultRole = defaultRoles[0];

    const params = {
      ...ctx.request.body,
      provider: 'local',
      role: defaultRole ? defaultRole.documentId : undefined, // Gán role mặc định
    };

    // Add custom fields validation
    if (params.numberphone) {
      if (params.numberphone.length < 10 || params.numberphone.length > 12) {
        return ctx.badRequest('Phone number must be between 10-12 characters');
      }
    }

    const user = await strapi.documents('plugin::users-permissions.user').create({
      data: params,
    });

    // Kiểm tra nếu user có type là system-owner thì tạo system-tournament
    if (user.type === 'system-owner') {
      try {
        await strapi.documents('api::system-tournament.system-tournament').create({
          data: {
            name: `${user.username}'s System`,
            description: `System tournament for ${user.username}`,
            phoneNumber: user.numberphone || '',
            userId: user.documentId.toString(), // Sử dụng user.documentId
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

    const jwt = strapi.plugins['users-permissions'].services.jwt.issue({ id: user.documentId });

    return ctx.send({
      jwt,
      user: sanitizedUser,
    });
  },

  async searchUser(ctx) {
    try {
      // Kiểm tra quyền truy cập - chỉ system-owner mới được phép
      const user = ctx.state.user;
      if (!user || user.type !== 'system-owner') {
        return ctx.forbidden('Access denied. Only system-owner can search users.');
      }

      const { search } = ctx.query;

      // Kiểm tra tham số search phải được cung cấp
      if (!search) {
        return ctx.badRequest('Please provide search parameter');
      }

      const searchTerm = String(search);

      // Tìm kiếm users với $or để tìm trong cả email và numberphone
      const users = await strapi.documents('plugin::users-permissions.user').findMany({
        filters: {
          $or: [
            {
              email: {
                $contains: searchTerm
              }
            },
            {
              numberphone: {
                $contains: searchTerm
              }
            }
          ]
        },
        fields: ['id', 'username', 'email', 'numberphone'], // Chỉ trả về các trường yêu cầu
      });

      // Format kết quả trả về
      const formattedUsers = users.map(user => ({
        id: user.id,
        documentId: user.documentId, // Sử dụng id làm documentId
        username: user.username, // Sử dụng username làm name
        email: user.email,
        numberphone: user.numberphone // Sử dụng numberphone 
      }));

      return ctx.send({
        data: formattedUsers,
        meta: {
          count: formattedUsers.length
        }
      });

    } catch (error) {
      console.error('Error searching users:', error);
      return ctx.internalServerError('Internal server error');
    }
  },
})); 
export default {
  async findByCurrentUser(ctx) {
    // Lấy user từ JWT (ctx.state.user)
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("Missing or invalid JWT");
    }

    // Lấy query parameters cho phân trang
    const { page = 1, pageSize = 10 } = ctx.query;

    // Tìm các system-tournament có userId trùng với user.id với phân trang
    const entries = await strapi.entityService.findMany('api::system-tournament.system-tournament', {
      filters: { userId: user.documentId },
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      },
      populate: {
        logoSystem: true,
        tournaments: {
          populate: '*'
        },
        banner: true
      }
    });

    // Đếm tổng số bản ghi để trả về pagination (dùng query.count thay vì entityService.count)
    const total = await strapi.db.query('api::system-tournament.system-tournament').count({
      where: { userId: user.documentId }
    });
    const totalPage = Math.ceil(total / parseInt(pageSize));

    return ctx.send({
      data: entries,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPage
      }
    });
  },

  async createByCurrentUser(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("Missing or invalid JWT");
    }

    // Lấy AppSetting để lấy logo và banner mặc định
    const appSettings = await strapi.documents('api::app-setting.app-setting').findMany({
      populate: ['SystemTournamentDefaultLogo', 'SystemTournamentDefaultBanner']
    });
    let defaultLogo = null;
    let defaultBanner = null;

    if (appSettings && appSettings.length > 0) {
      const setting = appSettings[0];
      defaultLogo = setting.SystemTournamentDefaultLogo;
      defaultBanner = setting.SystemTournamentDefaultBanner;
    }

    // Lấy dữ liệu từ body và gán userId, logo, banner
    const data = {
      ...ctx.request.body.data,
      userId: user.documentId,
      // Chỉ gán logo và banner nếu field được truyền vào là null
      ...(defaultLogo && ctx.request.body.data?.logoSystem === null && { logoSystem: defaultLogo.id }),
      ...(defaultBanner && ctx.request.body.data?.banner === null && { banner: defaultBanner.id })
    };

    // Tạo system-tournament bằng Document Service API
    const entry = await strapi.documents('api::system-tournament.system-tournament').create({
      data,
      populate: {
        logoSystem: true,
        banner: true,
        tournaments: { populate: '*' },
        system_package: true
      }
    });

    // Publish document
    await strapi.documents('api::system-tournament.system-tournament').publish({
      documentId: entry.documentId
    });

    // Cập nhật type của user thành system-owner
    await strapi.documents('plugin::users-permissions.user').update({
      documentId: user.documentId,
      data: { type: 'system-owner' }
    });

    return ctx.send({ data: entry });
  },

  async updateByCurrentUser(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("Missing or invalid JWT");
    }

    const { id } = ctx.params;
    const uid = 'api::system-tournament.system-tournament';

    // Lấy document theo documentId bằng API mới
    const entity = await strapi.documents(uid).findOne({ documentId: id });
    if (!entity || entity.userId !== user.documentId) {
      return ctx.forbidden("You are not allowed to update this system-tournament");
    }

    // Lấy AppSetting để lấy logo và banner mặc định
    const appSettings = await strapi.documents('api::app-setting.app-setting').findMany({
      populate: ['SystemTournamentDefaultLogo', 'SystemTournamentDefaultBanner']
    });
    let defaultLogo = null;
    let defaultBanner = null;

    if (appSettings && appSettings.length > 0) {
      const setting = appSettings[0];
      defaultLogo = setting.SystemTournamentDefaultLogo;
      defaultBanner = setting.SystemTournamentDefaultBanner;
    }

    // Chuẩn bị data cập nhật
    const updateData = {
      ...ctx.request.body.data,
      // Chỉ gán logo và banner nếu field được truyền vào là null và có giá trị mặc định
      ...(defaultLogo && ctx.request.body.data?.logoSystem === null && { logoSystem: defaultLogo.id }),
      ...(defaultBanner && ctx.request.body.data?.banner === null && { banner: defaultBanner.id })
    };

    // Cập nhật bằng API mới
    const updated = await strapi.documents(uid).update({
      documentId: id,
      data: updateData,
      populate: {
        logoSystem: true,
        banner: true,
        tournaments: { populate: '*' },
        system_package: true
      }
    });

    return ctx.send({ data: updated });
  },

  async findTournaments(ctx) {
    const user = ctx.state.user;
    if (!user || user.type !== 'system-owner') {
      return ctx.unauthorized("Only system-owner can access this resource");
    }

    const { page = 1, pageSize = 10, name } = ctx.query;

    // Xây dựng filter tìm kiếm không dấu và có dấu
    let filters = {};
    if (name) {
      // Tìm kiếm không phân biệt dấu và không dấu
      // Sử dụng $or với $containsi (Strapi v4+)
      filters = {
        $or: [
          { name: { $containsi: name } },
          { name_unaccent: { $containsi: name } } // nếu có trường name_unaccent
        ]
      };
    }

    // Lấy danh sách tournament với phân trang, sắp xếp mới nhất trước
    const tournaments = await strapi.entityService.findMany('api::tournament.tournament', {
      filters,
      sort: { createdAt: 'desc' },
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      },
      populate: '*'
    });

    // Đếm tổng số bản ghi
    const total = await strapi.db.query('api::tournament.tournament').count({ where: filters });
    const totalPage = Math.ceil(total / parseInt(pageSize));

    return ctx.send({
      data: tournaments,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPage
      }
    });
  },

  async findTournamentsBySystemTournament(ctx) {
    const user = ctx.state.user;
    if (!user || user.type !== 'system-owner') {
      return ctx.unauthorized("Only system-owner can access this resource");
    }

    const { page = 1, pageSize = 10, name } = ctx.query;

    // Tìm system-tournament theo user.documentId
    const systemTournaments = await strapi.documents('api::system-tournament.system-tournament').findMany({
      filters: { userId: user.documentId },
    });

    if (!systemTournaments || systemTournaments.length === 0) {
      return ctx.notFound('System tournament not found for this user');
    }

    // Lấy 1 id từ system tournament đầu tiên
    const systemTournamentId = systemTournaments[0].id;

    let filters: any = { 
      system_tournament: systemTournamentId
    };
    
    if (name) {
      filters = { 
        ...filters, 
        name: { $containsi: name } 
      };
    }

    const tournaments = await strapi.documents('api::tournament.tournament').findMany({
      filters,
      sort: { createdAt: 'desc' },
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      },
      populate: '*'
    });

    const total = await strapi.documents('api::tournament.tournament').count({ filters });
    const totalPage = Math.ceil(total / parseInt(pageSize));

    return ctx.send({
      data: tournaments,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPage
      }
    });
  },

  async getSystemStatistics(ctx) {
    const user = ctx.state.user;
    if (!user || user.type !== 'system-owner') {
      return ctx.unauthorized("Only system-owner can access this resource");
    }

    // Tìm system-tournament theo user.documentId
    const systemTournaments = await strapi.documents('api::system-tournament.system-tournament').findMany({
      filters: { userId: user.documentId },
    });

    if (!systemTournaments || systemTournaments.length === 0) {
      return ctx.notFound('System tournament not found for this user');
    }

    const systemTournamentId = systemTournaments[0].id;

    // Lấy ngày hiện tại và khoảng thời gian tháng trước
    const now = new Date();
    const currentDay = now.getDate();
    
    // Đầu tháng trước
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // Ngày hiện tại của tháng trước
    const lastMonthCurrentDay = new Date(now.getFullYear(), now.getMonth() - 1, currentDay);
    
    // Thống kê hiện tại (từ đầu tháng hiện tại đến ngày hiện tại)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentTournaments = await strapi.documents('api::tournament.tournament').findMany({
      filters: { 
        system_tournament: { id: systemTournamentId },
        createdAt: { $gte: currentMonthStart.toISOString() }
      },
    });

    const currentTotalTournaments = currentTournaments.length;
    const currentTotalParticipants = currentTournaments.reduce((sum, tournament) => 
      sum + (tournament.currentParticipants || 0), 0
    );
    const currentTotalPrize = currentTournaments.reduce((sum, tournament) => 
      sum + (tournament.prizePool || 0), 0
    );

    // Lấy danh sách ID của các tournament hiện tại để đếm matches
    const currentTournamentIds = currentTournaments.map(t => t.id);
    const currentTotalMatches = currentTournamentIds.length > 0 ? await strapi.documents('api::match.match').count({
      filters: { 
        tournament: { id: { $in: currentTournamentIds } }
      }
    }) : 0;

    // Thống kê tháng trước (từ đầu tháng trước đến ngày hiện tại của tháng trước)
    const lastMonthTournaments = await strapi.documents('api::tournament.tournament').findMany({
      filters: { 
        system_tournament: {id: systemTournamentId},
        createdAt: { 
          $gte: lastMonthStart.toISOString(),
          $lte: lastMonthCurrentDay.toISOString()
        }
      },
    });

    const lastMonthTotalTournaments = lastMonthTournaments.length;
    const lastMonthTotalParticipants = lastMonthTournaments.reduce((sum, tournament) => 
      sum + (tournament.currentParticipants || 0), 0
    );
    const lastMonthTotalPrize = lastMonthTournaments.reduce((sum, tournament) => 
      sum + (tournament.prizePool || 0), 0
    );

    // Lấy danh sách ID của các tournament tháng trước để đếm matches
    const lastMonthTournamentIds = lastMonthTournaments.map(t => t.id);
    const lastMonthTotalMatches = lastMonthTournamentIds.length > 0 ? await strapi.documents('api::match.match').count({
      filters: { 
        tournament: { id: { $in: lastMonthTournamentIds } }
      }
    }) : 0;

    // Tính phần trăm tăng trưởng
    const tournamentGrowth = lastMonthTotalTournaments > 0 
      ? ((currentTotalTournaments - lastMonthTotalTournaments) / lastMonthTotalTournaments * 100).toFixed(2)
      : currentTotalTournaments > 0 ? 100 : 0;

    const participantGrowth = lastMonthTotalParticipants > 0 
      ? ((currentTotalParticipants - lastMonthTotalParticipants) / lastMonthTotalParticipants * 100).toFixed(2)
      : currentTotalParticipants > 0 ? 100 : 0;

    const prizeGrowth = lastMonthTotalPrize > 0 
      ? ((currentTotalPrize - lastMonthTotalPrize) / lastMonthTotalPrize * 100).toFixed(2)
      : currentTotalPrize > 0 ? 100 : 0;

    const matchGrowth = lastMonthTotalMatches > 0 
      ? ((currentTotalMatches - lastMonthTotalMatches) / lastMonthTotalMatches * 100).toFixed(2)
      : currentTotalMatches > 0 ? 100 : 0;

    return ctx.send({
      data: {
        current: {
          totalTournaments: currentTotalTournaments,
          totalParticipants: currentTotalParticipants,
          totalPrize: currentTotalPrize,
          totalMatches: currentTotalMatches
        },
        lastMonth: {
          totalTournaments: lastMonthTotalTournaments,
          totalParticipants: lastMonthTotalParticipants,
          totalPrize: lastMonthTotalPrize,
          totalMatches: lastMonthTotalMatches
        },
        growth: {
          tournaments: tournamentGrowth,
          participants: participantGrowth,
          prizes: prizeGrowth,
          matches: matchGrowth
        }
      }
    });
  },

  async updateSystemTournamentByUser(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("Missing or invalid JWT");
    }

    const { id } = ctx.params;
    const uid = 'api::system-tournament.system-tournament';

    try {
      // Lấy document theo documentId bằng Document API Service
      const entity = await strapi.documents(uid).findOne({ documentId: id });
      
      if (!entity) {
        return ctx.notFound("System tournament not found");
      }

      // Kiểm tra quyền: user.documentId phải bằng userId của system-tournament
      if (entity.userId !== user.documentId) {
        return ctx.forbidden("You are not allowed to update this system-tournament");
      }

      // Lấy AppSetting để lấy logo và banner mặc định
      const appSettings = await strapi.documents('api::app-setting.app-setting').findMany({
        populate: ['SystemTournamentDefaultLogo', 'SystemTournamentDefaultBanner']
      });
      let defaultLogo = null;
      let defaultBanner = null;

      if (appSettings && appSettings.length > 0) {
        const setting = appSettings[0];
        defaultLogo = setting.SystemTournamentDefaultLogo;
        defaultBanner = setting.SystemTournamentDefaultBanner;
      }

      // Chuẩn bị data cập nhật
      const updateData = {
        ...ctx.request.body.data,
        // Chỉ gán logo và banner nếu field được truyền vào là null và có giá trị mặc định
        ...(defaultLogo && ctx.request.body.data?.logoSystem === null && { logoSystem: defaultLogo.id }),
        ...(defaultBanner && ctx.request.body.data?.banner === null && { banner: defaultBanner.id })
      };

      // Cập nhật bằng Document API Service
      const updated = await strapi.documents(uid).update({
        documentId: id,
        data: updateData,
        populate: {
          logoSystem: true,
          banner: true,
          tournaments: { populate: '*' },
          system_package: true
        }
      });

      // Publish document sau khi cập nhật
      await strapi.documents(uid).publish({
        documentId: id
      });

      return ctx.send({ 
        data: updated,
        message: "System tournament updated successfully"
      });

    } catch (error) {
      console.error('Error updating system tournament:', error);
      return ctx.badRequest("Failed to update system tournament");
    }
  }
}; 
export default async ({ strapi }: { strapi: any }) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Lấy các system-tournament chưa được cập nhật isUseTrial và đã tạo hơn 7 ngày
  const tournaments = await strapi.document.findMany('api::system-tournament.system-tournament', {
    filters: {
      isUseTrial: false,
      createdAt: { $lte: sevenDaysAgo },
    },
    fields: ['id'],
  });

  if (tournaments.length) {
    const ids = tournaments.map(t => t.id);
    await strapi.document.updateMany('api::system-tournament.system-tournament', {
      filters: { id: { $in: ids } },
      data: { isUseTrial: true },
    });
    strapi.log.info(`[CRON] Updated isUseTrial=true for system-tournament ids: ${ids.join(', ')}`);
  }
}; 
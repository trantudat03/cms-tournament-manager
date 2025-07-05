/**
 * tournament controller
 */

import { factories } from '@strapi/strapi'
import pusher from '../../../utils/pusher'

export default factories.createCoreController('api::tournament.tournament', ({ strapi }) => ({
  async update(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    // Update tournament bằng Document Service API
    await strapi.documents('api::tournament.tournament').update({
        documentId: id,
        data,
      });
    await strapi.documents('api::tournament.tournament').publish({
        documentId: id,
    });

    // Lấy đầy đủ thông tin tournament đã populate
    const fullTournament = await strapi.documents('api::tournament.tournament').findOne({
      documentId: id,
      populate: '*'
    });

    // Gửi event realtime qua Pusher lên channel riêng cho từng tournament
    await pusher.trigger(`tournament-${id}`, 'tournament-updated', fullTournament);

    return ctx.send({ data: fullTournament });
  }
}));

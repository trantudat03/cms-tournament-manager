/**
 * tournament service
 */

import { factories } from '@strapi/strapi';
import { TournamentBracket } from '../../../utils/tournament-bracket';

export default factories.createCoreService('api::tournament.tournament', ({ strapi }) => ({
  /**
   * Tạo tournament bracket với rounds và matches dựa trên maxParticipants
   */
  async createTournamentBracket(tournamentId: string, maxParticipants: number) {
    return await TournamentBracket.createBracket(tournamentId, maxParticipants);
  },

  /**
   * Lấy thông tin bracket của tournament
   */
  async getBracketInfo(tournamentId: string) {
    return await TournamentBracket.getBracketInfo(tournamentId);
  }
}));

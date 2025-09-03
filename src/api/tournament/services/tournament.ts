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
  },

  /**
   * Lấy tất cả brackets của tournament
   */
  async getTournamentBrackets(tournamentId: string) {
    return await TournamentBracket.getTournamentBrackets(tournamentId);
  },

  /**
   * Tạo bracket mới cho tournament
   */
  async createNewBracket(tournamentId: string, bracketData: any) {
    return await TournamentBracket.createNewBracket(tournamentId, bracketData);
  },

  /**
   * Tái tạo matches cho bracket
   */
  async regenerateBracketMatches(bracketId: string, maxParticipants: number) {
    return await TournamentBracket.regenerateMatches(bracketId, maxParticipants);
  },

  /**
   * Kiểm tra và tái tạo matches nếu cần
   */
  async checkAndRegenerateMatches(tournamentId: string) {
    return await TournamentBracket.checkAndRegenerateMatches(tournamentId);
  },

  /**
   * Lấy tournament với kiểm tra và tái tạo matches nếu cần
   */
  async getTournamentWithMatches(tournamentId: string) {
    try {
      // Kiểm tra và tái tạo matches nếu cần
      await this.checkAndRegenerateMatches(tournamentId);
      
      // Lấy tournament với thông tin đầy đủ
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: tournamentId,
        populate: {
          brackets: {
            populate: {
              rounds: {
                populate: {
                  matches: {
                    populate: '*'
                  }
                }
              },
              players: true
            }
          },
          system_tournament: true,
        }
      });

      return tournament;
    } catch (error) {
      console.error('Error getting tournament with matches:', error);
      throw error;
    }
  }
}));

/**
 * Tournament Bracket Utility
 * Các hàm tiện ích để tạo và quản lý tournament bracket
 */

export class TournamentBracket {
  /**
   * Tạo tournament bracket với rounds và matches dựa trên maxParticipants
   */
  static async createBracket(tournamentId: string, maxParticipants: number) {
    try {
      // Kiểm tra xem tournament đã có rounds chưa
      const existingTournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: tournamentId,
        populate: {
          rounds: true
        }
      });

      if (existingTournament && (existingTournament as any).rounds && (existingTournament as any).rounds.length > 0) {
        console.log(`Tournament ${tournamentId} already has rounds. Skipping bracket creation.`);
        return {
          rounds: (existingTournament as any).rounds,
          matches: [],
          message: 'Bracket already exists'
        };
      }

      // Tính toán số round cần thiết
      const totalRounds = this.calculateRounds(maxParticipants);
      
      // Tạo các round và matches cho từng round
      const createdRounds = [];
      const allMatches = [];
      let globalMatchNumber = 1; // Số thứ tự match toàn cục
      
      for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
        const roundName = this.getRoundName(roundIndex, totalRounds, maxParticipants);
        const roundOrder = roundIndex + 1;
        const matchesInRound = this.calculateMatchesInRound(roundIndex, maxParticipants);
        
        // Tạo round
        const round = await strapi.documents('api::round.round').create({
          data: {
            name: roundName,
            order: roundOrder,
            tournament: tournamentId,
            startTime: null,
            endTime: null
          }
        });
        
        await strapi.documents('api::round.round').publish({
          documentId: round.documentId
        });
        
        createdRounds.push(round);
        
        // Tạo matches cho round này
        const roundMatches = [];
        for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
          const matchName = `Match ${globalMatchNumber}`;
          
          // Xác định playerName dựa trên round
          let playerName1 = '';
          let playerName2 = '';
          
          if (roundIndex === 0) {
            // Round 1: Tạo playerName theo thứ tự
            playerName1 = `Player ${matchIndex * 2 + 1}`;
            playerName2 = `Player ${matchIndex * 2 + 2}`;
          } else {
            // Round 2 trở đi: Lấy từ winner của match trước đó
            // Tính toán match trước đó dựa trên vị trí hiện tại
            const previousRoundMatches = this.calculateMatchesInRound(roundIndex - 1, maxParticipants);
            const previousMatch1Index = matchIndex * 2;
            const previousMatch2Index = matchIndex * 2 + 1;
            
            // Lấy thông tin từ match trước đó
            if (previousMatch1Index < previousRoundMatches) {
              const previousMatch1 = allMatches.find(m => 
                m.matchNumber === this.getMatchNumberByRoundAndIndex(roundIndex - 1, previousMatch1Index, maxParticipants)
              );
              if (previousMatch1) {
                playerName1 = `Winner of ${previousMatch1.name}`;
              }
            }
            
            if (previousMatch2Index < previousRoundMatches) {
              const previousMatch2 = allMatches.find(m => 
                m.matchNumber === this.getMatchNumberByRoundAndIndex(roundIndex - 1, previousMatch2Index, maxParticipants)
              );
              if (previousMatch2) {
                playerName2 = `Winner of ${previousMatch2.name}`;
              }
            }
          }
          
          const match = await strapi.documents('api::match.match').create({
            data: {
              name: matchName,
              playerName1: playerName1,
              playerName2: playerName2,
              winner: null,
              startTime: null,
              endTime: null,
              matchNumber: globalMatchNumber,
              score1: 0,
              score2: 0,
              note: '',
              statusMatch: 'pending',
              round: round.documentId,
              tournament: tournamentId
            }
          });
          
          await strapi.documents('api::match.match').publish({
            documentId: match.documentId
          });
          
          roundMatches.push(match);
          allMatches.push(match);
          globalMatchNumber++; // Tăng số thứ tự match
        }
      }

      // Cập nhật kết nối giữa các match
      await this.updateMatchConnections(allMatches, maxParticipants);

      return {
        rounds: createdRounds,
        matches: allMatches
      };
    } catch (error) {
      console.error('Error creating tournament bracket:', error);
      throw error;
    }
  }

  /**
   * Tính toán số round cần thiết dựa trên số participants
   */
  static calculateRounds(participants: number): number {
    return Math.ceil(Math.log2(participants));
  }

  /**
   * Tính toán số match trong một round cụ thể
   */
  static calculateMatchesInRound(roundIndex: number, participants: number): number {
    if (roundIndex === 0) {
      // Round đầu tiên: số match = participants / 2
      return Math.ceil(participants / 2);
    } else {
      // Các round tiếp theo: số match = số match round trước / 2
      const previousRoundMatches = this.calculateMatchesInRound(roundIndex - 1, participants);
      return Math.ceil(previousRoundMatches / 2);
    }
  }

  /**
   * Tính toán match number dựa trên round và index
   */
  static getMatchNumberByRoundAndIndex(roundIndex: number, matchIndex: number, maxParticipants: number): number {
    let matchNumber = 1;
    
    // Cộng dồn số match của các round trước đó
    for (let i = 0; i < roundIndex; i++) {
      matchNumber += this.calculateMatchesInRound(i, maxParticipants);
    }
    
    // Cộng thêm index của match trong round hiện tại
    matchNumber += matchIndex;
    
    return matchNumber;
  }

  /**
   * Lấy tên round
   */
  static getRoundName(roundIndex: number, totalRounds: number, maxParticipants: number): string {
    const roundNumber = roundIndex + 1;
    
    // Tính số người tham gia trong vòng này
    const matchesInRound = this.calculateMatchesInRound(roundIndex, maxParticipants);
    const participantsInRound = matchesInRound * 2;
    
    if (roundNumber === totalRounds) {
      return 'Chung kết';
    } else if (roundNumber === totalRounds - 1) {
      return 'Bán kết';
    } else if (roundNumber === totalRounds - 2 && participantsInRound === 8) {
      return 'Tứ kết';
    } else {
      return `Vòng ${participantsInRound} người`;
    }
  }

  /**
   * Cập nhật kết nối giữa các match (nextMatchWinner, nextMatchLoser)
   */
  static async updateMatchConnections(matches: any[], participants: number) {
    const totalRounds = this.calculateRounds(participants);
    
    // Nhóm matches theo round
    const matchesByRound = [];
    let matchIndex = 0;
    
    for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
      const matchesInRound = this.calculateMatchesInRound(roundIndex, participants);
      const roundMatches = matches.slice(matchIndex, matchIndex + matchesInRound);
      // Sắp xếp theo matchNumber để đảm bảo thứ tự đúng
      roundMatches.sort((a, b) => a.matchNumber - b.matchNumber);
      matchesByRound.push(roundMatches);
      matchIndex += matchesInRound;
    }
    
    // Cập nhật kết nối giữa các round
    for (let roundIndex = 0; roundIndex < totalRounds - 1; roundIndex++) {
      const currentRoundMatches = matchesByRound[roundIndex];
      const nextRoundMatches = matchesByRound[roundIndex + 1];
      
      for (let i = 0; i < currentRoundMatches.length; i += 2) {
        const match1 = currentRoundMatches[i];
        const match2 = currentRoundMatches[i + 1];
        const nextMatch = nextRoundMatches[Math.floor(i / 2)];
        
        if (match1 && nextMatch) {
          await strapi.documents('api::match.match').update({
            documentId: match1.documentId,
            data: {
              nextMatchWinner: nextMatch.documentId
            }
          });
        }
        
        if (match2 && nextMatch) {
          await strapi.documents('api::match.match').update({
            documentId: match2.documentId,
            data: {
              nextMatchWinner: nextMatch.documentId
            }
          });
        }
        
        if (nextMatch) {
          await strapi.documents('api::match.match').update({
            documentId: nextMatch.documentId,
            data: {
              previousMatch1: match1?.documentId || null,
              previousMatch2: match2?.documentId || null
            }
          });
        }
      }
    }
  }

  /**
   * Lấy thông tin bracket của tournament
   */
  static async getBracketInfo(tournamentId: string) {
    try {
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: tournamentId,
        populate: {
          rounds: {
            populate: {
              matches: {
                populate: '*'
              }
            }
          },
          system_tournament: {
            populate: '*'
          }
        }
      });

      return tournament;
    } catch (error) {
      console.error('Error getting bracket info:', error);
      throw error;
    }
  }
}
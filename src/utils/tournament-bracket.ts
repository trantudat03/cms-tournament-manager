/**
 * Tournament Bracket Utility
 * Các hàm tiện ích để tạo và quản lý tournament bracket
 * Cấu trúc mới: Tournament (1) → Bracket (N) → Round (N) → Match (N)
 */

export class TournamentBracket {
  /**
   * Tạo tournament bracket với rounds và matches dựa trên maxParticipants
   * Cấu trúc mới: Tạo bracket trước, sau đó tạo rounds thuộc về bracket
   */
  static async createBracket(tournamentId: string, maxParticipants: number, bracketName?: string) {
    try {
      // Lấy thông tin tournament hiện tại để tính order cho bracket mới
      const existingTournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: tournamentId,
        populate: {
          brackets: {
            populate: {
              rounds: {
                populate: {
                  matches: true
                }
              }
            }
          }
        }
      });

      // Tính order cho bracket mới (bracket tiếp theo)
      const existingBrackets = (existingTournament as any)?.brackets || [];
      const nextOrder = existingBrackets.length + 1;

      // Tính toán số round cần thiết
      const totalRounds = this.calculateRounds(maxParticipants);
      
      // Bước 1: Tạo bracket mới
      const finalBracketName = bracketName || (nextOrder === 1 ? 'Main Bracket' : `Bracket ${nextOrder}`);
      const mainBracket = await strapi.documents('api::bracket.bracket').create({
        data: {
          name: finalBracketName,
          bracketType: 'Single Elimination',
          order: nextOrder,
          startDate: new Date(),
          endDate: new Date(),
          bracketStatus: 'upcoming',
          maxParticipants: maxParticipants,
          currentParticipants: 0,
          advanceToNextBracket: 0,
          tournament: tournamentId
        }
      });

      await strapi.documents('api::bracket.bracket').publish({
        documentId: mainBracket.documentId
      });

      console.log(`Created main bracket: ${mainBracket.name} (ID: ${mainBracket.documentId})`);
      
      // Bước 2: Tạo các round và matches cho từng round
      const createdRounds = [];
      const allMatches = [];
      let globalMatchNumber = 1;
      
      for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
        const roundName = this.getRoundName(roundIndex, totalRounds, maxParticipants);
        const roundOrder = roundIndex + 1;
        const matchesInRound = this.calculateMatchesInRound(roundIndex, maxParticipants);
        
        // Tạo round thuộc về bracket
        const round = await strapi.documents('api::round.round').create({
          data: {
            name: roundName,
            order: roundOrder,
            tournament: tournamentId,
            bracket: mainBracket.documentId, // Thêm bracket relation
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
            const previousRoundMatches = this.calculateMatchesInRound(roundIndex - 1, maxParticipants);
            const previousMatch1Index = matchIndex * 2;
            const previousMatch2Index = matchIndex * 2 + 1;
            
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
          globalMatchNumber++;
        }
      }

      // Cập nhật kết nối giữa các match
      await this.updateMatchConnections(allMatches, maxParticipants);

      return {
        bracket: mainBracket,
        rounds: createdRounds,
        matches: allMatches
      };
    } catch (error) {
      console.error('Error creating tournament bracket:', error);
      throw error;
    }
  }

  /**
   * Tái tạo matches cho bracket đã tồn tại
   */
  static async regenerateMatches(bracketId: string, maxParticipants: number) {
    try {
      console.log(`Regenerating matches for bracket ${bracketId} with ${maxParticipants} participants`);
      
      // Lấy bracket và rounds
      const bracket = await strapi.documents('api::bracket.bracket').findOne({
        documentId: bracketId,
        populate: {
          rounds: {
            populate: {
              matches: true
            }
          },
          tournament: true
        }
      });

      if (!bracket) {
        throw new Error('Bracket not found');
      }

      // Xóa tất cả matches hiện tại trong bracket
      for (const round of bracket.rounds) {
        if (round.matches && round.matches.length > 0) {
          for (const match of round.matches) {
            await strapi.documents('api::match.match').delete({
              documentId: match.documentId
            });
          }
        }
      }

      // Tạo lại matches
      const allMatches = [];
      let globalMatchNumber = 1;
      const totalRounds = this.calculateRounds(maxParticipants);

      for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
        const round = bracket.rounds[roundIndex];
        if (!round) continue;

        const matchesInRound = this.calculateMatchesInRound(roundIndex, maxParticipants);
        
        // Tạo matches cho round này
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
            const previousRoundMatches = this.calculateMatchesInRound(roundIndex - 1, maxParticipants);
            const previousMatch1Index = matchIndex * 2;
            const previousMatch2Index = matchIndex * 2 + 1;
            
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
              tournament: bracket.tournament
            }
          });
          
          await strapi.documents('api::match.match').publish({
            documentId: match.documentId
          });
          
          allMatches.push(match);
          globalMatchNumber++;
        }
      }

      // Cập nhật kết nối giữa các match
      await this.updateMatchConnections(allMatches, maxParticipants);

      console.log(`Successfully regenerated ${allMatches.length} matches for bracket ${bracketId}`);
      
      return {
        bracket,
        matches: allMatches
      };
    } catch (error) {
      console.error('Error regenerating matches:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra và tái tạo matches nếu cần
   */
  static async checkAndRegenerateMatches(tournamentId: string) {
    try {
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: tournamentId,
        populate: {
          brackets: {
            populate: {
              rounds: {
                populate: {
                  matches: true
                }
              }
            }
          }
        }
      });

      if (!tournament || !tournament.brackets || tournament.brackets.length === 0) {
        console.log(`Tournament ${tournamentId} has no brackets`);
        return null;
      }

      const results = [];
      
      for (const bracket of tournament.brackets) {
        let totalMatches = 0;
        let hasMatches = false;
        
        // Kiểm tra xem bracket có matches không
        for (const round of bracket.rounds) {
          if (round.matches && round.matches.length > 0) {
            totalMatches += round.matches.length;
            hasMatches = true;
          }
        }

        // Nếu bracket không có matches hoặc có ít matches, tái tạo
        if (!hasMatches || totalMatches === 0) {
          console.log(`Bracket ${bracket.name} has no matches, regenerating...`);
          const result = await this.regenerateMatches(bracket.documentId, tournament.maxParticipants);
          results.push(result);
        } else {
          console.log(`Bracket ${bracket.name} has ${totalMatches} matches, skipping regeneration`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error checking and regenerating matches:', error);
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
   * Lấy thông tin bracket của tournament (cập nhật cho cấu trúc mới)
   */
  static async getBracketInfo(tournamentId: string) {
    try {
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: tournamentId,
        populate: {
          brackets: {
            populate: {
              rounds: {
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

  /**
   * Tạo bracket mới cho tournament với tên và cấu hình tùy chỉnh
   */
  static async createNewBracket(tournamentId: string, bracketData: any) {
    try {
      // Lấy thông tin tournament để tính order
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: tournamentId,
        populate: {
          brackets: true
        }
      });

      const existingBrackets = (tournament as any)?.brackets || [];
      const nextOrder = existingBrackets.length + 1;

      const bracket = await strapi.documents('api::bracket.bracket').create({
        data: {
          ...bracketData,
          order: bracketData.order || nextOrder,
          tournament: tournamentId
        }
      });

      await strapi.documents('api::bracket.bracket').publish({
        documentId: bracket.documentId
      });

      return bracket;
    } catch (error) {
      console.error('Error creating new bracket:', error);
      throw error;
    }
  }

  /**
   * Tạo bracket mới với tên tùy chỉnh và tự động tạo matches
   */
  static async createCustomBracket(tournamentId: string, bracketName: string, maxParticipants: number, bracketType: 'Single Elimination' | 'Double Elimination' = 'Single Elimination') {
    try {
      // Lấy thông tin tournament để tính order
      const tournament = await strapi.documents('api::tournament.tournament').findOne({
        documentId: tournamentId,
        populate: {
          brackets: true
        }
      });

      const existingBrackets = (tournament as any)?.brackets || [];
      const nextOrder = existingBrackets.length + 1;

      // Tạo bracket mới
      const bracket = await strapi.documents('api::bracket.bracket').create({
        data: {
          name: bracketName,
          bracketType: bracketType as 'Single Elimination' | 'Double Elimination',
          order: nextOrder,
          startDate: new Date(),
          endDate: new Date(),
          bracketStatus: 'upcoming',
          maxParticipants: maxParticipants,
          currentParticipants: 0,
          advanceToNextBracket: 0,
          tournament: tournamentId
        }
      });

      await strapi.documents('api::bracket.bracket').publish({
        documentId: bracket.documentId
      });

      // Tạo rounds và matches cho bracket mới
      const totalRounds = this.calculateRounds(maxParticipants);
      const createdRounds = [];
      const allMatches = [];
      let globalMatchNumber = 1;
      
      for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
        const roundName = this.getRoundName(roundIndex, totalRounds, maxParticipants);
        const roundOrder = roundIndex + 1;
        const matchesInRound = this.calculateMatchesInRound(roundIndex, maxParticipants);
        
        // Tạo round thuộc về bracket
        const round = await strapi.documents('api::round.round').create({
          data: {
            name: roundName,
            order: roundOrder,
            tournament: tournamentId,
            bracket: bracket.documentId,
            startTime: null,
            endTime: null
          }
        });
        
        await strapi.documents('api::round.round').publish({
          documentId: round.documentId
        });
        
        createdRounds.push(round);
        
        // Tạo matches cho round này
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
            const previousRoundMatches = this.calculateMatchesInRound(roundIndex - 1, maxParticipants);
            const previousMatch1Index = matchIndex * 2;
            const previousMatch2Index = matchIndex * 2 + 1;
            
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
          
          allMatches.push(match);
          globalMatchNumber++;
        }
      }

      // Cập nhật kết nối giữa các match
      await this.updateMatchConnections(allMatches, maxParticipants);

      return {
        bracket,
        rounds: createdRounds,
        matches: allMatches
      };
    } catch (error) {
      console.error('Error creating custom bracket:', error);
      throw error;
    }
  }

  /**
   * Lấy tất cả brackets của tournament
   */
  static async getTournamentBrackets(tournamentId: string) {
    try {
      const brackets = await strapi.documents('api::bracket.bracket').findMany({
        filters: {
          tournament: {
            documentId: { $eq: tournamentId }
          }
        },
        populate: {
          rounds: {
            populate: '*'
          }
        },
        sort: { order: 'asc' }
      });

      return brackets;
    } catch (error) {
      console.error('Error getting tournament brackets:', error);
      throw error;
    }
  }
}
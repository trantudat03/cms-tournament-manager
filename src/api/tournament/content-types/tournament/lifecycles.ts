/**
 * tournament lifecycles
 */

import { TournamentBracket } from '../../../../utils/tournament-bracket';

export default {
  async afterCreate(event) {
    const { result } = event;
    
    console.log('Tournament created:', result.documentId, 'maxParticipants:', result.maxParticipants);
    
    // Tạo bracket (rounds và matches) sau khi tạo tournament thành công
    if (result.maxParticipants && result.maxParticipants > 0) {
      try {
        const bracketResult = await TournamentBracket.createBracket(result.documentId, result.maxParticipants);
        console.log(`Tournament bracket created for tournament ${result.documentId} with ${result.maxParticipants} participants`);
        console.log('Bracket result:', bracketResult);
      } catch (error) {
        console.error(`Error creating tournament bracket for tournament ${result.documentId}:`, error);
      }
    } else {
      console.log(`Skipping bracket creation for tournament ${result.documentId} - no maxParticipants`);
    }
  },
}; 
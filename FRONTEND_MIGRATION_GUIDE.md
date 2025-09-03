# Frontend Migration Guide - Tournament Bracket System

## Tổng quan thay đổi

Hệ thống đã được cập nhật từ cấu trúc cũ `Tournament → Round → Match` sang cấu trúc mới `Tournament → Bracket → Round → Match` để hỗ trợ nhiều brackets trong một tournament.

## 1. Cấu trúc dữ liệu mới

### Cấu trúc cũ:
```javascript
tournament: {
  id: 1,
  name: "Tournament Name",
  rounds: [
    {
      id: 1,
      name: "Round 1",
      matches: [...]
    }
  ]
}
```

### Cấu trúc mới:
```javascript
tournament: {
  id: 1,
  name: "Tournament Name",
  brackets: [
    {
      id: 1,
      name: "Main Bracket",
      bracketType: "Single Elimination",
      order: 1,
      rounds: [
        {
          id: 1,
          name: "Round 1",
          bracket: { id: 1, name: "Main Bracket" },
          matches: [...]
        }
      ]
    },
    {
      id: 2,
      name: "Consolation Bracket", 
      bracketType: "Single Elimination",
      order: 2,
      rounds: [...]
    }
  ]
}
```

## 2. API Endpoints mới

### Lấy tournament với brackets:
```javascript
// Cũ
GET /api/tournaments/:id

// Mới - Lấy tournament với brackets, rounds, matches đầy đủ
GET /api/tournaments/:id/bracket
```

### Lấy tất cả brackets của tournament:
```javascript
// Mới
GET /api/tournaments/:id/brackets
```

### Tạo bracket mới:
```javascript
// Mới
POST /api/tournaments/:id/brackets
Body: {
  data: {
    name: "Consolation Bracket",
    bracketType: "Single Elimination",
    order: 2,
    startDate: "2024-01-15T00:00:00.000Z",
    endDate: "2024-01-16T00:00:00.000Z",
    bracketStatus: "upcoming",
    maxParticipants: 8,
    currentParticipants: 0,
    advanceToNextBracket: 0
  }
}
```

### Tái tạo matches:
```javascript
// Tái tạo matches cho bracket cụ thể
POST /api/tournaments/:id/brackets/:bracketId/regenerate-matches

// Tái tạo matches cho toàn bộ tournament
POST /api/tournaments/:id/regenerate-matches
```

### Lấy rounds của tournament:
```javascript
// Cũ
GET /api/rounds?filters[tournament]=:tournamentId

// Mới - Lấy rounds thông qua brackets
GET /api/tournaments/:id/bracket
// Sau đó flatten rounds từ brackets
```

## 3. Thay đổi trong Frontend Code

### 3.1 Lấy dữ liệu tournament

```javascript
// Cũ
const getTournament = async (tournamentId) => {
  const response = await fetch(`/api/tournaments/${tournamentId}`);
  return response.data;
};

// Mới
const getTournament = async (tournamentId) => {
  const response = await fetch(`/api/tournaments/${tournamentId}/bracket`);
  return response.data;
};
```

### 3.2 Truy cập matches

```javascript
// Cũ
const matches = tournament.rounds[0].matches;

// Mới
const matches = tournament.brackets[0].rounds[0].matches;
```

### 3.3 Hiển thị bracket structure

```javascript
// Cũ
const TournamentBracket = ({ tournament }) => (
  <div>
    {tournament.rounds.map(round => (
      <div key={round.id}>
        <h3>{round.name}</h3>
        {round.matches.map(match => (
          <MatchComponent key={match.id} match={match} />
        ))}
      </div>
    ))}
  </div>
);

// Mới
const TournamentBracket = ({ tournament }) => (
  <div>
    {tournament.brackets.map(bracket => (
      <div key={bracket.id}>
        <h2>{bracket.name}</h2>
        {bracket.rounds.map(round => (
          <div key={round.id}>
            <h3>{round.name}</h3>
            {round.matches.map(match => (
              <MatchComponent key={match.id} match={match} />
            ))}
          </div>
        ))}
      </div>
    ))}
  </div>
);
```

### 3.4 Bracket selector component

```javascript
const BracketSelector = ({ brackets, selectedBracket, onSelect }) => (
  <div className="bracket-selector">
    <label>Select Bracket:</label>
    <select 
      value={selectedBracket?.id || ''} 
      onChange={(e) => {
        const bracket = brackets.find(b => b.id === parseInt(e.target.value));
        onSelect(bracket);
      }}
    >
      <option value="">Select a bracket</option>
      {brackets.map(bracket => (
        <option key={bracket.id} value={bracket.id}>
          {bracket.name}
        </option>
      ))}
    </select>
  </div>
);
```

### 3.5 Tạo bracket mới

```javascript
const createBracket = async (tournamentId, bracketData) => {
  const response = await fetch(`/api/tournaments/${tournamentId}/brackets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ data: bracketData })
  });
  
  if (!response.ok) {
    throw new Error('Failed to create bracket');
  }
  
  return response.data;
};

// Sử dụng
const handleCreateBracket = async () => {
  try {
    const bracketData = {
      name: "Consolation Bracket",
      bracketType: "Single Elimination",
      order: 2,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      bracketStatus: "upcoming",
      maxParticipants: 8,
      currentParticipants: 0,
      advanceToNextBracket: 0
    };
    
    const result = await createBracket(tournamentId, bracketData);
    
    // Cập nhật state
    setTournament(prev => ({
      ...prev,
      brackets: [...prev.brackets, result.data.bracket]
    }));
    
    showNotification('Bracket created successfully', 'success');
  } catch (error) {
    showNotification('Failed to create bracket', 'error');
  }
};
```

### 3.6 Tái tạo matches

```javascript
const regenerateMatches = async (tournamentId, bracketId) => {
  const response = await fetch(
    `/api/tournaments/${tournamentId}/brackets/${bracketId}/regenerate-matches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to regenerate matches');
  }
  
  return response.data;
};

// Sử dụng
const handleRegenerateMatches = async (bracketId) => {
  try {
    await regenerateMatches(tournamentId, bracketId);
    showNotification('Matches regenerated successfully', 'success');
    // Refresh tournament data
    await fetchTournamentData();
  } catch (error) {
    showNotification('Failed to regenerate matches', 'error');
  }
};
```

## 4. Thay đổi trong State Management

### 4.1 Redux/Zustand Store

```javascript
// Cũ
const tournamentSlice = createSlice({
  name: 'tournament',
  initialState: {
    tournament: null,
    rounds: [],
    loading: false,
    error: null
  },
  reducers: {
    setTournament: (state, action) => {
      state.tournament = action.payload;
      state.rounds = action.payload?.rounds || [];
    }
  }
});

// Mới
const tournamentSlice = createSlice({
  name: 'tournament',
  initialState: {
    tournament: null,
    brackets: [],
    selectedBracket: null,
    loading: false,
    error: null
  },
  reducers: {
    setTournament: (state, action) => {
      state.tournament = action.payload;
      state.brackets = action.payload?.brackets || [];
      // Auto-select first bracket
      if (action.payload?.brackets?.length > 0 && !state.selectedBracket) {
        state.selectedBracket = action.payload.brackets[0];
      }
    },
    setSelectedBracket: (state, action) => {
      state.selectedBracket = action.payload;
    },
    addBracket: (state, action) => {
      state.brackets.push(action.payload);
    }
  }
});
```

### 4.2 Selectors

```javascript
// Cũ
export const selectRounds = (state) => state.tournament.rounds;
export const selectMatches = (state) => state.tournament.rounds.flatMap(round => round.matches);

// Mới
export const selectBrackets = (state) => state.tournament.brackets;
export const selectSelectedBracket = (state) => state.tournament.selectedBracket;
export const selectRounds = (state) => state.tournament.selectedBracket?.rounds || [];
export const selectMatches = (state) => state.tournament.selectedBracket?.rounds?.flatMap(round => round.matches) || [];
```

## 5. Thay đổi trong Match Component

### 5.1 Cập nhật match

```javascript
// Cũ
const updateMatch = async (matchId, data) => {
  const response = await fetch(`/api/matches/${matchId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  return response.data;
};

// Mới - Không thay đổi endpoint, nhưng response structure khác
const updateMatch = async (matchId, data) => {
  const response = await fetch(`/api/matches/${matchId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  const match = response.data;
  
  // Truy cập tournament thông qua round → bracket
  const tournamentId = match.round.bracket.tournament.id;
  
  return match;
};
```

### 5.2 Match component với thông tin bracket

```javascript
const MatchComponent = ({ match }) => {
  const bracketName = match.round?.bracket?.name;
  const roundName = match.round?.name;
  
  return (
    <div className="match">
      <div className="match-header">
        <span className="bracket-name">{bracketName}</span>
        <span className="round-name">{roundName}</span>
      </div>
      <div className="match-content">
        <span>{match.playerName1}</span>
        <span>vs</span>
        <span>{match.playerName2}</span>
      </div>
      <div className="match-score">
        <span>{match.score1}</span>
        <span>-</span>
        <span>{match.score2}</span>
      </div>
    </div>
  );
};
```

## 6. Thay đổi trong Round Component

### 6.1 Lấy rounds của tournament

```javascript
// Cũ
const getRounds = async (tournamentId) => {
  const response = await fetch(`/api/rounds?filters[tournament]=${tournamentId}`);
  return response.data;
};

// Mới
const getRounds = async (tournamentId) => {
  // Lấy tournament với brackets và rounds
  const response = await fetch(`/api/tournaments/${tournamentId}/bracket`);
  const tournament = response.data;
  
  // Flatten rounds từ tất cả brackets
  const allRounds = tournament.brackets.flatMap(bracket => 
    bracket.rounds.map(round => ({
      ...round,
      bracketName: bracket.name
    }))
  );
  
  return allRounds;
};
```

## 7. TypeScript Types mới

```typescript
// Cũ
interface Tournament {
  id: number;
  name: string;
  rounds: Round[];
}

interface Round {
  id: number;
  name: string;
  matches: Match[];
}

// Mới
interface Tournament {
  id: number;
  name: string;
  brackets: Bracket[];
}

interface Bracket {
  id: number;
  name: string;
  bracketType: 'Single Elimination' | 'Double Elimination';
  order: number;
  startDate: string;
  endDate: string;
  bracketStatus: 'upcoming' | 'active' | 'completed';
  maxParticipants: number;
  currentParticipants: number;
  advanceToNextBracket: number;
  rounds: Round[];
}

interface Round {
  id: number;
  name: string;
  order: number;
  bracket: Bracket;
  matches: Match[];
}

interface Match {
  id: number;
  name: string;
  playerName1: string;
  playerName2: string;
  winner: 'player1' | 'player2' | null;
  score1: number;
  score2: number;
  statusMatch: 'pending' | 'in_progress' | 'completed' | 'rejected';
  round: Round;
  nextMatchWinner?: Match;
  nextMatchLoser?: Match;
  previousMatch1?: Match;
  previousMatch2?: Match;
}
```

## 8. Migration Strategy

### 8.1 Phase 1: Backward Compatibility (1-2 tuần)
- Giữ các endpoints cũ
- Thêm endpoints mới
- Test cả hai cấu trúc

### 8.2 Phase 2: Gradual Migration (2-3 tuần)
- Chuyển đổi từng component một
- Sử dụng feature flags
- Test kỹ lưỡng

### 8.3 Phase 3: Full Migration (1 tuần)
- Loại bỏ code cũ
- Cleanup
- Performance optimization

### 8.4 Feature Flags

```javascript
const useNewBracketStructure = () => {
  return process.env.REACT_APP_USE_NEW_BRACKET_STRUCTURE === 'true';
};

const TournamentComponent = () => {
  const useNewStructure = useNewBracketStructure();
  
  if (useNewStructure) {
    return <NewTournamentBracket />;
  }
  
  return <OldTournamentBracket />;
};
```

## 9. Testing Checklist

### 9.1 API Testing
- [ ] GET /api/tournaments/:id/bracket
- [ ] GET /api/tournaments/:id/brackets
- [ ] POST /api/tournaments/:id/brackets
- [ ] POST /api/tournaments/:id/brackets/:bracketId/regenerate-matches
- [ ] PUT /api/matches/:id (với cấu trúc mới)

### 9.2 Component Testing
- [ ] TournamentBracket component với multiple brackets
- [ ] BracketSelector component
- [ ] MatchComponent với thông tin bracket
- [ ] RoundComponent với cấu trúc mới

### 9.3 Integration Testing
- [ ] Tạo tournament → tạo bracket → tạo matches
- [ ] Update match → verify realtime updates
- [ ] Regenerate matches → verify data consistency

## 10. Performance Considerations

### 10.1 Lazy Loading
```javascript
const LazyBracket = React.lazy(() => import('./Bracket'));

const TournamentBrackets = ({ brackets }) => (
  <div>
    {brackets.map(bracket => (
      <Suspense key={bracket.id} fallback={<BracketSkeleton />}>
        <LazyBracket bracket={bracket} />
      </Suspense>
    ))}
  </div>
);
```

### 10.2 Memoization
```javascript
const MemoizedMatch = React.memo(MatchComponent);
const MemoizedBracket = React.memo(BracketComponent);
```

### 10.3 Virtual Scrolling (nếu cần)
```javascript
import { FixedSizeList as List } from 'react-window';

const VirtualizedMatches = ({ matches }) => (
  <List
    height={400}
    itemCount={matches.length}
    itemSize={80}
    itemData={matches}
  >
    {({ index, style, data }) => (
      <div style={style}>
        <MatchComponent match={data[index]} />
      </div>
    )}
  </List>
);
```

## 11. Rollback Plan

### 11.1 Feature Flag Rollback
```javascript
// Nếu có vấn đề, chỉ cần set env variable
REACT_APP_USE_NEW_BRACKET_STRUCTURE=false
```

### 11.2 Database Rollback
- Backup database trước khi migration
- Có script rollback sẵn sàng

### 11.3 Code Rollback
- Git tags cho mỗi phase
- Branch protection rules
- Automated rollback scripts

## 12. Support & Contact

Nếu có vấn đề trong quá trình migration, liên hệ:
- Backend team: [email]
- Documentation: [link to docs]
- Issue tracker: [link to issues]

---

**Lưu ý quan trọng:**
- Test kỹ lưỡng trước khi deploy
- Monitor performance sau migration
- Backup data thường xuyên
- Communicate với team về timeline 
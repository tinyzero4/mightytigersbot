import _ from "lodash";

import { MatchService } from "@services/match-service";
import { CONFIRMATION_TYPES } from "@configs/config";

class SeasonStats {
  players: Array<PlayerStat>;
  matchesCount: number;
}

class PlayerStat {
  appearences: number;
  name: string;
}

const MATCH_MIN_PLAYERS = 8;

export class StatsService {

  private matchService: MatchService;

  constructor(matchService: MatchService) {
    this.matchService = matchService;
  }

  public getStats(team_id: number, season = Date.now()): Promise<SeasonStats> {
    return this.matchService.findByTeam(team_id, season)
      .then(matches => {
        let totalMatches = 0;
        const stats: { [key: string]: number; } = {};
        const players: { [key: string]: string; } = {};
        matches.forEach(match => {
          const matchDetails = this.matchService.getMatchDetails(match);
          if (matchDetails.total < MATCH_MIN_PLAYERS) return;
          totalMatches++;
          matchDetails.confirmationsByType[CONFIRMATION_TYPES[0].value].forEach(c => {
            const appearences: number = stats[c.pId] || 0;
            stats[c.pId] = appearences + 1;
            players[c.pId] = match.players[c.pId];
          });
        });

        const playersStats: Array<PlayerStat> = _.keys(stats)
          .map(k => { return { appearences: stats[k], name: players[k] }; })
          .sort((l, r) => r.appearences - l.appearences);

        return Promise.resolve({ players: playersStats, matchesCount: totalMatches });
      });
  }
}

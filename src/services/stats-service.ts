import _ from "lodash";

import { MatchService } from "@services/match-service";
import { CONFIRMATION_TYPES, MATCH_MIN_PLAYERS } from "@configs/config";
import { TeamService } from '@services/team-service';
import { Player as PlayerProfile } from '@models/team';

class SeasonStats {
  players: Array<PlayerStat>;
  matchesCount: number;
}

class PlayerStat {
  appearences: number;
  name: string;
}

export class StatsService {

  private matchService: MatchService;

  private teamService: TeamService;

  constructor(matchService: MatchService, teamService: TeamService) {
    this.matchService = matchService;
    this.teamService = teamService;
  }

  public getStats(team_id: number, season = Date.now()): Promise<SeasonStats> {
    return Promise.all([this.matchService.findByTeam(team_id, season), this.teamService.getTeam(team_id)])
      .then(data => {
        const [matches, team] = data;
        const stats: { [key: string]: number; } = {};
        const players: { [key: string]: string; } = {};
        let total = 0;
        matches.forEach(match => {
          const matchDetails = this.matchService.getMatchDetails(match);
          if (matchDetails.total < MATCH_MIN_PLAYERS) return;
          matchDetails.confirmationsByType[CONFIRMATION_TYPES[0].value].forEach(c => {
            const appearences: number = stats[c.pId] || 0;
            const playerProfile: PlayerProfile = team.players[c.pId];
            const karma = playerProfile ? playerProfile.karma || 0 : 0;
            stats[c.pId] = appearences + 1 + karma;
            players[c.pId] = match.players[c.pId];
          });
          total++;
        });

        const playersStats: Array<PlayerStat> = _.keys(stats)
          .map(k => { return { appearences: stats[k], name: players[k] }; })
          .sort((l, r) => r.appearences - l.appearences);

        return Promise.resolve({ players: playersStats, matchesCount: total });
      });
  }
}

import { INITIAL_DUTY_ROSTER } from '../data/rosterData';
import { DutyDoctor } from '../types';

export class DutyRosterService {
  private roster: DutyDoctor[] = [...INITIAL_DUTY_ROSTER];
  private simulatedTime: string = '11:45'; // default daytime

  public getRoster(): DutyDoctor[] {
    return [...this.roster];
  }

  public updateDoctor(updated: DutyDoctor) {
    this.roster = this.roster.map(d => (d.id === updated.id ? updated : d));
  }

  public setSimulatedTime(timeStr: string) {
    this.simulatedTime = timeStr;
  }

  public getSimulatedTime(): string {
    return this.simulatedTime;
  }

  /**
   * Looks up the on-duty primary doctor and the fallback escalation chain for a given ward and time.
   */
  public getOnDutyTeam(ward: string = 'Labor & Delivery - Unit 4', customTime?: string): {
    primary: DutyDoctor;
    backup: DutyDoctor;
    tertiary: DutyDoctor;
    currentShift: 'Day Shift (07:00 - 19:00)' | 'Night Shift (19:00 - 07:00)';
  } {
    const time = customTime || this.simulatedTime;
    const [hStr, mStr] = time.split(':');
    const hours = parseInt(hStr, 10);
    const isDay = hours >= 7 && hours < 19;
    const currentShift = isDay ? 'Day Shift (07:00 - 19:00)' : 'Night Shift (19:00 - 07:00)';

    // Filter by ward and matching shift
    const matchingDocs = this.roster.filter(d => {
      if (d.shiftStart === '00:00' && d.shiftEnd === '23:59') return true; // 24h NICU
      const startH = parseInt(d.shiftStart.split(':')[0], 10);
      const endH = parseInt(d.shiftEnd.split(':')[0], 10);
      if (isDay) {
        return startH >= 7 && endH <= 19;
      } else {
        return startH >= 19 || endH <= 7;
      }
    });

    const primary = matchingDocs.find(d => d.priorityOrder === 1) || this.roster[0];
    const backup = matchingDocs.find(d => d.priorityOrder === 2) || this.roster[1];
    const tertiary = matchingDocs.find(d => d.priorityOrder === 3) || this.roster[2];

    return {
      primary,
      backup,
      tertiary,
      currentShift
    };
  }
}

export const dutyRosterService = new DutyRosterService();

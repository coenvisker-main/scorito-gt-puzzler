import { Etappe } from '../types';
import { SubTabBar } from './SubTabBar';
import { TeamRidersTab } from './TeamRidersTab';
import { TeamLineupTab } from './TeamLineupTab';
import { TeamScoresTab } from './TeamScoresTab';

type TeamTab = 'team' | 'opstelling' | 'scores';

interface TeamSectionProps {
  stages: Etappe[];
  activeTab: TeamTab;
  onTabChange: (id: TeamTab) => void;
}

const TABS = [
  { id: 'team',       label: 'Team',       icon: '🏃' },
  { id: 'opstelling', label: 'Opstelling', icon: '📋' },
  { id: 'scores',     label: 'Scores',     icon: '📊' },
];

export function TeamSection({ stages, activeTab, onTabChange }: TeamSectionProps) {
  return (
    <div className="flex flex-col gap-4 pb-48 max-w-7xl mx-auto">
      <div className="lg:hidden">
        <SubTabBar
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={id => onTabChange(id as TeamTab)}
        />
      </div>

      {activeTab === 'team' && (
        <TeamRidersTab stages={stages} />
      )}
      {activeTab === 'opstelling' && (
        <TeamLineupTab stages={stages} />
      )}
      {activeTab === 'scores' && (
        <TeamScoresTab stages={stages} />
      )}
    </div>
  );
}

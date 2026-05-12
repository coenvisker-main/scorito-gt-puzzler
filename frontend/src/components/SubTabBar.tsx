interface SubTab {
  id: string;
  label: string;
  icon: string;
}

interface SubTabBarProps {
  tabs: SubTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function SubTabBar({ tabs, activeTab, onTabChange }: SubTabBarProps) {
  return (
    <div className="flex w-full bg-neutral-800/60 rounded-2xl p-1 gap-1 border border-neutral-700/40">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/50'
          }`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

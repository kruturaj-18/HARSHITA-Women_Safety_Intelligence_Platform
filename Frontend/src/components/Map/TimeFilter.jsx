import { Clock, Radio, Calendar, CalendarDays, CalendarRange } from 'lucide-react';

const TIME_OPTIONS = [
  { value: 'live', label: 'Live', icon: Radio, description: 'Last 2 hours' },
  { value: 'day', label: '24h', icon: Clock, description: 'Last 24 hours' },
  { value: 'week', label: 'Week', icon: Calendar, description: 'Last 7 days' },
  { value: 'month', label: 'Month', icon: CalendarDays, description: 'Last 30 days' },
];

export default function TimeFilter({ timeRange, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-dark-800/60 rounded-xl p-1 border border-dark-700/50">
      {TIME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            timeRange === value
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
              : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

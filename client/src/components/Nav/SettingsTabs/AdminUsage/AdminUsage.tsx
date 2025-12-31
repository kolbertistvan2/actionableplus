import React, { useState, useMemo } from 'react';
import { Download, TrendingUp, Coins, Receipt, ChevronDown } from 'lucide-react';
import { Dropdown } from '@librechat/client';
import { useLocalize } from '~/hooks';
import {
  useAdminUsageSummary,
  getExportUrl,
  type ModelUsage,
  type UserUsage,
  type DailyUsage,
} from '~/data-provider/Admin';

/**
 * Format token value to readable cost
 * tokenValue is stored as millionths of a dollar (1 = $0.000001)
 */
const formatCost = (tokenValue: number): string => {
  const dollars = Math.abs(tokenValue) / 1_000_000;
  if (dollars >= 1) {
    return `$${dollars.toFixed(2)}`;
  } else if (dollars >= 0.01) {
    return `$${dollars.toFixed(4)}`;
  } else {
    return `$${dollars.toFixed(6)}`;
  }
};

/**
 * Format token count with K/M suffix
 */
const formatTokens = (tokens: number): string => {
  const absTokens = Math.abs(tokens);
  if (absTokens >= 1_000_000) {
    return `${(absTokens / 1_000_000).toFixed(1)}M`;
  } else if (absTokens >= 1_000) {
    return `${(absTokens / 1_000).toFixed(1)}K`;
  }
  return absTokens.toLocaleString();
};

/**
 * Summary Card Component
 */
const SummaryCard = ({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
}) => (
  <div className="flex flex-col gap-2 rounded-lg border border-border-light bg-surface-secondary p-4">
    <div className="flex items-center gap-2 text-text-secondary">
      <Icon size={16} />
      <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
    </div>
    <div className="text-2xl font-semibold text-text-primary">{value}</div>
    {subValue && <div className="text-xs text-text-tertiary">{subValue}</div>}
  </div>
);

/**
 * Model Breakdown Bar Component
 */
const ModelBar = ({
  model,
  cost,
  tokens,
  maxCost,
}: {
  model: string;
  cost: number;
  tokens: number;
  maxCost: number;
}) => {
  const percentage = maxCost > 0 ? (Math.abs(cost) / maxCost) * 100 : 0;
  const modelName = model.replace(/-\d{8}$/, ''); // Remove date suffix

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-text-primary">{modelName}</span>
        <span className="text-text-secondary">
          {formatCost(cost)} · {formatTokens(tokens)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${Math.max(percentage, 1)}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Daily Usage Sparkline (CSS-only)
 */
const DailySparkline = ({ data }: { data: DailyUsage[] }) => {
  const maxCost = Math.max(...data.map((d) => Math.abs(d.totalCost)), 1);

  // Show last 14 days only
  const recentData = data.slice(-14);

  return (
    <div className="flex h-12 items-end gap-0.5">
      {recentData.map((day, i) => {
        const height = (Math.abs(day.totalCost) / maxCost) * 100;
        return (
          <div
            key={day.date}
            className="flex-1 rounded-t bg-blue-500 transition-all duration-300 hover:bg-blue-400"
            style={{ height: `${Math.max(height, 4)}%` }}
            title={`${day.date}: ${formatCost(day.totalCost)}`}
          />
        );
      })}
    </div>
  );
};

/**
 * Top Users Table
 */
const TopUsersTable = ({ users }: { users: UserUsage[] }) => {
  const topUsers = users.slice(0, 10);

  if (topUsers.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-text-tertiary">No user data available</div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border-light">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-secondary text-xs uppercase text-text-secondary">
          <tr>
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2 text-right">Cost</th>
            <th className="px-3 py-2 text-right">Tokens</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {topUsers.map((user) => (
            <tr key={user.userId} className="hover:bg-surface-hover">
              <td className="px-3 py-2">
                <div className="font-medium text-text-primary">{user.name || 'Unknown'}</div>
                <div className="text-xs text-text-tertiary">{user.email}</div>
              </td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">
                {formatCost(user.totalCost)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-text-secondary">
                {formatTokens(user.totalTokens)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Main Admin Usage Dashboard Component
 */
function AdminUsage() {
  const localize = useLocalize();
  const [selectedDays, setSelectedDays] = useState(30);

  const { data, isLoading, error } = useAdminUsageSummary(selectedDays);

  const periodOptions = [
    { value: '7', label: localize('com_admin_usage_last_7_days') || 'Last 7 days' },
    { value: '30', label: localize('com_admin_usage_last_30_days') || 'Last 30 days' },
    { value: '90', label: localize('com_admin_usage_last_90_days') || 'Last 90 days' },
  ];

  const handlePeriodChange = (value: string) => {
    setSelectedDays(parseInt(value, 10));
  };

  const handleExport = () => {
    window.open(getExportUrl(selectedDays), '_blank');
  };

  // Sort models by cost for display
  const sortedModels = useMemo(() => {
    if (!data?.byModel) return [];
    return [...data.byModel].sort((a, b) => Math.abs(b.totalCost) - Math.abs(a.totalCost));
  }, [data?.byModel]);

  const maxModelCost = useMemo(() => {
    if (!sortedModels.length) return 0;
    return Math.abs(sortedModels[0]?.totalCost || 0);
  }, [sortedModels]);

  // Sort users by cost
  const sortedUsers = useMemo(() => {
    if (!data?.byUser) return [];
    return [...data.byUser].sort((a, b) => Math.abs(b.totalCost) - Math.abs(a.totalCost));
  }, [data?.byUser]);

  // Sort daily data by date
  const sortedDays = useMemo(() => {
    if (!data?.byDay) return [];
    return [...data.byDay].sort((a, b) => a.date.localeCompare(b.date));
  }, [data?.byDay]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-1 text-sm text-text-primary">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-secondary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-1 text-sm text-text-primary">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-500">
          {localize('com_admin_usage_error') || 'Failed to load usage data'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-1 text-sm text-text-primary">
      {/* Header with Period Selector and Export */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {localize('com_admin_usage_title') || 'Token Usage Analytics'}
        </h3>
        <div className="flex items-center gap-2">
          <Dropdown
            value={String(selectedDays)}
            onChange={handlePeriodChange}
            options={periodOptions}
            sizeClasses="w-[140px]"
            className="z-50"
          />
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-border-light bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover"
          >
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          icon={Coins}
          label={localize('com_admin_usage_total_cost') || 'Total Cost'}
          value={formatCost(data?.summary?.totalCost || 0)}
          subValue={`${selectedDays} days`}
        />
        <SummaryCard
          icon={TrendingUp}
          label={localize('com_admin_usage_total_tokens') || 'Total Tokens'}
          value={formatTokens(data?.summary?.totalTokens || 0)}
        />
        <SummaryCard
          icon={Receipt}
          label={localize('com_admin_usage_transactions') || 'Transactions'}
          value={(data?.summary?.totalTransactions || 0).toLocaleString()}
        />
      </div>

      {/* Daily Trend */}
      {sortedDays.length > 0 && (
        <div className="rounded-lg border border-border-light bg-surface-secondary p-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
            {localize('com_admin_usage_daily_trend') || 'Daily Usage (Last 14 Days)'}
          </div>
          <DailySparkline data={sortedDays} />
        </div>
      )}

      {/* Model Breakdown */}
      {sortedModels.length > 0 && (
        <div className="rounded-lg border border-border-light bg-surface-secondary p-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
            {localize('com_admin_usage_by_model') || 'Usage by Model'}
          </div>
          <div className="flex flex-col gap-3">
            {sortedModels.slice(0, 8).map((model) => (
              <ModelBar
                key={model._id}
                model={model._id}
                cost={model.totalCost}
                tokens={model.totalTokens}
                maxCost={maxModelCost}
              />
            ))}
          </div>
        </div>
      )}

      {/* Top Users */}
      {sortedUsers.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
            {localize('com_admin_usage_top_users') || 'Top Users by Cost'}
          </div>
          <TopUsersTable users={sortedUsers} />
        </div>
      )}
    </div>
  );
}

export default React.memo(AdminUsage);

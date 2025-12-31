import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import { request } from 'librechat-data-provider';

// Types for Admin Usage API responses
export interface UsageSummaryPeriod {
  days: number;
  startDate: string;
  endDate: string;
}

export interface UsageSummaryTotals {
  totalCost: number;
  totalTokens: number;
  totalTransactions: number;
}

export interface ModelUsage {
  _id: string;
  totalTokens: number;
  totalCost: number;
  promptTokens: number;
  completionTokens: number;
  count: number;
}

export interface UserUsage {
  userId: string;
  email: string;
  name: string;
  totalCost: number;
  totalTokens: number;
  count: number;
}

export interface DailyUsage {
  date: string;
  totalCost: number;
  totalTokens: number;
  count: number;
}

export interface UsageSummaryResponse {
  period: UsageSummaryPeriod;
  summary: UsageSummaryTotals;
  byModel: ModelUsage[];
  byUser: UserUsage[];
  byDay: DailyUsage[];
}

export interface Transaction {
  _id: string;
  user: string;
  userEmail?: string;
  userName?: string;
  model: string;
  tokenType: 'prompt' | 'completion';
  rawAmount: number;
  rate: number;
  tokenValue: number;
  context?: string;
  conversationId?: string;
  createdAt: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface UserBalance {
  userId: string;
  email: string;
  name: string;
  tokenCredits: number;
  autoRefillEnabled: boolean;
  lastRefill?: string;
}

export interface BalancesResponse {
  balances: UserBalance[];
}

// Query Keys
export const AdminQueryKeys = {
  usageSummary: (days: number) => ['admin', 'usage', 'summary', days] as const,
  usageTransactions: (params: Record<string, unknown>) =>
    ['admin', 'usage', 'transactions', params] as const,
  usageBalances: ['admin', 'usage', 'balances'] as const,
};

/**
 * Fetch admin usage summary
 */
export const useAdminUsageSummary = (
  days: number = 30,
  config?: UseQueryOptions<UsageSummaryResponse>,
): QueryObserverResult<UsageSummaryResponse> => {
  return useQuery<UsageSummaryResponse>(
    AdminQueryKeys.usageSummary(days),
    () => request.get(`/api/admin/usage/summary?days=${days}`),
    {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...config,
    },
  );
};

/**
 * Fetch admin usage transactions
 */
export const useAdminUsageTransactions = (
  params: {
    limit?: number;
    offset?: number;
    model?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  } = {},
  config?: UseQueryOptions<TransactionsResponse>,
): QueryObserverResult<TransactionsResponse> => {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.offset) queryParams.set('offset', String(params.offset));
  if (params.model) queryParams.set('model', params.model);
  if (params.userId) queryParams.set('userId', params.userId);
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);

  return useQuery<TransactionsResponse>(
    AdminQueryKeys.usageTransactions(params),
    () => request.get(`/api/admin/usage/transactions?${queryParams.toString()}`),
    {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
      ...config,
    },
  );
};

/**
 * Fetch all user balances
 */
export const useAdminUsageBalances = (
  config?: UseQueryOptions<BalancesResponse>,
): QueryObserverResult<BalancesResponse> => {
  return useQuery<BalancesResponse>(
    AdminQueryKeys.usageBalances,
    () => request.get('/api/admin/usage/balances'),
    {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...config,
    },
  );
};

/**
 * Get export URL for CSV download
 */
export const getExportUrl = (days: number = 30): string => {
  return `/api/admin/usage/export?days=${days}`;
};

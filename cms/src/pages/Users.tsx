import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User } from '../types';

type SortColumn = 'id' | 'subscriptionTier' | 'freeCredits' | 'subscriptionCredits' | 'consumableCredits' | 'totalCredits' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    // Query without orderBy first to avoid issues if createdAt field doesn't exist on all documents
    // We'll sort manually in JavaScript
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList: User[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<User, 'id'>),
      }));
      setUsers(userList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching users:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const sortedUsers = useMemo(() => {
    // Define custom tier order: ULTRA (0) > PRO (1) > Basic (2) > FREE (3)
    const tierOrder: Record<string, number> = {
      'ultra': 0,
      'pro': 1,
      'basic': 2,
      'free': 3,
    };

    const getTierOrder = (tier: string | undefined): number => {
      const normalizedTier = (tier || 'free').toLowerCase();
      return tierOrder[normalizedTier] ?? 3; // Default to FREE if unknown tier
    };

    const sorted = [...users];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'id':
          aValue = a.id || '';
          bValue = b.id || '';
          break;
        case 'subscriptionTier':
          // Use custom tier order instead of alphabetical
          aValue = getTierOrder(a.subscriptionTier);
          bValue = getTierOrder(b.subscriptionTier);
          break;
        case 'freeCredits':
          aValue = a.freeCredits || 0;
          bValue = b.freeCredits || 0;
          break;
        case 'subscriptionCredits':
          aValue = a.subscriptionCredits || 0;
          bValue = b.subscriptionCredits || 0;
          break;
        case 'consumableCredits':
          aValue = a.consumableCredits || 0;
          bValue = b.consumableCredits || 0;
          break;
        case 'totalCredits':
          aValue = (a.freeCredits || 0) + (a.subscriptionCredits || 0) + (a.consumableCredits || 0);
          bValue = (b.freeCredits || 0) + (b.subscriptionCredits || 0) + (b.consumableCredits || 0);
          break;
        case 'createdAt':
          aValue = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
          bValue = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
          break;
        case 'updatedAt':
          aValue = a.updatedAt?.toMillis?.() || a.updatedAt?.seconds || 0;
          bValue = b.updatedAt?.toMillis?.() || b.updatedAt?.seconds || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [users, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-3 h-3" style={{ color: '#FF9827' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3" style={{ color: '#FF9827' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '—';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
    }
    return '—';
  };

  const getSubscriptionTierBadge = (tier: string) => {
    const normalizedTier = tier.toLowerCase();
    
    // Define colors for each tier
    const tierColors: Record<string, { bg: string; text: string }> = {
      ultra: { bg: 'bg-purple-500', text: 'text-purple-900' },
      pro: { bg: 'bg-orange-500', text: 'text-orange-900' },
      basic: { bg: 'bg-blue-500', text: 'text-blue-900' },
      free: { bg: 'bg-gray-200', text: 'text-gray-700' },
    };
    
    const colors = tierColors[normalizedTier] || tierColors.free;
    
    // Format tier name: capitalize first letter, keep rest as-is
    const formatTierName = (t: string) => {
      if (t.toLowerCase() === 'ultra') return 'Ultra';
      if (t.toLowerCase() === 'pro') return 'Pro';
      if (t.toLowerCase() === 'basic') return 'Basic';
      if (t.toLowerCase() === 'free') return 'Free';
      return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg ${colors.bg} ${colors.text}`}>
        {normalizedTier === 'free' && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
        {(normalizedTier === 'pro' || normalizedTier === 'ultra' || normalizedTier === 'basic') && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
        {formatTierName(tier)}
      </span>
    );
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const ultraUsers = users.filter(u => u.subscriptionTier?.toLowerCase() === 'ultra').length;
    const proUsers = users.filter(u => u.subscriptionTier?.toLowerCase() === 'pro').length;
    const basicUsers = users.filter(u => u.subscriptionTier?.toLowerCase() === 'basic').length;
    const freeUsers = users.filter(u => !u.subscriptionTier || u.subscriptionTier?.toLowerCase() === 'free').length;
    
    const totalSubscriptions = ultraUsers + proUsers + basicUsers;
    
    // MMR calculation (Monthly Recurring Revenue)
    const basicMMR = basicUsers * 4.99;
    const proMMR = proUsers * 9.99;
    const ultraMMR = ultraUsers * 24.99;
    const totalMMR = basicMMR + proMMR + ultraMMR;
    
    // Credits metrics
    const totalFreeCreditsRemaining = users.reduce((sum, u) => sum + (u.freeCredits || 0), 0);
    const totalSubscriptionCredits = users.reduce((sum, u) => sum + (u.subscriptionCredits || 0), 0);
    const totalConsumableCredits = users.reduce((sum, u) => sum + (u.consumableCredits || 0), 0);
    const totalCreditsDistributed = totalFreeCreditsRemaining + totalSubscriptionCredits + totalConsumableCredits;
    
    // Free credits usage metrics
    // Users who have used free credits (have 0 or very few remaining)
    // We'll consider users with 0 free credits as having used them
    const usersWhoUsedFreeCredits = users.filter(u => {
      const tier = u.subscriptionTier?.toLowerCase() || 'free';
      return tier === 'free' && (u.freeCredits || 0) === 0;
    });
    const countUsersWhoUsedFreeCredits = usersWhoUsedFreeCredits.length;
    
    // Calculate total free credits used
    // This assumes users typically start with some free credits (e.g., 2 based on the image)
    // We'll estimate: if a user has 0 free credits, they likely used their initial allocation
    // For more accuracy, you'd need to track initial free credits given per user
    const estimatedInitialFreeCreditsPerUser = 2; // Default initial free credits
    const totalFreeCreditsUsed = countUsersWhoUsedFreeCredits * estimatedInitialFreeCreditsPerUser;
    
    // Also calculate for users who partially used (have some but not all)
    const usersWithPartialFreeCredits = users.filter(u => {
      const tier = u.subscriptionTier?.toLowerCase() || 'free';
      const credits = u.freeCredits || 0;
      return tier === 'free' && credits > 0 && credits < estimatedInitialFreeCreditsPerUser;
    });
    const partialCreditsUsed = usersWithPartialFreeCredits.reduce((sum, u) => {
      return sum + (estimatedInitialFreeCreditsPerUser - (u.freeCredits || 0));
    }, 0);
    
    const totalFreeCreditsUsedIncludingPartial = totalFreeCreditsUsed + partialCreditsUsed;
    const totalUsersWhoUsedFreeCredits = countUsersWhoUsedFreeCredits + usersWithPartialFreeCredits.length;
    
    // Additional metrics
    // Conversion rate: Free to paid
    const conversionRate = freeUsers > 0 ? (totalSubscriptions / (totalSubscriptions + freeUsers)) * 100 : 0;
    
    // ARPU (Average Revenue Per User)
    const arpu = users.length > 0 ? totalMMR / users.length : 0;
    
    // ARR (Annual Recurring Revenue) - MMR * 12
    const arr = totalMMR * 12;
    
    // New users in last 7 and 30 days
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    const newUsersLast7Days = users.filter(u => {
      const createdAt = u.createdAt?.toMillis?.() || u.createdAt?.seconds * 1000 || 0;
      return createdAt >= sevenDaysAgo;
    }).length;
    
    const newUsersLast30Days = users.filter(u => {
      const createdAt = u.createdAt?.toMillis?.() || u.createdAt?.seconds * 1000 || 0;
      return createdAt >= thirtyDaysAgo;
    }).length;
    
    // Average credits per user
    const averageCreditsPerUser = users.length > 0 ? totalCreditsDistributed / users.length : 0;
    
    // Credit utilization (for subscription users)
    const subscriptionUsers = users.filter(u => {
      const tier = u.subscriptionTier?.toLowerCase() || 'free';
      return tier !== 'free';
    });
    const avgCreditsPerSubscriptionUser = subscriptionUsers.length > 0 
      ? subscriptionUsers.reduce((sum, u) => {
          const total = (u.freeCredits || 0) + (u.subscriptionCredits || 0) + (u.consumableCredits || 0);
          return sum + total;
        }, 0) / subscriptionUsers.length
      : 0;
    
    return {
      totalUsers: users.length,
      totalSubscriptions,
      ultraUsers,
      proUsers,
      basicUsers,
      freeUsers,
      totalMMR,
      basicMMR,
      proMMR,
      ultraMMR,
      totalFreeCreditsRemaining,
      totalSubscriptionCredits,
      totalConsumableCredits,
      totalCreditsDistributed,
      countUsersWhoUsedFreeCredits: totalUsersWhoUsedFreeCredits,
      totalFreeCreditsUsed: totalFreeCreditsUsedIncludingPartial,
      conversionRate,
      arpu,
      arr,
      newUsersLast7Days,
      newUsersLast30Days,
      averageCreditsPerUser,
      avgCreditsPerSubscriptionUser,
    };
  }, [users]);

  return (
    <div className="w-full space-y-6">
      {/* Metrics Summary */}
      <section className="bg-white border-2 border-gray-200 rounded-xl shadow-lg p-6">
        <h3 className="font-bold text-lg mb-4" style={{ color: '#141619' }}>Metrics Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {/* Total Users */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Total Users</span>
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-blue-900">{metrics.totalUsers}</p>
          </div>

          {/* Total Subscriptions */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-orange-800 uppercase tracking-wide">Active Subscriptions</span>
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-orange-900">{metrics.totalSubscriptions}</p>
            <p className="text-xs text-orange-700 mt-1">
              Ultra: {metrics.ultraUsers} • Pro: {metrics.proUsers} • Basic: {metrics.basicUsers}
            </p>
          </div>

          {/* Monthly Recurring Revenue */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">Monthly Revenue (MMR)</span>
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-green-900">${metrics.totalMMR.toFixed(2)}</p>
            <p className="text-xs text-green-700 mt-1">
              Ultra: ${metrics.ultraMMR.toFixed(2)} ({metrics.ultraUsers} × $24.99) • Pro: ${metrics.proMMR.toFixed(2)} ({metrics.proUsers} × $9.99) • Basic: ${metrics.basicMMR.toFixed(2)} ({metrics.basicUsers} × $4.99)
            </p>
          </div>

          {/* Total Credits Distributed */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Total Credits</span>
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-purple-900">{metrics.totalCreditsDistributed.toLocaleString()}</p>
            <p className="text-xs text-purple-700 mt-1">
              Free: {metrics.totalFreeCreditsRemaining.toLocaleString()} • Sub: {metrics.totalSubscriptionCredits.toLocaleString()} • Consumable: {metrics.totalConsumableCredits.toLocaleString()}
            </p>
          </div>

          {/* Free Credits Usage */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">Free Credits Used</span>
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-indigo-900">{metrics.totalFreeCreditsUsed.toLocaleString()}</p>
            <p className="text-xs text-indigo-700 mt-1">
              {metrics.countUsersWhoUsedFreeCredits} {metrics.countUsersWhoUsedFreeCredits === 1 ? 'user' : 'users'} used free credits
            </p>
          </div>

          {/* Conversion Rate */}
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Conversion Rate</span>
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-teal-900">{metrics.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-teal-700 mt-1">
              {metrics.totalSubscriptions} paid / {metrics.freeUsers} free users
            </p>
          </div>

          {/* ARPU */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Avg Revenue/User</span>
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-amber-900">${metrics.arpu.toFixed(2)}</p>
            <p className="text-xs text-amber-700 mt-1">
              Monthly average per user
            </p>
          </div>

          {/* ARR */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Annual Revenue (ARR)</span>
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-emerald-900">${metrics.arr.toFixed(2)}</p>
            <p className="text-xs text-emerald-700 mt-1">
              Projected annual revenue
            </p>
          </div>

          {/* New Users */}
          <div className="bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wide">New Users</span>
              <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-rose-900">{metrics.newUsersLast7Days}</p>
            <p className="text-xs text-rose-700 mt-1">
              Last 7 days • {metrics.newUsersLast30Days} in last 30 days
            </p>
          </div>

          {/* Average Credits */}
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-cyan-800 uppercase tracking-wide">Avg Credits/User</span>
              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-cyan-900">{metrics.averageCreditsPerUser.toFixed(1)}</p>
            <p className="text-xs text-cyan-700 mt-1">
              {metrics.avgCreditsPerSubscriptionUser.toFixed(1)} avg for paid users
            </p>
          </div>
        </div>
      </section>

      {/* Users Table */}
      <section className="bg-white border-2 border-gray-200 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: '#141619' }}>Users</h3>
              <p className="text-xs text-gray-500">Manage and view all users</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ backgroundColor: 'rgba(255, 152, 39, 0.1)', borderColor: 'rgba(255, 152, 39, 0.3)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FF9827' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: '#cc7820' }}>
              {sortedUsers.length} {sortedUsers.length === 1 ? 'user' : 'users'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin w-8 h-8" style={{ color: '#FF9827' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-600">Loading users...</p>
            </div>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm">Users will appear here once they register</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(20, 22, 25, 0.1)' }}>
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr className="text-left" style={{ borderBottom: '2px solid rgba(20, 22, 25, 0.1)' }}>
                  <th 
                    className="py-3 pr-3 pl-4 font-bold text-gray-700 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-1.5">
                      User ID
                      <SortIcon column="id" />
                    </div>
                  </th>
                  <th 
                    className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                    onClick={() => handleSort('subscriptionTier')}
                  >
                    <div className="flex items-center gap-1.5">
                      Subscription Tier
                      <SortIcon column="subscriptionTier" />
                    </div>
                  </th>
                  <th 
                    className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                    onClick={() => handleSort('freeCredits')}
                  >
                    <div className="flex items-center gap-1.5">
                      Free Credits
                      <SortIcon column="freeCredits" />
                    </div>
                  </th>
                  <th 
                    className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                    onClick={() => handleSort('subscriptionCredits')}
                  >
                    <div className="flex items-center gap-1.5">
                      Subscription Credits
                      <SortIcon column="subscriptionCredits" />
                    </div>
                  </th>
                  <th 
                    className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                    onClick={() => handleSort('consumableCredits')}
                  >
                    <div className="flex items-center gap-1.5">
                      Consumable Credits
                      <SortIcon column="consumableCredits" />
                    </div>
                  </th>
                  <th 
                    className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                    onClick={() => handleSort('totalCredits')}
                  >
                    <div className="flex items-center gap-1.5">
                      Total Credits
                      <SortIcon column="totalCredits" />
                    </div>
                  </th>
                  <th 
                    className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      Created At
                      <SortIcon column="createdAt" />
                    </div>
                  </th>
                  <th 
                    className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                    onClick={() => handleSort('updatedAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      Updated At
                      <SortIcon column="updatedAt" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user, index) => {
                  const totalCredits = (user.freeCredits || 0) + (user.subscriptionCredits || 0) + (user.consumableCredits || 0);
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors"
                      style={{ borderBottom: index < sortedUsers.length - 1 ? '1px solid rgba(20, 22, 25, 0.1)' : 'none' }}
                    >
                      <td className="py-3 pr-3 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}>
                            {user.id?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="font-mono text-xs text-gray-700 font-medium">{user.id}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        {getSubscriptionTierBadge(user.subscriptionTier || 'free')}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 9.766 14 8.991 14 8c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 5.092V4z" clipRule="evenodd" />
                          </svg>
                          {user.freeCredits || 0}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 9.766 14 8.991 14 8c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 5.092V4z" clipRule="evenodd" />
                          </svg>
                          {user.subscriptionCredits || 0}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 9.766 14 8.991 14 8c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 5.092V4z" clipRule="evenodd" />
                          </svg>
                          {user.consumableCredits || 0}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 9.766 14 8.991 14 8c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 5.092V4z" clipRule="evenodd" />
                          </svg>
                          {totalCredits}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-xs text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3 pr-3 text-xs text-gray-600">
                        {formatDate(user.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}


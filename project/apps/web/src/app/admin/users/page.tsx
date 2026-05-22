'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Mail,
  Phone,
  Calendar,
  Bookmark,
  Share2,
  Tag,
  FolderTree,
  Crown,
  Ban,
  CheckCircle,
  AlertTriangle,
  X,
  Lock,
  Globe,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { getUsers, getUserDetail, updateUser } from '@/lib/adminApi';
import { useToast } from '@/components/Toast';

interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  nickname: string | null;
  avatar: string | null;
  authSource: string;
  lang: string;
  userTier: string;
  status: string;
  subscriptionExpiresAt: string | null;
  subscriptionSource: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  collectionCount: number;
  tagCount: number;
  listCount: number;
  shareCount: number;
}

interface UserDetail extends AdminUser {
  shareViewCount: number;
  shareSubscriptionCount: number;
  bannedAt: string | null;
  bannedReason: string | null;
  loginAttempts: number;
  lockedUntil: string | null;
  quotaLimits?: Record<string, number> | null;
}

interface UserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

type SortField = 'createdAt' | 'lastLoginAt' | 'nickname' | 'email';
type SortOrder = 'asc' | 'desc';

const statusMap: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: '正常', color: 'bg-green-50 text-green-600', icon: CheckCircle },
  suspended: { label: '已暂停', color: 'bg-amber-50 text-amber-600', icon: AlertTriangle },
  banned: { label: '已封禁', color: 'bg-red-50 text-red-600', icon: Ban },
};

export default function UserManagementPage() {
  const [data, setData] = useState<UserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast, showAlert } = useToast();

  useEffect(() => {
    loadUsers();
  }, [page, sortBy, sortOrder, statusFilter]);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await getUsers({
        page,
        pageSize,
        keyword: keyword || undefined,
        sortBy,
        sortOrder,
      });
      setData(res.data);
    } catch (e) {
      setError('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadUsers();
  }

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }

  async function openDetail(userId: string) {
    try {
      setDetailLoading(true);
      const res = await getUserDetail(userId);
      setDetailUser(res.data);
    } catch {
      showAlert('获取用户详情失败', 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleUpdateStatus(userId: string, status: string, reason?: string) {
    try {
      setActionLoading(true);
      await updateUser(userId, { status, bannedReason: reason });
      showToast(`用户已${status === 'active' ? '启用' : status === 'suspended' ? '暂停' : '封禁'}`, 'success');
      loadUsers();
      if (detailUser && detailUser.id === userId) {
        openDetail(userId);
      }
    } catch {
      showAlert('操作失败', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateTier(userId: string, tier: string) {
    try {
      setActionLoading(true);
      await updateUser(userId, { userTier: tier });
      showToast('用户等级已更新', 'success');
      loadUsers();
      if (detailUser && detailUser.id === userId) {
        openDetail(userId);
      }
    } catch {
      showAlert('操作失败', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getTierLabel(tier: string) {
    const map: Record<string, string> = { medium: '基础版', heavy: '专业版', super: '旗舰版' };
    return map[tier] || tier;
  }

  function getTierColor(tier: string) {
    const map: Record<string, string> = {
      medium: 'bg-gray-100 text-gray-500',
      heavy: 'bg-amber-50 text-amber-600',
      super: 'bg-purple-50 text-purple-600',
    };
    return map[tier] || 'bg-gray-100 text-gray-500';
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const filteredItems = statusFilter
    ? (data?.items || []).filter((u) => u.status === statusFilter)
    : (data?.items || []);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-medium text-gray-900">用户管理</h2>
          {data && (
            <span className="text-xs text-gray-400 ml-2">
              共 {data.total} 位用户
            </span>
          )}
        </div>
      </div>

      {/* 搜索和筛选 */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索邮箱、昵称、用户名或手机号..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-amber-400"
        >
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="suspended">已暂停</option>
          <option value="banned">已封禁</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-amber-500 text-white border border-amber-500 rounded-md text-sm hover:bg-amber-600 transition-colors"
        >
          搜索
        </button>
      </form>

      {/* 表格 */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
            <span className="ml-2 text-sm text-gray-400">加载中...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-sm">{error}</p>
            <button
              onClick={loadUsers}
              className="mt-3 px-4 py-1.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            >
              重试
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left bg-gray-50">
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium">用户信息</th>
                    <th
                      className="px-4 py-3 text-xs text-gray-500 font-medium cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('createdAt')}
                    >
                      <span className="flex items-center gap-1">
                        注册时间<ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th
                      className="px-4 py-3 text-xs text-gray-500 font-medium cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('lastLoginAt')}
                    >
                      <span className="flex items-center gap-1">
                        最后登录<ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium">状态</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium">等级</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium">数据统计</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((user) => {
                    const statusInfo = statusMap[user.status] || statusMap.active;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500 shrink-0">
                              {user.nickname?.[0] || user.email?.[0] || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-gray-900 font-medium truncate">
                                {user.nickname || user.username || '未命名用户'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                                {user.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />{user.email}
                                  </span>
                                )}
                                {user.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />{user.phone}
                                  </span>
                                )}
                                {user.authSource !== 'email' && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500">
                                    {user.authSource}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{formatDate(user.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(user.lastLoginAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3" />{statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${getTierColor(user.userTier)}`}>
                            {user.userTier !== 'medium' && <Crown className="w-3 h-3" />}
                            {getTierLabel(user.userTier)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 text-[11px] text-gray-400">
                            <span className="flex items-center gap-1" title="收藏数">
                              <Bookmark className="w-3 h-3" />{user.collectionCount}
                            </span>
                            <span className="flex items-center gap-1" title="分组数">
                              <FolderTree className="w-3 h-3" />{user.listCount}
                            </span>
                            <span className="flex items-center gap-1" title="标签数">
                              <Tag className="w-3 h-3" />{user.tagCount}
                            </span>
                            <span className="flex items-center gap-1" title="分享数">
                              <Share2 className="w-3 h-3" />{user.shareCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openDetail(user.id)}
                              className="px-2 py-1 text-[11px] text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                            >
                              详情
                            </button>
                            {user.status === 'active' ? (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(user.id, 'suspended')}
                                  disabled={actionLoading}
                                  className="px-2 py-1 text-[11px] text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors disabled:opacity-50"
                                >
                                  暂停
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(user.id, 'banned')}
                                  disabled={actionLoading}
                                  className="px-2 py-1 text-[11px] text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                                >
                                  封禁
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(user.id, 'active')}
                                disabled={actionLoading}
                                className="px-2 py-1 text-[11px] text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                              >
                                启用
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredItems.length === 0 && !loading && (
              <div className="py-12 text-center text-gray-400 text-sm">
                暂无用户数据
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <span className="text-xs text-gray-400">
                  第 {page} / {totalPages} 页，共 {data?.total} 条
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-500 min-w-[3rem] text-center">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 用户详情抽屉 */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetailUser(null)} />
          <div className="relative w-full max-w-md bg-white border-l border-gray-200 h-full overflow-y-auto shadow-xl">
            {/* 头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <h3 className="text-base font-medium text-gray-900">用户详情</h3>
              <button
                onClick={() => setDetailUser(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
              </div>
            ) : (
              <div className="p-5 space-y-6">
                {/* 基本信息 */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-xl font-medium text-gray-500">
                    {detailUser.nickname?.[0] || detailUser.email?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {detailUser.nickname || detailUser.username || '未命名用户'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const s = statusMap[detailUser.status] || statusMap.active;
                        const Icon = s.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${s.color}`}>
                            <Icon className="w-3 h-3" />{s.label}
                          </span>
                        );
                      })()}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${getTierColor(detailUser.userTier)}`}>
                        {detailUser.userTier !== 'medium' && <Crown className="w-3 h-3" />}
                        {getTierLabel(detailUser.userTier)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 联系信息 */}
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-2">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">联系信息</h4>
                  {detailUser.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-300 shrink-0" />
                      {detailUser.email}
                    </div>
                  )}
                  {detailUser.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-300 shrink-0" />
                      {detailUser.phone}
                    </div>
                  )}
                  {detailUser.username && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe className="w-4 h-4 text-gray-300 shrink-0" />
                      @{detailUser.username}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ShieldAlert className="w-4 h-4 text-gray-300 shrink-0" />
                    注册来源: {detailUser.authSource}
                  </div>
                </div>

                {/* 时间信息 */}
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-2">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">时间信息</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-300 shrink-0" />
                    注册时间: {formatDate(detailUser.createdAt)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-gray-300 shrink-0" />
                    最后登录: {formatDate(detailUser.lastLoginAt)}
                  </div>
                  {detailUser.lastLoginIp && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe className="w-4 h-4 text-gray-300 shrink-0" />
                      登录IP: {detailUser.lastLoginIp}
                    </div>
                  )}
                  {detailUser.bannedAt && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <Ban className="w-4 h-4 shrink-0" />
                      封禁时间: {formatDate(detailUser.bannedAt)}
                    </div>
                  )}
                  {detailUser.lockedUntil && new Date(detailUser.lockedUntil) > new Date() && (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                      <Lock className="w-4 h-4 shrink-0" />
                      锁定至: {formatDate(detailUser.lockedUntil)}
                    </div>
                  )}
                </div>

                {/* 数据统计 */}
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-3">数据统计</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: detailUser.collectionCount, label: '收藏', limit: detailUser.quotaLimits?.collections },
                      { value: detailUser.listCount, label: '分组', limit: detailUser.quotaLimits?.lists },
                      { value: detailUser.tagCount, label: '标签', limit: detailUser.quotaLimits?.tags },
                      { value: detailUser.shareCount, label: '分享', limit: detailUser.quotaLimits?.shares },
                      { value: detailUser.shareViewCount ?? 0, label: '浏览' },
                      { value: detailUser.shareSubscriptionCount ?? 0, label: '订阅' },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-2 bg-white rounded border border-gray-100">
                        <p className="text-lg font-semibold text-gray-900">{item.value}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {item.label}
                          {item.limit !== undefined && item.limit !== 999999 && (
                            <span className="text-amber-500"> / {item.limit}</span>
                          )}
                          {item.limit === 999999 && (
                            <span className="text-green-500"> / 无限制</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 配额详情 */}
                {detailUser.quotaLimits && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <h4 className="text-xs font-medium text-gray-500 mb-3">配额限制</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        { key: 'shares', label: '分享数量' },
                        { key: 'shareItems', label: '分享项总数' },
                        { key: 'coverImages', label: '封面数量' },
                        { key: 'maxItemsPerShare', label: '单次分享容量' },
                        { key: 'dailyImportLimit', label: '每日导入条数' },
                      ].map(({ key, label }) => {
                        const limit = detailUser.quotaLimits?.[key];
                        if (limit === undefined) return null;
                        return (
                          <div key={key} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium text-gray-900">
                              {limit === 999999 ? '无限制' : limit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-500">管理操作</h4>
                  <div className="flex flex-wrap gap-2">
                    {detailUser.status !== 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(detailUser.id, 'active')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-xs text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-3 h-3 inline mr-1" />启用账号
                      </button>
                    )}
                    {detailUser.status !== 'suspended' && (
                      <button
                        onClick={() => handleUpdateStatus(detailUser.id, 'suspended')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-xs text-amber-600 bg-amber-50 hover:bg-amber-100 rounded transition-colors disabled:opacity-50"
                      >
                        <AlertTriangle className="w-3 h-3 inline mr-1" />暂停账号
                      </button>
                    )}
                    {detailUser.status !== 'banned' && (
                      <button
                        onClick={() => handleUpdateStatus(detailUser.id, 'banned', '违反社区规范')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                      >
                        <Ban className="w-3 h-3 inline mr-1" />封禁账号
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['medium', 'heavy', 'super'].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => handleUpdateTier(detailUser.id, tier)}
                        disabled={actionLoading || detailUser.userTier === tier}
                        className={`px-3 py-1.5 text-xs rounded transition-colors disabled:opacity-50 ${
                          detailUser.userTier === tier
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        设为{getTierLabel(tier)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

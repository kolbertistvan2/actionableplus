const express = require('express');
const { checkAdmin, requireJwtAuth } = require('~/server/middleware');
const { Transaction, Balance, User } = require('~/db/models');
const { logger } = require('@librechat/data-schemas');

const router = express.Router();

// All routes require authentication and admin role
router.use(requireJwtAuth);
router.use(checkAdmin);

/**
 * GET /api/admin/usage/summary
 * Returns aggregated usage statistics by model, user, and day
 */
router.get('/summary', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days, 10));

    // Aggregate by model
    const byModel = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$model',
          totalTokens: { $sum: { $abs: '$rawAmount' } },
          totalCost: { $sum: { $abs: '$tokenValue' } },
          promptTokens: {
            $sum: {
              $cond: [{ $eq: ['$tokenType', 'prompt'] }, { $abs: '$rawAmount' }, 0],
            },
          },
          completionTokens: {
            $sum: {
              $cond: [{ $eq: ['$tokenType', 'completion'] }, { $abs: '$rawAmount' }, 0],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCost: -1 } },
    ]);

    // Aggregate by user (top 20)
    const byUser = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$user',
          totalCost: { $sum: { $abs: '$tokenValue' } },
          totalTokens: { $sum: { $abs: '$rawAmount' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCost: -1 } },
      { $limit: 20 },
    ]);

    // Get user emails for the top users
    const userIds = byUser.map((u) => u._id);
    const users = await User.find({ _id: { $in: userIds } }, 'email name').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const byUserWithEmail = byUser.map((u) => ({
      userId: u._id,
      email: userMap.get(u._id.toString())?.email || 'Unknown',
      name: userMap.get(u._id.toString())?.name || '',
      totalCost: u.totalCost,
      totalTokens: u.totalTokens,
      count: u.count,
    }));

    // Aggregate by day
    const byDay = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          totalCost: { $sum: { $abs: '$tokenValue' } },
          totalTokens: { $sum: { $abs: '$rawAmount' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Total summary
    const totalCost = byModel.reduce((sum, m) => sum + m.totalCost, 0);
    const totalTokens = byModel.reduce((sum, m) => sum + m.totalTokens, 0);
    const totalTransactions = byModel.reduce((sum, m) => sum + m.count, 0);

    res.status(200).json({
      period: {
        days: parseInt(days, 10),
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      summary: {
        totalCost,
        totalTokens,
        totalTransactions,
      },
      byModel,
      byUser: byUserWithEmail,
      byDay: byDay.map((d) => ({
        date: d._id,
        totalCost: d.totalCost,
        totalTokens: d.totalTokens,
        count: d.count,
      })),
    });
  } catch (error) {
    logger.error('[AdminUsage] Error fetching summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/usage/transactions
 * Returns detailed transaction log with filters
 */
router.get('/transactions', async (req, res) => {
  try {
    const { limit = 100, offset = 0, model, userId, startDate, endDate } = req.query;

    const filter = {};

    if (model) {
      filter.model = model;
    }

    if (userId) {
      filter.user = userId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset, 10))
        .limit(parseInt(limit, 10))
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    // Get user emails
    const userIds = [...new Set(transactions.map((t) => t.user?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }, 'email name').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const transactionsWithUser = transactions.map((t) => ({
      ...t,
      userEmail: userMap.get(t.user?.toString())?.email || 'Unknown',
      userName: userMap.get(t.user?.toString())?.name || '',
    }));

    res.status(200).json({
      transactions: transactionsWithUser,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        hasMore: parseInt(offset, 10) + transactions.length < total,
      },
    });
  } catch (error) {
    logger.error('[AdminUsage] Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/usage/balances
 * Returns all user balances
 */
router.get('/balances', async (req, res) => {
  try {
    const balances = await Balance.find({}).lean();

    // Get user emails
    const userIds = balances.map((b) => b.user);
    const users = await User.find({ _id: { $in: userIds } }, 'email name').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const balancesWithUser = balances.map((b) => ({
      userId: b.user,
      email: userMap.get(b.user?.toString())?.email || 'Unknown',
      name: userMap.get(b.user?.toString())?.name || '',
      tokenCredits: b.tokenCredits,
      autoRefillEnabled: b.autoRefillEnabled,
      lastRefill: b.lastRefill,
    }));

    res.status(200).json({
      balances: balancesWithUser.sort((a, b) => b.tokenCredits - a.tokenCredits),
    });
  } catch (error) {
    logger.error('[AdminUsage] Error fetching balances:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/usage/export
 * Export transactions as CSV
 */
router.get('/export', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days, 10));

    const transactions = await Transaction.find({
      createdAt: { $gte: startDate },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Get user emails
    const userIds = [...new Set(transactions.map((t) => t.user?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }, 'email').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u.email]));

    // Generate CSV
    const headers = [
      'Date',
      'User Email',
      'Model',
      'Token Type',
      'Raw Amount',
      'Rate',
      'Token Value',
      'Context',
      'Conversation ID',
    ];

    const rows = transactions.map((t) => [
      t.createdAt?.toISOString() || '',
      userMap.get(t.user?.toString()) || 'Unknown',
      t.model || '',
      t.tokenType || '',
      Math.abs(t.rawAmount || 0),
      t.rate || 0,
      Math.abs(t.tokenValue || 0),
      t.context || '',
      t.conversationId || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=usage-export-${new Date().toISOString().split('T')[0]}.csv`,
    );
    res.send(csv);
  } catch (error) {
    logger.error('[AdminUsage] Error exporting:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

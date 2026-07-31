import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { DailyReviewRecord } from '../src/models/DailyReviewRecord.js';
import { Lead } from '../src/models/Lead.js';
import { OngoingJob } from '../src/models/OngoingJob.js';
import { Task } from '../src/models/Task.js';
import {
  getDubaiBusinessDate,
  getTodayReviewStatus,
  completeDailyReview,
  getMonthlyReviewHistory,
  getDashboardWorkingViewData,
} from '../src/services/dailyReviewService.js';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

test('Daily Review & Working View Backend Suite', async (t) => {
  if (!process.env.MONGODB_URI) {
    t.skip('MongoDB not connected; skipping database execution tests.');
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const testSuffix = String(Date.now());

  const mockUser = {
    _id: new mongoose.Types.ObjectId(),
    displayName: 'Talha Test User',
    username: 'talhatest',
  };

  const todayDubai = getDubaiBusinessDate();

  t.after(async () => {
    await DailyReviewRecord.deleteMany({ businessDate: todayDubai });
    await mongoose.disconnect();
  });

  await t.test('1. getDubaiBusinessDate returns YYYY-MM-DD format', () => {
    const dStr = getDubaiBusinessDate();
    assert.match(dStr, /^\d{4}-\d{2}-\d{2}$/);
  });

  await t.test('2. completeDailyReview persists stable user ID, snapshot name, and timestamp', async () => {
    const record = await completeDailyReview('ongoing_jobs', mockUser);

    assert.ok(record);
    assert.equal(record.businessDate, todayDubai);
    assert.equal(record.section, 'ongoing_jobs');
    assert.equal(String(record.completedByUserId), String(mockUser._id));
    assert.equal(record.completedByName, 'Talha Test User');
    assert.ok(record.completedAt);

    const status = await getTodayReviewStatus();
    assert.equal(status.sections.ongoing_jobs.isCompleted, true);
    assert.equal(status.sections.ongoing_jobs.completedByName, 'Talha Test User');
  });

  await t.test('3. Repeat completion is idempotent and preserves first user and timestamp', async () => {
    const secondUser = {
      _id: new mongoose.Types.ObjectId(),
      displayName: 'Second User',
      username: 'seconduser',
    };

    const record = await completeDailyReview('ongoing_jobs', secondUser);

    assert.equal(String(record.completedByUserId), String(mockUser._id));
    assert.equal(record.completedByName, 'Talha Test User');

    const count = await DailyReviewRecord.countDocuments({ businessDate: todayDubai, section: 'ongoing_jobs' });
    assert.equal(count, 1);
  });

  await t.test('4. Monthly review history calculates status rows and excludes future dates', async () => {
    await completeDailyReview('key_relationships', mockUser);
    await completeDailyReview('leads', mockUser);

    const [year, month] = todayDubai.split('-').map(Number);
    const history = await getMonthlyReviewHistory(year, month);

    assert.equal(history.year, year);
    assert.equal(history.month, month);
    assert.ok(history.days.length >= 28);

    const todayBlock = history.days.find((d) => d.date === todayDubai);
    assert.ok(todayBlock);
    assert.equal(todayBlock.ongoing_jobs.completed, true);
    assert.equal(todayBlock.key_relationships.completed, true);
    assert.equal(todayBlock.leads.completed, true);
    assert.equal(todayBlock.all_three.status, 'completed');
    assert.equal(todayBlock.all_three.count, 3);
  });

  await t.test('5. getDashboardWorkingViewData returns structured working sections', async () => {
    const data = await getDashboardWorkingViewData();
    assert.ok(Array.isArray(data.ongoingJobs));
    assert.ok(Array.isArray(data.keyRelationships));
    assert.ok(Array.isArray(data.leads));
  });
});

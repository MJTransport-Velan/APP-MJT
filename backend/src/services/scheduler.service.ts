import cron, { type ScheduledTask } from 'node-cron';
import { AutomationRule, AutomationRunTrigger } from '@prisma/client';
import { automationRuleRepository } from '../repositories/automation-rule.repository';
import { executeAutomationAction } from './automation-action.handlers';
import { dueReminderService } from './due-reminder.service';
import { logger } from '../config/logger';

const activeTasks = new Map<string, ScheduledTask>();

/**
 * The due-date reminder scan is built in rather than an AutomationRule: EMI,
 * document-expiry and payment reminders have to work on a fresh install with
 * nothing configured. It is kept out of `activeTasks` so a rule reload never
 * cancels it.
 */
let dueReminderTask: ScheduledTask | null = null;

async function runDueReminderScan() {
  try {
    await dueReminderService.run();
  } catch (err) {
    // No Organization yet on a fresh database is the usual cause, and it must
    // not take the scheduler (or boot) down with it.
    logger.error('Due-date reminder scan failed', err);
  }
}

async function reloadDueReminderTask() {
  dueReminderTask?.stop();
  dueReminderTask = null;

  const expression = await dueReminderService.cronExpression();
  if (!cron.validate(expression)) {
    logger.error(`Due-date reminder cron expression is invalid: ${expression}`);
    return;
  }
  dueReminderTask = cron.schedule(expression, () => {
    void runDueReminderScan();
  });
  logger.info(`Scheduler: due-date reminder scan registered (${expression})`);
}

async function runRule(rule: AutomationRule, triggeredBy: AutomationRunTrigger, actorId?: string) {
  const runLog = await automationRuleRepository.createRunLog({ automationRuleId: rule.id, triggeredBy, status: 'RUNNING' });
  try {
    const result = await executeAutomationAction(rule, triggeredBy, actorId);
    await automationRuleRepository.updateRunLog(runLog.id, { status: 'SUCCESS', completedAt: new Date(), resultSummary: result.summary });
    await automationRuleRepository.update(rule.id, { lastRunAt: new Date(), lastRunStatus: 'SUCCESS' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Automation run failed';
    logger.error(`Automation rule ${rule.id} (${rule.name}) failed`, err);
    await automationRuleRepository.updateRunLog(runLog.id, { status: 'FAILED', completedAt: new Date(), errorMessage: message.slice(0, 1000) });
    await automationRuleRepository.update(rule.id, { lastRunAt: new Date(), lastRunStatus: 'FAILED' });
  }
}

export const schedulerService = {
  /** Registers a node-cron task per active SCHEDULE-triggered AutomationRule. Called once at boot and again after any AutomationRule CRUD change, so edits take effect without a server restart. */
  async reload() {
    for (const task of activeTasks.values()) task.stop();
    activeTasks.clear();

    const rules = await automationRuleRepository.findAllActiveScheduled();
    for (const rule of rules) {
      if (!rule.cronExpression || !cron.validate(rule.cronExpression)) {
        logger.error(`Automation rule ${rule.id} (${rule.name}) has an invalid cron expression: ${rule.cronExpression}`);
        continue;
      }
      const task = cron.schedule(rule.cronExpression, () => {
        void runRule(rule, 'SCHEDULE');
      });
      activeTasks.set(rule.id, task);
    }
    logger.info(`Scheduler: ${activeTasks.size} automation rule(s) registered`);

    await reloadDueReminderTask();
    // Catch up immediately on boot so a server that was down at scan time
    // still warns about anything falling due — the scan is idempotent, so an
    // extra run raises nothing that today's already raised.
    void runDueReminderScan();
  },

  /** Runs the due-date reminder scan now, outside its schedule. */
  runDueReminderScanNow(leadDays?: number) {
    return dueReminderService.run(leadDays === undefined ? undefined : { leadDays });
  },

  async runManual(ruleId: string, actorId: string) {
    const rule = await automationRuleRepository.findById(ruleId);
    if (!rule) throw new Error('Automation rule not found');
    await runRule(rule, 'MANUAL', actorId);
    return automationRuleRepository.findById(ruleId);
  },

  /** EVENT-triggered rules — no prior-phase module emits into this yet (nothing in Phases 1-13 was modified to call it), but it's a real, working dispatch path for future/manual use. */
  async fireEvent(organizationId: string, eventCode: string) {
    const rules = await automationRuleRepository.findAllActiveForEvent(organizationId, eventCode);
    for (const rule of rules) void runRule(rule, 'EVENT');
    return { matched: rules.length };
  },

  activeTaskCount() {
    return activeTasks.size;
  },
};

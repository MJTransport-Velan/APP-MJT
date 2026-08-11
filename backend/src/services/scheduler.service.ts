import cron, { type ScheduledTask } from 'node-cron';
import { AutomationRule, AutomationRunTrigger } from '@prisma/client';
import { automationRuleRepository } from '../repositories/automation-rule.repository';
import { executeAutomationAction } from './automation-action.handlers';
import { logger } from '../config/logger';

const activeTasks = new Map<string, ScheduledTask>();

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

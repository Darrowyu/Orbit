---
name: workflow-orchestration-patterns
description: Design durable workflows with patterns for distributed systems. Covers workflow vs activity separation, saga patterns, state management, and determinism constraints. Use when building long-running processes, distributed transactions, or microservice orchestration.
---

## Workflow Orchestration Patterns

Patterns for building robust, long-running business processes.

### When to Use This Skill

- KPI calculation workflows
- Assessment period processing
- Report generation pipelines
- Data import/export jobs
- Background task orchestration

### KPI Calculation Workflow

#### Workflow Design
```typescript
// KPI Calculation Pipeline
interface CalculationWorkflow {
  assessmentPeriodId: string;
  steps: WorkflowStep[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: number;
  error?: string;
}

enum WorkflowStep {
  VALIDATE_DATA = 'validate_data',
  COLLECT_ACTUALS = 'collect_actuals',
  CALCULATE_SCORES = 'calculate_scores',
  AGGREGATE_RESULTS = 'aggregate_results',
  GENERATE_RANKINGS = 'generate_rankings',
  NOTIFY_STAKEHOLDERS = 'notify_stakeholders',
}
```

#### Implementation with Bull Queue
```typescript
// calculation.processor.ts
@Processor('calculation')
export class CalculationProcessor {
  @Process('calculate-period')
  async handleCalculation(job: Job<CalculationJobData>) {
    const { assessmentPeriodId } = job.data;
    
    try {
      // Step 1: Validate
      await job.progress(10);
      await this.validateData(assessmentPeriodId);
      
      // Step 2: Collect actuals
      await job.progress(30);
      const actuals = await this.collectActuals(assessmentPeriodId);
      
      // Step 3: Calculate scores
      await job.progress(50);
      const scores = await this.calculateScores(actuals);
      
      // Step 4: Aggregate
      await job.progress(70);
      await this.aggregateResults(assessmentPeriodId, scores);
      
      // Step 5: Rankings
      await job.progress(90);
      await this.generateRankings(assessmentPeriodId);
      
      // Step 6: Notify
      await job.progress(100);
      await this.notifyStakeholders(assessmentPeriodId);
      
      return { success: true, assessmentPeriodId };
    } catch (error) {
      await this.handleFailure(assessmentPeriodId, error);
      throw error;
    }
  }
}
```

### Saga Pattern (Compensating Transactions)

```typescript
// For operations that need rollback capability
class AssessmentSaga {
  private compensations: (() => Promise<void>)[] = [];

  async execute(assessmentPeriodId: string) {
    try {
      // Step 1: Lock assessment period
      await this.lockPeriod(assessmentPeriodId);
      this.compensations.push(() => this.unlockPeriod(assessmentPeriodId));

      // Step 2: Archive old scores
      const archived = await this.archiveScores(assessmentPeriodId);
      this.compensations.push(() => this.restoreScores(archived));

      // Step 3: Calculate new scores
      await this.calculateNewScores(assessmentPeriodId);

      // Step 4: Publish results
      await this.publishResults(assessmentPeriodId);

      // Success - clear compensations
      this.compensations = [];
    } catch (error) {
      // Rollback in reverse order
      await this.compensate();
      throw error;
    }
  }

  private async compensate() {
    for (const compensation of this.compensations.reverse()) {
      try {
        await compensation();
      } catch (e) {
        console.error('Compensation failed:', e);
      }
    }
  }
}
```

### State Machine Pattern

```typescript
// Assessment lifecycle state machine
const assessmentStateMachine = {
  states: {
    DRAFT: {
      on: {
        SUBMIT: 'PENDING_APPROVAL',
        DELETE: 'DELETED',
      },
    },
    PENDING_APPROVAL: {
      on: {
        APPROVE: 'ACTIVE',
        REJECT: 'DRAFT',
      },
    },
    ACTIVE: {
      on: {
        START_CALCULATION: 'CALCULATING',
        CLOSE: 'CLOSED',
      },
    },
    CALCULATING: {
      on: {
        COMPLETE: 'COMPLETED',
        FAIL: 'ACTIVE',
      },
    },
    COMPLETED: {
      on: {
        RECALCULATE: 'CALCULATING',
        ARCHIVE: 'ARCHIVED',
      },
    },
    CLOSED: { type: 'final' },
    ARCHIVED: { type: 'final' },
    DELETED: { type: 'final' },
  },
};

// Transition handler
async function transition(
  assessment: Assessment,
  event: string
): Promise<Assessment> {
  const currentState = assessmentStateMachine.states[assessment.status];
  const nextState = currentState.on?.[event];
  
  if (!nextState) {
    throw new Error(`Invalid transition: ${assessment.status} -> ${event}`);
  }
  
  return prisma.assessment.update({
    where: { id: assessment.id },
    data: { status: nextState },
  });
}
```

### Retry & Error Handling

```typescript
// Bull queue with retry configuration
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'calculation',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
})
export class QueueModule {}

// Manual retry with circuit breaker
class CircuitBreaker {
  private failures = 0;
  private lastFailure: Date | null = null;
  private readonly threshold = 5;
  private readonly resetTimeout = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures < this.threshold) return false;
    if (Date.now() - this.lastFailure!.getTime() > this.resetTimeout) {
      this.reset();
      return false;
    }
    return true;
  }
}
```

### Best Practices

1. **Idempotency** - Operations should be safe to retry
2. **Progress tracking** - Report status at each step
3. **Timeout handling** - Set reasonable limits
4. **Partial failure** - Handle and recover gracefully
5. **Logging** - Log all state transitions
6. **Monitoring** - Track queue depth, processing time
7. **Dead letter queue** - Capture failed jobs for analysis

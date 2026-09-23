import 'dotenv/config';
import { NativeConnection, Worker } from '@temporalio/worker';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Import all activity implementations
import * as supplierActivities from './activities/supplier.activities';
import * as redisActivities from './activities/redis.activities';

/**
 * Temporal Worker process.
 *
 * This is a standalone entry point separate from the API server.
 * Run with: npm run worker
 *
 * The worker:
 * 1. Connects to the Temporal server.
 * 2. Registers the hotel offer workflow.
 * 3. Registers all activities (supplier + redis).
 * 4. Listens on the configured task queue.
 */
async function run(): Promise<void> {
  logger.info(
    {
      address: env.TEMPORAL_ADDRESS,
      taskQueue: env.TEMPORAL_TASK_QUEUE,
      namespace: env.TEMPORAL_NAMESPACE,
    },
    'Starting Temporal worker'
  );

  const connection = await NativeConnection.connect({
    address: env.TEMPORAL_ADDRESS,
  });

  const worker = await Worker.create({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    // Workflows are loaded from the compiled or source files
    workflowsPath: require.resolve('./workflows/hotel.workflow'),
    activities: {
      ...supplierActivities,
      ...redisActivities,
    },
  });

  logger.info(
    { taskQueue: env.TEMPORAL_TASK_QUEUE },
    'Temporal worker started — listening for tasks'
  );

  // Run until interrupted
  await worker.run();
}

run().catch((err: unknown) => {
  logger.error({ err }, 'Temporal worker failed to start');
  process.exit(1);
});

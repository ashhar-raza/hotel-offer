import { Connection, WorkflowClient } from '@temporalio/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let workflowClient: WorkflowClient | null = null;
let connection: Connection | null = null;

/**
 * Returns a singleton Temporal WorkflowClient.
 * Lazily creates the connection on first call.
 */
export async function getTemporalClient(): Promise<WorkflowClient> {
  if (workflowClient) {
    return workflowClient;
  }

  logger.info({ address: env.TEMPORAL_ADDRESS }, 'Connecting to Temporal server');

  connection = await Connection.connect({
    address: env.TEMPORAL_ADDRESS,
  });

  workflowClient = new WorkflowClient({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
  });

  logger.info('Temporal client connected');
  return workflowClient;
}

/**
 * Disconnects the Temporal connection.
 * Used for graceful shutdown.
 */
export async function disconnectTemporal(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
    workflowClient = null;
    logger.info('Temporal client disconnected');
  }
}

/**
 * Checks if Temporal server is reachable.
 * Returns true if healthy.
 */
export async function pingTemporal(): Promise<boolean> {
  try {
    const client = await getTemporalClient();
    // Attempt to list workflows — if Temporal is up, this resolves
    await client.workflowService.getSystemInfo({});
    return true;
  } catch {
    return false;
  }
}

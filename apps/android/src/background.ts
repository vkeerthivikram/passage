import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { readSession } from './session';
import { synchronize } from './sync';

const taskName = 'passage-sync';
TaskManager.defineTask(taskName, async () => {
  try {
    const session = await readSession();
    if (session) await synchronize(session);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch { return BackgroundTask.BackgroundTaskResult.Failed; }
});
export async function registerBackgroundSync() {
  if (await BackgroundTask.getStatusAsync() === BackgroundTask.BackgroundTaskStatus.Available) {
    await BackgroundTask.registerTaskAsync(taskName, { minimumInterval: 15 });
  }
}

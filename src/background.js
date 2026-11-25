import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { checkRates } from './check';

const TASK = 'check-exchange-rates';

// لازم تتعرف برا أي component
TaskManager.defineTask(TASK, async () => {
  try {
    await checkRates();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.warn('Background check failed', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function startBackgroundCheck() {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
  if (!(await TaskManager.isTaskRegisteredAsync(TASK))) {
    // بالدقايق، والنظام هو اللي بيحدد الميعاد الفعلي
    await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 60 });
  }
  return true;
}

# Task Pipeline

The pipeline feature allows you to orchestrate multiple agents in sequence or parallel using the Meta Agent Manager.

## Creating Tasks

1. Navigate to **Pipeline** in the nav bar
2. Click **+ Add Task**
3. Fill in task name, prompt, and optional settings
4. Set the **Step Order** (tasks with the same step number run in parallel)

## Task States

- **Pending**: Waiting to be picked up by the manager
- **Running**: Agent is actively working on the task
- **Completed**: Task finished successfully
- **Failed**: Task encountered an error

## Meta Agent Manager

The manager runs in a polling loop:
1. Fetches the task list
2. Identifies the next pending task(s) at the lowest step order
3. Creates agents to execute those tasks
4. Monitors agent completion
5. Moves to the next step

### Configuration

Click **Configure** to set:
- **Default Working Directory**: Used when tasks don't specify one
- **Default Provider**: Claude or Codex
- **Poll Interval**: How often the manager checks for updates (ms)
- **Default CLAUDE.md**: Instructions applied to all managed agents

### Sequential vs Parallel Tasks

- Tasks with different step orders run **sequentially** (step 0 completes before step 1 starts)
- Tasks with the same step order run **in parallel**

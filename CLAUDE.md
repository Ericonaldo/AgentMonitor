# What we are building
1. A web-based monitor that allows users to create, manage, close all agents, first version should support cc
2. When creating agent, the user can select which dir to run (on the server machine that run this monitor), should have checkboxes to serve as creating parameters. For example for cc, there should be (resume, dangerously-skip-permission, chrome, etc) as choices, then the web run a claude agent with claude --flags in background (claude -p [prompt]). if choose resume, should list all prev conversations as listed in the bash with claude--resume.
3. When creating agent, the user can provide claude.md, or modified from existing template
4. When creating agent, the user can provide an admin email so that the agent can notify the human when required.
5. The user can add claude.md template to the monitor
6. There should be a card-based monitor where the user can watch all agents and what they are currently doing (latest info), the user can change claude.md for each card (representing a agent)
7. The user can click into each card and will enter a web-based agent gui page, which is similar to ChatGPT, but the user can use similar commands here as the original bash-based user, for claude such as twice esc, and support `/` hints, and so on, basically like a bash in web8. Each agent should work with git worktree (each worktree should have a seperate claude.md), so that if different agents work in the same directory, they should use different branches to avoid conflictThe monitor allows basic usage as the user manually manipulates each agent and makes new agents. 
9. When some agent needs human interaction, send a email to the admin user to notify him, if no email is filled, just wait.

# Your job
Keep working until confirmed all features works, passed with test

3. **实现功能**：Claude Code 在隔离环境中工作  

4. **提交代码**：`git commit` 在任务分支  

5. **Merge + 测试**：
   - `git fetch origin && git merge origin/main`
   - `npm test`  

6. **自动commit and合并到 main**：
after each feature done and tested pass, should commit then merge to main
   - `git fetch origin main`
   - `git rebase origin/main`，如果失败，按照下面的“冲突处理”来 resolve rebase conflict
   - 如果成功，则：
     - `git merge main task-xxx`
     - `git push origin main`
     - 继续执行下一步
   - 如果这一步有任何失败，则退回到步骤 5  

7. **标记完成**：更新 `dev-tasks.json`（必须在清理之前，防止进程被杀时任务状态丢失）  

8. **清理**：
   - `git worktree remove` + 删除本地分支
   - 删除远程 task 分支
   - 重启 dev server  

9. **经验沉淀**：在 `PROGRESS.md` 记录经验教训（可选，如果被杀也不影响任务状态）

## 多实例并行开发（Git Worktree）

### 架构说明

支持多个 Claude Code 实例并行工作，每个实例在独立的 `git worktree` 中执行任务。

---

### 并行开发工作流

```
┌──────────────────────────────────────────────┐
│                并行开发工作流                │
└──────────────────────────────────────────────┘

   ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
   │      Worker 1      │   │      Worker 2      │   │      Worker 3      │
   │     port:5200      │   │     port:5201      │   │     port:5202      │
   │      worktree      │   │      worktree      │   │      worktree      │
   └────────────────────┘   └────────────────────┘   └────────────────────┘
            │                         │                         │
        ┌────────┐               ┌────────┐               ┌────────┐
        │ data/  │               │ data/  │               │ data/  │
        └────────┘               └────────┘               └────────┘

                           （隔离的实验数据）
```

### ⚠️ 禁止 symlink

- `PROGRESS.md`（直接用 `git -C` 编辑主仓库文件）

### 冲突处理

#### Rebase 失败时的处理流程

1. 如果是 `"unstaged changes"` 错误，先 `commit` 或 `stash` 当前改动  
2. 如果有 merge conflicts：
   - 查看冲突文件：`git status`
   - 读取冲突文件内容，理解双方改动意图
   - 手动解决冲突（保留正确的代码）
   - `git add <resolved-files>`
   - `git rebase --continue`
3. 重复直到 rebase 完成  

---

#### 测试失败时的处理流程

1. 运行测试：`npm test`
2. 如果失败，分析错误信息
3. 修复代码中的 bug
4. 重新运行测试，直到全部通过
5. 提交修复：`git commit -m "fix: ..."`

---

**不要放弃**：遇到 rebase 或测试失败时，必须解决问题后才能继续，不能直接标记任务失败。

---

## 经验教训沉淀

每次遇到问题或完成重要改动后，要在 [`PROGRESS.md`](./PROGRESS.md) 中记录：

- 遇到了什么问题
- 如何解决的
- 以后如何避免
- **必须附上 git commit ID**

---

**同样的问题不要犯两次！**

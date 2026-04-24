const scenarios = {
  "project-rule": {
    title: "Repository memory",
    body: "The runtime preserves durable project rules, including the boundary that keeps reference material separate from first-party implementation work.",
    command: "Recall: tmp/ is reference-only, not implementation space.",
    tags: ["project facts", "guardrails", "reinforcement"]
  },
  "interrupted-task": {
    title: "Session continuity",
    body: "Task state and handoff summaries survive across agent sessions, so the next run can resume without a long recap from the user.",
    command: "Recall: current task state, next action, and handoff summary.",
    tags: ["task state", "handoff", "continuity"]
  },
  "architecture-rationale": {
    title: "Architecture rationale",
    body: "Decision memory preserves the reasoning behind the runtime-first boundary while OpenCode stays a thin integration surface.",
    command: "Recall: storage belongs in the runtime; OpenCode remains an adapter.",
    tags: ["decision memory", "architecture", "rationale"]
  },
  "decision-update": {
    title: "Stale-memory cleanup",
    body: "When a decision changes, newer memory can supersede the older version without deleting the audit trail.",
    command: "Recall: keep storage local-first in the runtime while the adapter stays thin.",
    tags: ["supersession", "audit trail", "governance"]
  }
};

const output = document.querySelector("#scenario-output");
const buttons = document.querySelectorAll(".demo-tab");

function renderScenario(id) {
  const scenario = scenarios[id] ?? scenarios["project-rule"];
  output.replaceChildren();

  const textBlock = document.createElement("div");
  const kicker = document.createElement("span");
  const title = document.createElement("h3");
  const body = document.createElement("p");
  kicker.className = "kicker";
  kicker.textContent = "Scenario";
  title.textContent = scenario.title;
  body.textContent = scenario.body;
  textBlock.append(kicker, title, body);

  const commandPreview = document.createElement("pre");
  const commandCode = document.createElement("code");
  commandCode.textContent = scenario.command;
  commandPreview.append(commandCode);

  const tagRow = document.createElement("div");
  tagRow.className = "pill-row";
  scenario.tags.forEach((tag) => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = tag;
    tagRow.append(pill);
  });

  output.append(textBlock, commandPreview, tagRow);
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    buttons.forEach((item) => item.setAttribute("aria-selected", "false"));
    button.setAttribute("aria-selected", "true");
    renderScenario(button.dataset.scenario);
  });
});

renderScenario("project-rule");

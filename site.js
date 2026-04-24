const scenarios = {
  "project-rule": {
    title: "Project guardrail recall",
    body: "The agent remembers that tmp/ contains reference repositories and should not be edited as first-party implementation.",
    command: "npm run validate:opencode-project-rule",
    tags: ["project-fact", "reinforced duplicate", "guardrail"]
  },
  "interrupted-task": {
    title: "Task continuity after interruption",
    body: "The runtime recalls the current task state and generated handoff so work can resume without restating the whole context.",
    command: "npm run validate:opencode-interrupted-task",
    tags: ["task-memory", "session-summary", "handoff"]
  },
  "architecture-rationale": {
    title: "Decision-memory rationale",
    body: "The agent recalls why the system is runtime-first while OpenCode remains a thin adapter instead of becoming the system core.",
    command: "npm run validate:opencode-architecture-rationale",
    tags: ["decision-memory", "FTS5", "architecture"]
  },
  "decision-update": {
    title: "Superseded decision update",
    body: "A stale adapter-owned storage decision is superseded by the current local-first runtime decision, while audit logs keep the old memory visible.",
    command: "npm run validate:opencode-decision-update",
    tags: ["supersession", "audit log", "exact output"]
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

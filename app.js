const campaigns = ["A", "B", "C"];
const channels = ["Meta", "Programmatic"];
const platforms = ["Meta", "StackAdapt", "PulsePoint"];
const storageKey = "adBudgetDashboardState";

const sampleSnapshot = {
  id: "may-20-2026",
  name: "May 20, 2026",
  startDate: "2026-05-01",
  recordDate: "2026-05-20",
  endDate: "2026-05-31",
  agencyFee: 15,
  audienceCpm: 3,
  budgets: {
    A: { Meta: 25990.51, Programmatic: 17325.79 },
    B: { Meta: 7500, Programmatic: 8500 },
    C: { Meta: 33802.35, Programmatic: 3851 },
  },
  actuals: {
    A: {
      Meta: { netSpend: 15491.43, impressions: 0 },
      StackAdapt: { netSpend: 5796, impressions: 0 },
      PulsePoint: { netSpend: 4122, impressions: 0 },
    },
    B: {
      Meta: { netSpend: 4023.26, impressions: 0 },
      StackAdapt: { netSpend: 1262.87, impressions: 0 },
      PulsePoint: { netSpend: 3132, impressions: 0 },
    },
    C: {
      Meta: { netSpend: 15671.19, impressions: 399876 },
      StackAdapt: { netSpend: 1836.86, impressions: 174838 },
      PulsePoint: { netSpend: 0, impressions: 0 },
    },
  },
};

let state = loadState();

const els = {
  snapshotSelect: document.querySelector("#snapshotSelect"),
  startDate: document.querySelector("#startDate"),
  recordDate: document.querySelector("#recordDate"),
  endDate: document.querySelector("#endDate"),
  agencyFee: document.querySelector("#agencyFee"),
  audienceCpm: document.querySelector("#audienceCpm"),
  budgetBody: document.querySelector("#budgetTable tbody"),
  actualsBody: document.querySelector("#actualsTable tbody"),
  campaignCards: document.querySelector("#campaignCards"),
  outputBody: document.querySelector("#outputTable tbody"),
  totalBudget: document.querySelector("#totalBudget"),
  totalSpend: document.querySelector("#totalSpend"),
  totalRemaining: document.querySelector("#totalRemaining"),
  totalDelta: document.querySelector("#totalDelta"),
  recordLabel: document.querySelector("#recordLabel"),
  timingPercent: document.querySelector("#timingPercent"),
  barChart: document.querySelector("#barChart"),
  remainingChart: document.querySelector("#remainingChart"),
  saveState: document.querySelector("#saveState"),
  resetButton: document.querySelector("#resetButton"),
  shareButton: document.querySelector("#shareButton"),
  csvButton: document.querySelector("#csvButton"),
  newSnapshotButton: document.querySelector("#newSnapshotButton"),
  deleteSnapshotButton: document.querySelector("#deleteSnapshotButton"),
};

init();

function init() {
  bindGlobalInputs();
  buildInputs();
  render();
}

function loadState() {
  const fromHash = decodeHash();
  if (fromHash) return fromHash;

  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch {
      return sampleState();
    }
  }
  return sampleState();
}

function sampleState() {
  return {
    activeSnapshotId: sampleSnapshot.id,
    snapshots: [clone(sampleSnapshot)],
  };
}

function normalizeState(input) {
  if (Array.isArray(input.snapshots)) {
    const snapshots = input.snapshots.map(normalizeSnapshot);
    const activeSnapshotId = snapshots.some((snapshot) => snapshot.id === input.activeSnapshotId)
      ? input.activeSnapshotId
      : snapshots[0].id;
    return { activeSnapshotId, snapshots };
  }

  const migrated = normalizeSnapshot({ ...input, id: sampleSnapshot.id });
  return {
    activeSnapshotId: migrated.id,
    snapshots: [migrated],
  };
}

function normalizeSnapshot(input) {
  const base = clone(sampleSnapshot);
  const snapshot = {
    ...base,
    ...input,
    id: input.id || makeId(input.recordDate || base.recordDate),
    name: input.name || formatDate(input.recordDate || base.recordDate),
    budgets: mergeNested(base.budgets, input.budgets || {}),
    actuals: mergeNested(base.actuals, input.actuals || {}),
  };
  return snapshot;
}

function mergeNested(base, patch) {
  const merged = clone(base);
  Object.entries(patch).forEach(([key, value]) => {
    merged[key] = typeof value === "object" && value !== null && !Array.isArray(value) ? { ...(merged[key] || {}), ...value } : value;
  });
  return merged;
}

function decodeHash() {
  if (!location.hash.startsWith("#data=")) return null;
  try {
    const raw = atob(decodeURIComponent(location.hash.slice(6)));
    return normalizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function activeSnapshot() {
  return state.snapshots.find((snapshot) => snapshot.id === state.activeSnapshotId) || state.snapshots[0];
}

function setActiveSnapshot(patch) {
  const active = activeSnapshot();
  Object.assign(active, patch);
  active.name = formatDate(active.recordDate);
}

function buildInputs() {
  const snapshot = activeSnapshot();
  renderSnapshotSelect();

  els.startDate.value = snapshot.startDate;
  els.recordDate.value = snapshot.recordDate;
  els.endDate.value = snapshot.endDate;
  els.agencyFee.value = snapshot.agencyFee;
  els.audienceCpm.value = snapshot.audienceCpm;

  els.budgetBody.innerHTML = campaigns
    .map(
      (campaign) => `
        <tr>
          <td>${campaign}</td>
          ${channels
            .map(
              (channel) => `
                <td>
                  <input
                    data-kind="budget"
                    data-campaign="${campaign}"
                    data-channel="${channel}"
                    type="number"
                    min="0"
                    step="0.01"
                    value="${snapshot.budgets[campaign][channel]}"
                  />
                </td>
              `
            )
            .join("")}
        </tr>
      `
    )
    .join("");

  els.actualsBody.innerHTML = campaigns
    .flatMap((campaign) =>
      platforms.map(
        (platform) => `
          <tr>
            <td>${campaign}</td>
            <td>${platform}</td>
            <td>
              <input
                data-kind="actual"
                data-field="netSpend"
                data-campaign="${campaign}"
                data-platform="${platform}"
                type="number"
                min="0"
                step="0.01"
                value="${snapshot.actuals[campaign][platform].netSpend}"
              />
            </td>
            <td>
              <input
                data-kind="actual"
                data-field="impressions"
                data-campaign="${campaign}"
                data-platform="${platform}"
                type="number"
                min="0"
                step="1"
                value="${snapshot.actuals[campaign][platform].impressions}"
              />
            </td>
          </tr>
        `
      )
    )
    .join("");

  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", handleInput);
  });
}

function renderSnapshotSelect() {
  els.snapshotSelect.innerHTML = state.snapshots
    .slice()
    .sort((a, b) => b.recordDate.localeCompare(a.recordDate))
    .map((snapshot) => `<option value="${snapshot.id}">${formatDate(snapshot.recordDate)}</option>`)
    .join("");
  els.snapshotSelect.value = state.activeSnapshotId;
}

function bindGlobalInputs() {
  els.snapshotSelect.addEventListener("change", () => {
    state.activeSnapshotId = els.snapshotSelect.value;
    buildInputs();
    render();
    save("Loaded");
  });

  els.newSnapshotButton.addEventListener("click", () => {
    const source = clone(activeSnapshot());
    source.id = makeId(new Date().toISOString().slice(0, 10));
    source.recordDate = new Date().toISOString().slice(0, 10);
    source.name = formatDate(source.recordDate);
    state.snapshots.push(source);
    state.activeSnapshotId = source.id;
    buildInputs();
    render();
    save("New record");
  });

  els.deleteSnapshotButton.addEventListener("click", () => {
    if (state.snapshots.length <= 1) {
      flash("Keep one record");
      return;
    }
    state.snapshots = state.snapshots.filter((snapshot) => snapshot.id !== state.activeSnapshotId);
    state.activeSnapshotId = state.snapshots[0].id;
    buildInputs();
    render();
    save("Deleted");
  });

  els.resetButton.addEventListener("click", () => {
    state = sampleState();
    location.hash = "";
    buildInputs();
    render();
    save("Sample loaded");
  });

  els.shareButton.addEventListener("click", async () => {
    const encoded = encodeURIComponent(btoa(JSON.stringify(state)));
    const url = `${location.href.split("#")[0]}#data=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("Share link copied");
    } catch {
      location.hash = `data=${encoded}`;
      flash("Share link ready");
    }
  });

  els.csvButton.addEventListener("click", () => {
    const snapshot = activeSnapshot();
    const rows = getRows(snapshot);
    const header = ["Record Date", "Campaign", "Channel", "MTD Gross Spend", "Spend %", "Remaining Gross", "Audience Fee", "Gap"];
    const csv = [
      header,
      ...rows.map((row) => [snapshot.recordDate, row.campaign, row.channel, row.grossSpend, row.spendPct, row.remaining, row.audienceFee, row.gap]),
    ]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ad-budget-pacing-${snapshot.recordDate}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

function handleInput(event) {
  const input = event.target;
  const snapshot = activeSnapshot();
  const value = input.type === "date" ? input.value : numberValue(input.value);

  if (["startDate", "recordDate", "endDate", "agencyFee", "audienceCpm"].includes(input.id)) {
    setActiveSnapshot({ [input.id]: value });
    renderSnapshotSelect();
  } else if (input.dataset.kind === "budget") {
    snapshot.budgets[input.dataset.campaign][input.dataset.channel] = value;
  } else if (input.dataset.kind === "actual") {
    snapshot.actuals[input.dataset.campaign][input.dataset.platform][input.dataset.field] = value;
  }

  render();
  save("Saved");
}

function getRows(snapshot = activeSnapshot()) {
  const grossFactor = 1 - numberValue(snapshot.agencyFee) / 100;
  const timingPct = getTimingPct(snapshot);

  return campaigns.flatMap((campaign) =>
    channels.map((channel) => {
      const platformList = channel === "Meta" ? ["Meta"] : ["StackAdapt", "PulsePoint"];
      const netSpend = platformList.reduce((sum, platform) => sum + numberValue(snapshot.actuals[campaign][platform].netSpend), 0);
      const impressions = platformList.reduce((sum, platform) => sum + numberValue(snapshot.actuals[campaign][platform].impressions), 0);
      const audienceFee = campaign === "C" ? (impressions / 1000) * numberValue(snapshot.audienceCpm) : 0;
      const grossSpend = grossFactor > 0 ? (netSpend + audienceFee) / grossFactor : 0;
      const plannedGross = numberValue(snapshot.budgets[campaign][channel]);
      const spendPct = plannedGross > 0 ? grossSpend / plannedGross : 0;
      const remaining = plannedGross - grossSpend;

      return {
        campaign,
        channel,
        platforms: platformList,
        netSpend,
        impressions,
        audienceFee,
        grossSpend,
        plannedGross,
        spendPct,
        remaining,
        timingPct,
        gap: spendPct - timingPct,
      };
    })
  );
}

function render() {
  const snapshot = activeSnapshot();
  const rows = getRows(snapshot);
  const totals = rows.reduce(
    (acc, row) => {
      acc.budget += row.plannedGross;
      acc.spend += row.grossSpend;
      acc.remaining += row.remaining;
      return acc;
    },
    { budget: 0, spend: 0, remaining: 0 }
  );
  const timingPct = getTimingPct(snapshot);
  const totalSpendPct = totals.budget > 0 ? totals.spend / totals.budget : 0;

  els.totalBudget.textContent = currency(totals.budget);
  els.totalSpend.textContent = currency(totals.spend);
  els.totalRemaining.textContent = currency(totals.remaining);
  els.totalDelta.textContent = signedPct(totalSpendPct - timingPct);
  els.totalDelta.className = totalSpendPct - timingPct >= 0 ? "positive" : "negative";
  els.recordLabel.textContent = formatDate(snapshot.recordDate);
  els.timingPercent.textContent = pct(timingPct);

  renderCards(rows);
  renderBars(rows, timingPct);
  renderRemaining(rows);
  renderTable(rows);
}

function renderCards(rows) {
  els.campaignCards.innerHTML = campaigns
    .map((campaign) => {
      const campaignRows = rows.filter((row) => row.campaign === campaign);
      return `
        <article class="campaign-card">
          <h3>${campaign}</h3>
          ${campaignRows.map(renderChannelLine).join("")}
        </article>
      `;
    })
    .join("");
}

function renderChannelLine(row) {
  const status = getStatus(row.gap);
  const fillClass = row.channel === "Meta" ? "meta-fill" : "programmatic-fill";
  return `
    <div class="channel-line">
      <header>
        <strong>${row.channel}</strong>
        <span class="status ${status.className}">${status.label}</span>
      </header>
      <div class="progress" aria-label="${row.campaign} ${row.channel} spend percent">
        <span class="${fillClass}" style="width:${Math.min(row.spendPct * 100, 100)}%"></span>
      </div>
      <div class="mini-stats">
        <div><span>Gross Spend</span><strong>${currency(row.grossSpend)}</strong></div>
        <div><span>Remaining</span><strong>${currency(row.remaining)}</strong></div>
        <div><span>Spend %</span><strong>${pct(row.spendPct)}</strong></div>
        <div><span>Gap</span><strong class="${row.gap >= 0 ? "positive" : "negative"}">${signedPct(row.gap)}</strong></div>
      </div>
    </div>
  `;
}

function renderBars(rows, timingPct) {
  els.barChart.style.setProperty("--timing-left", `${Math.min(timingPct * 100, 100)}%`);
  els.barChart.innerHTML = rows
    .map((row) => {
      const fillClass = row.channel === "Meta" ? "meta-fill" : "programmatic-fill";
      return `
        <div class="bar-row">
          <div class="bar-label">${row.campaign} ${row.channel}</div>
          <div class="bar-track">
            <span class="bar-fill ${fillClass}" style="width:${Math.min(row.spendPct * 100, 100)}%"></span>
          </div>
          <div class="bar-value">${pct(row.spendPct)}</div>
        </div>
      `;
    })
    .join("");
}

function renderRemaining(rows) {
  els.remainingChart.innerHTML = rows
    .slice()
    .sort((a, b) => b.remaining - a.remaining)
    .map(
      (row) => `
        <div class="remaining-row">
          <span>${row.campaign} ${row.channel}</span>
          <strong class="${row.remaining >= 0 ? "" : "negative"}">${currency(row.remaining)}</strong>
        </div>
      `
    )
    .join("");
}

function renderTable(rows) {
  els.outputBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${row.campaign}</td>
          <td>${row.channel}</td>
          <td>${currency(row.grossSpend)}</td>
          <td>${pct(row.spendPct)}</td>
          <td class="${row.remaining >= 0 ? "" : "negative"}">${currency(row.remaining)}</td>
          <td>${currency(row.audienceFee)}</td>
          <td class="${row.gap >= 0 ? "positive" : "negative"}">${signedPct(row.gap)}</td>
        </tr>
      `
    )
    .join("");
}

function getTimingPct(snapshot = activeSnapshot()) {
  const start = parseDate(snapshot.startDate);
  const record = parseDate(snapshot.recordDate);
  const end = parseDate(snapshot.endDate);
  if (!start || !record || !end || end < start) return 0;
  const elapsed = clamp(daysBetween(start, record) + 1, 0, daysBetween(start, end) + 1);
  const total = daysBetween(start, end) + 1;
  return total > 0 ? elapsed / total : 0;
}

function save(text = "Saved") {
  localStorage.setItem(storageKey, JSON.stringify(state));
  flash(text);
}

function flash(text) {
  els.saveState.textContent = text;
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => {
    els.saveState.textContent = "Saved";
  }, 1200);
}

function getStatus(gap) {
  if (gap > 0.08) return { label: "Ahead", className: "hot" };
  if (gap < -0.08) return { label: "Behind", className: "slow" };
  return { label: "On track", className: "on-track" };
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function pct(value) {
  return `${(numberValue(value) * 100).toFixed(1)}%`;
}

function signedPct(value) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${pct(value)}`;
}

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(a, b) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((dateOnly(b) - dateOnly(a)) / dayMs);
}

function dateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function makeId(seed) {
  return `${seed}-${Math.random().toString(36).slice(2, 8)}`;
}

function csvEscape(value) {
  const text = String(typeof value === "number" ? value.toFixed(4) : value);
  return `"${text.replaceAll('"', '""')}"`;
}

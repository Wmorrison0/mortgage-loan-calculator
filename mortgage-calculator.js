"use strict";

const $ = (id) => document.getElementById(id);

const els = {
  price: $("price"),
  downAmt: $("downAmt"),
  downPct: $("downPct"),
  loanType: $("loanType"),
  typeCards: document.querySelectorAll(".typeCard"),

  fixedRateBox: $("fixedRateBox"),
  rate: $("rate"),

  armBox: $("armBox"),
  armIntroRate: $("armIntroRate"),
  armIntroYears: $("armIntroYears"),
  armAdjMonths: $("armAdjMonths"),
  armIndex: $("armIndex"),
  armMargin: $("armMargin"),
  armCapPerAdj: $("armCapPerAdj"),
  armLifeCap: $("armLifeCap"),

  termYears: $("termYears"),
  taxAnnual: $("taxAnnual"),
  insAnnual: $("insAnnual"),
  hoaMonthly: $("hoaMonthly"),
  pmiRate: $("pmiRate"),
  extraMonthly: $("extraMonthly"),

  calcBtn: $("calcBtn"),
  sampleBtn: $("sampleBtn"),
  resetBtn: $("resetBtn"),
  csvBtn: $("csvBtn"),
  msg: $("msg"),
  showAll: $("showAll"),
  emptyState: $("emptyState"),

  loanAmtOut: $("loanAmtOut"),
  piOut: $("piOut"),
  totalOut: $("totalOut"),
  totIntOut: $("totIntOut"),
  payoffOut: $("payoffOut"),
  savedOut: $("savedOut"),

  bPI: $("bPI"),
  bTax: $("bTax"),
  bIns: $("bIns"),
  bHOA: $("bHOA"),
  bPMI: $("bPMI"),
  bTotal: $("bTotal"),

  tbody: $("schedTable")?.querySelector("tbody"),
  chart: $("balanceChart"),
};

let lastSchedule = null;
let lastInputs = null;

function num(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
}

function fmtMoney(x) {
  if (!isFinite(x)) return "—";
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function fmtMoneyTable(x) {
  if (!isFinite(x)) return "—";
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function monthsToLabel(m) {
  if (!isFinite(m) || m <= 0) return "—";

  const years = Math.floor(m / 12);
  const rem = m % 12;

  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr`;

  return `${years} yr ${rem} mo`;
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.round(rand(min, max));
}

function choose(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function roundToNearest(value, nearest) {
  return Math.round(value / nearest) * nearest;
}

function clearInputErrors() {
  document.querySelectorAll(".inputError").forEach((el) => {
    el.classList.remove("inputError");
  });
}

function markError(el) {
  if (!el) return;
  el.classList.add("inputError");
}

function scrollFocus(el) {
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => el.focus(), 150);
}

function setLoanType(type, options = {}) {
  const { silent = false } = options;
  const previousType = els.loanType.value;

  els.loanType.value = type;

  els.typeCards.forEach((btn) => {
    const active = btn.dataset.loanType === type;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });

  const isARM = type === "arm";

  if (els.armBox) els.armBox.hidden = !isARM;
  if (els.fixedRateBox) els.fixedRateBox.hidden = isARM;

  clearInputErrors();

  if (!silent && previousType !== type) {
    lastSchedule = null;
    lastInputs = null;
    els.msg.textContent = "";
    clearOutputs("Loan type changed. Enter the required fields and calculate again.");
    renderTable(null, false);
  }
}

function readInputs() {
  return {
    price: num(els.price.value),
    downAmt: num(els.downAmt.value),
    downPct: num(els.downPct.value),

    loanType: els.loanType.value,

    apr: num(els.rate.value),
    years: num(els.termYears.value),

    armIntroRate: num(els.armIntroRate.value),
    armIntroYears: num(els.armIntroYears.value),
    armAdjMonths: num(els.armAdjMonths.value),
    armIndex: num(els.armIndex.value),
    armMargin: num(els.armMargin.value),
    armCapPerAdj: num(els.armCapPerAdj.value),
    armLifeCap: num(els.armLifeCap.value),

    taxAnnual: num(els.taxAnnual.value),
    insAnnual: num(els.insAnnual.value),
    hoaMonthly: num(els.hoaMonthly.value),
    pmiRate: num(els.pmiRate.value),
    extraMonthly: num(els.extraMonthly.value),
  };
}

function validateInputs(i) {
  clearInputErrors();

  const missing = [];
  const bad = [];

  if (els.price.value.trim() === "") {
    missing.push(els.price);
  } else if (!(i.price > 0)) {
    bad.push({ el: els.price, msg: "Home price must be greater than 0." });
  }

  const downAmtHas = els.downAmt.value.trim() !== "";
  const downPctHas = els.downPct.value.trim() !== "";

  if (!downAmtHas && !downPctHas) {
    missing.push(els.downAmt, els.downPct);
  }

  if (els.termYears.value.trim() === "") {
    missing.push(els.termYears);
  } else if (!(i.years > 0)) {
    bad.push({ el: els.termYears, msg: "Loan term must be greater than 0." });
  }

  if (i.loanType === "fixed") {
    if (els.rate.value.trim() === "") {
      missing.push(els.rate);
    } else if (!(i.apr >= 0)) {
      bad.push({ el: els.rate, msg: "Fixed APR must be 0 or higher." });
    }
  }

  if (i.loanType === "arm") {
    const armRequiredFields = [
      els.armIntroRate,
      els.armIntroYears,
      els.armAdjMonths,
      els.armIndex,
      els.armMargin,
      els.armCapPerAdj,
      els.armLifeCap,
    ];

    for (const el of armRequiredFields) {
      if (el.value.trim() === "") missing.push(el);
    }

    if (els.armIntroRate.value.trim() !== "" && !(i.armIntroRate >= 0)) {
      bad.push({ el: els.armIntroRate, msg: "ARM intro rate must be 0 or higher." });
    }

    if (els.armIntroYears.value.trim() !== "" && !(i.armIntroYears >= 0)) {
      bad.push({ el: els.armIntroYears, msg: "Intro period must be 0 or higher." });
    }

    if (els.armAdjMonths.value.trim() !== "" && !(i.armAdjMonths >= 1)) {
      bad.push({ el: els.armAdjMonths, msg: "Adjustment frequency must be at least 1 month." });
    }

    if (els.armIndex.value.trim() !== "" && !(i.armIndex >= 0)) {
      bad.push({ el: els.armIndex, msg: "Index rate must be 0 or higher." });
    }

    if (els.armMargin.value.trim() !== "" && !(i.armMargin >= 0)) {
      bad.push({ el: els.armMargin, msg: "Margin must be 0 or higher." });
    }

    if (els.armCapPerAdj.value.trim() !== "" && !(i.armCapPerAdj >= 0)) {
      bad.push({ el: els.armCapPerAdj, msg: "Cap per adjustment must be 0 or higher." });
    }

    if (els.armLifeCap.value.trim() !== "" && !(i.armLifeCap >= 0)) {
      bad.push({ el: els.armLifeCap, msg: "Lifetime cap must be 0 or higher." });
    }
  }

  if (missing.length > 0) {
    for (const el of missing) markError(el);

    return {
      ok: false,
      msg: "Please fill in the required fields highlighted in red.",
      firstBadEl: missing[0],
    };
  }

  const hasDownAmt = Number.isFinite(i.downAmt);
  const hasDownPct = Number.isFinite(i.downPct);

  if (!hasDownAmt && hasDownPct) {
    i.downAmt = (i.downPct / 100) * i.price;
  }

  if (!hasDownPct && hasDownAmt) {
    i.downPct = (i.downAmt / i.price) * 100;
  }

  if (i.downAmt < 0) {
    bad.push({ el: els.downAmt, msg: "Down payment cannot be negative." });
  }

  if (i.downAmt > i.price) {
    bad.push({ el: els.downAmt, msg: "Down payment cannot exceed home price." });
  }

  if (i.downPct < 0 || i.downPct > 100) {
    bad.push({ el: els.downPct, msg: "Down payment percent must be between 0 and 100." });
  }

  i.taxAnnual = Number.isFinite(i.taxAnnual) ? i.taxAnnual : 0;
  i.insAnnual = Number.isFinite(i.insAnnual) ? i.insAnnual : 0;
  i.hoaMonthly = Number.isFinite(i.hoaMonthly) ? i.hoaMonthly : 0;
  i.pmiRate = Number.isFinite(i.pmiRate) ? i.pmiRate : 0;
  i.extraMonthly = Number.isFinite(i.extraMonthly) ? i.extraMonthly : 0;

  if (i.taxAnnual < 0) {
    bad.push({ el: els.taxAnnual, msg: "Property tax cannot be negative." });
  }

  if (i.insAnnual < 0) {
    bad.push({ el: els.insAnnual, msg: "Insurance cannot be negative." });
  }

  if (i.hoaMonthly < 0) {
    bad.push({ el: els.hoaMonthly, msg: "HOA cannot be negative." });
  }

  if (i.pmiRate < 0) {
    bad.push({ el: els.pmiRate, msg: "PMI rate cannot be negative." });
  }

  if (i.extraMonthly < 0) {
    bad.push({ el: els.extraMonthly, msg: "Extra payment cannot be negative." });
  }

  if (bad.length > 0) {
    for (const b of bad) markError(b.el);

    return {
      ok: false,
      msg: bad[0].msg,
      firstBadEl: bad[0].el,
    };
  }

  return {
    ok: true,
    msg: "",
    firstBadEl: null,
  };
}

function syncDownFromAmt() {
  const price = num(els.price.value);
  const downAmt = num(els.downAmt.value);

  if (!(price > 0) || !Number.isFinite(downAmt)) return;

  const pct = (downAmt / price) * 100;
  els.downPct.value = clamp(pct, 0, 100).toFixed(1);
}

function syncDownFromPct() {
  const price = num(els.price.value);
  const downPct = num(els.downPct.value);

  if (!(price > 0) || !Number.isFinite(downPct)) return;

  const amt = (downPct / 100) * price;
  els.downAmt.value = Math.round(amt);
}

function monthlyPI(balance, apr, nMonths) {
  const r = (apr / 100) / 12;

  if (nMonths <= 0) return 0;
  if (r === 0) return balance / nMonths;

  const pow = Math.pow(1 + r, nMonths);
  return balance * (r * pow) / (pow - 1);
}

function buildSchedule(inputs) {
  const n = Math.round(inputs.years * 12);
  const loanAmt = inputs.price - inputs.downAmt;

  const taxM = inputs.taxAnnual / 12;
  const insM = inputs.insAnnual / 12;
  const hoaM = inputs.hoaMonthly;

  if (loanAmt <= 0 || n <= 0) {
    return {
      loanAmt,
      taxM,
      insM,
      hoaM,
      rows: [],
      totalInterest: 0,
      totalPMI: 0,
      payoffMonths: 0,
      month1: { apr: 0, pi: 0, pmi: 0 },
    };
  }

  const origLTV = loanAmt / inputs.price;
  const pmiApplies = origLTV > 0.80 && inputs.pmiRate > 0;
  const pmiStopBalance = 0.80 * inputs.price;

  const isARM = inputs.loanType === "arm";
  const introAPR = isARM ? inputs.armIntroRate : inputs.apr;
  const introMonths = isARM ? Math.round((inputs.armIntroYears || 0) * 12) : 0;
  const adjEvery = isARM ? Math.max(1, Math.round(inputs.armAdjMonths || 12)) : 0;
  const capPerAdj = isARM ? inputs.armCapPerAdj || 0 : 0;
  const lifeCapAboveIntro = isARM ? inputs.armLifeCap || 0 : 0;
  const maxAPR = isARM ? introAPR + lifeCapAboveIntro : inputs.apr;

  let balance = loanAmt;
  let currentAPR = introAPR;
  let paymentPI = monthlyPI(balance, currentAPR, n);

  const extra = inputs.extraMonthly || 0;

  let totalInterest = 0;
  let totalPMI = 0;

  const rows = [];

  for (let m = 1; m <= n; m++) {
    if (isARM) {
      const afterIntro = m > introMonths;
      const isAdjMonth = afterIntro && ((m - introMonths - 1) % adjEvery === 0);

      if (isAdjMonth) {
        const targetAPR = (inputs.armIndex || 0) + (inputs.armMargin || 0);
        const maxUp = currentAPR + capPerAdj;
        const maxDown = currentAPR - capPerAdj;

        let newAPR = clamp(targetAPR, maxDown, maxUp);

        newAPR = Math.min(newAPR, maxAPR);
        newAPR = Math.max(newAPR, 0);

        currentAPR = newAPR;

        const monthsRemaining = n - (m - 1);
        paymentPI = monthlyPI(balance, currentAPR, monthsRemaining);
      }
    }

    const r = (currentAPR / 100) / 12;
    const interest = r === 0 ? 0 : balance * r;

    let principal = paymentPI - interest;

    const pmiM = pmiApplies && balance > pmiStopBalance
      ? (inputs.pmiRate / 100) * balance / 12
      : 0;

    let actualExtra = extra;
    let payPI = paymentPI;

    if (principal + actualExtra > balance) {
      const needed = balance;

      if (principal >= needed) {
        payPI = interest + needed;
        principal = needed;
        actualExtra = 0;
      } else {
        actualExtra = needed - principal;
      }
    }

    balance = balance - (principal + actualExtra);
    totalInterest += interest;
    totalPMI += pmiM;

    rows.push({
      m,
      apr: currentAPR,
      paymentPI: payPI,
      interest,
      principal,
      extra: actualExtra,
      pmi: pmiM,
      balance: Math.max(0, balance),
    });

    if (balance <= 0.000001) {
      return {
        loanAmt,
        taxM,
        insM,
        hoaM,
        rows,
        totalInterest,
        totalPMI,
        payoffMonths: m,
        month1: {
          apr: rows[0].apr,
          pi: rows[0].paymentPI,
          pmi: rows[0].pmi,
        },
      };
    }
  }

  return {
    loanAmt,
    taxM,
    insM,
    hoaM,
    rows,
    totalInterest,
    totalPMI,
    payoffMonths: n,
    month1: {
      apr: rows[0]?.apr ?? currentAPR,
      pi: rows[0]?.paymentPI ?? paymentPI,
      pmi: rows[0]?.pmi ?? 0,
    },
  };
}

function buildBaselineNoExtra(inputs) {
  return buildSchedule({
    ...inputs,
    extraMonthly: 0,
  });
}

function clearOutputs(emptyMessage = "Enter loan details or generate a realistic scenario to begin.") {
  [
    els.loanAmtOut,
    els.piOut,
    els.totalOut,
    els.totIntOut,
    els.payoffOut,
    els.savedOut,
    els.bPI,
    els.bTax,
    els.bIns,
    els.bHOA,
    els.bPMI,
    els.bTotal,
  ].forEach((el) => {
    if (el) el.textContent = "—";
  });

  if (els.emptyState) {
    els.emptyState.style.display = "block";
    els.emptyState.textContent = emptyMessage;
  }

  if (els.tbody) els.tbody.innerHTML = "";

  drawChart(null);
}

function renderTable(scheduleRows, showAll) {
  if (!els.tbody) return;

  els.tbody.innerHTML = "";

  if (!scheduleRows || scheduleRows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");

    td.colSpan = 8;
    td.textContent = "Run a calculation to generate the schedule.";
    td.style.color = "#a8b2bd";

    tr.appendChild(td);
    els.tbody.appendChild(tr);

    return;
  }

  let displayRows = scheduleRows;

  if (!showAll && scheduleRows.length > 25) {
    const first = scheduleRows.slice(0, 10);
    const last = scheduleRows.slice(-10);

    displayRows = first.concat([{ _gap: true }], last);
  }

  for (const r of displayRows) {
    if (r._gap) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");

      td.colSpan = 8;
      td.textContent = "…";
      td.style.textAlign = "center";
      td.style.color = "#a8b2bd";

      tr.appendChild(td);
      els.tbody.appendChild(tr);

      continue;
    }

    const tr = document.createElement("tr");

    const cells = [
      r.m,
      `${Number(r.apr).toFixed(2)}%`,
      fmtMoneyTable(r.paymentPI),
      fmtMoneyTable(r.interest),
      fmtMoneyTable(r.principal),
      fmtMoneyTable(r.extra),
      fmtMoneyTable(r.pmi),
      fmtMoneyTable(r.balance),
    ];

    for (const c of cells) {
      const td = document.createElement("td");
      td.textContent = String(c);
      tr.appendChild(td);
    }

    els.tbody.appendChild(tr);
  }
}

function toCSV(scheduleRows) {
  const header = [
    "month",
    "apr",
    "payment_pi",
    "interest",
    "principal",
    "extra",
    "pmi",
    "balance",
  ].join(",");

  const lines = [header];

  for (const r of scheduleRows) {
    lines.push(
      [
        r.m,
        (r.apr ?? "").toString(),
        r.paymentPI.toFixed(2),
        r.interest.toFixed(2),
        r.principal.toFixed(2),
        r.extra.toFixed(2),
        r.pmi.toFixed(2),
        r.balance.toFixed(2),
      ].join(",")
    );
  }

  return lines.join("\n");
}

function download(filename, text) {
  const blob = new Blob([text], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function renderResults(inputs, sched, baseline) {
  const pmiM1 = sched.rows[0]?.pmi ?? 0;
  const piM1 = sched.rows[0]?.paymentPI ?? 0;
  const monthlyTotal1 = piM1 + sched.taxM + sched.insM + sched.hoaM + pmiM1;

  els.loanAmtOut.textContent = fmtMoney(sched.loanAmt);
  els.piOut.textContent = fmtMoney(piM1);
  els.totalOut.textContent = fmtMoney(monthlyTotal1);
  els.totIntOut.textContent = fmtMoney(sched.totalInterest);
  els.payoffOut.textContent = monthsToLabel(sched.payoffMonths);

  const interestSaved = baseline.totalInterest - sched.totalInterest;
  els.savedOut.textContent = fmtMoney(Math.max(0, interestSaved));

  els.bPI.textContent = fmtMoney(piM1);
  els.bTax.textContent = fmtMoney(sched.taxM);
  els.bIns.textContent = fmtMoney(sched.insM);
  els.bHOA.textContent = fmtMoney(sched.hoaM);
  els.bPMI.textContent = fmtMoney(pmiM1);
  els.bTotal.textContent = fmtMoney(monthlyTotal1);

  if (els.emptyState) {
    els.emptyState.style.display = "none";
  }

  renderTable(sched.rows, els.showAll?.checked);
  drawChart(sched.rows);
}

function calculate(options = {}) {
  const { scrollOnError = true } = options;

  els.msg.textContent = "";

  const inputs = readInputs();
  const v = validateInputs(inputs);

  if (!v.ok) {
    els.msg.textContent = v.msg;

    clearOutputs();
    renderTable(null, false);

    lastSchedule = null;
    lastInputs = null;

    if (scrollOnError) scrollFocus(v.firstBadEl);

    return;
  }

  const sched = buildSchedule(inputs);
  const baseline = buildBaselineNoExtra(inputs);

  lastSchedule = sched.rows;
  lastInputs = inputs;

  renderResults(inputs, sched, baseline);
}

function reset() {
  const toClear = [
    els.price,
    els.downAmt,
    els.downPct,
    els.rate,
    els.armIntroRate,
    els.armIntroYears,
    els.armAdjMonths,
    els.armIndex,
    els.armMargin,
    els.armCapPerAdj,
    els.armLifeCap,
    els.termYears,
    els.taxAnnual,
    els.insAnnual,
    els.hoaMonthly,
    els.pmiRate,
    els.extraMonthly,
  ].filter(Boolean);

  toClear.forEach((el) => {
    el.value = "";
  });

  clearInputErrors();

  setLoanType("fixed", { silent: true });

  if (els.showAll) {
    els.showAll.checked = false;
  }

  els.msg.textContent = "";

  lastSchedule = null;
  lastInputs = null;

  clearOutputs();
  renderTable(null, false);
}

function applySampleValues() {
  const type = choose(["fixed", "fixed", "arm"]);

  setLoanType(type, { silent: true });

  const price = roundToNearest(randInt(220000, 750000), 5000);
  const downPct = choose([5, 10, 12.5, 15, 20, 25]);
  const downAmt = Math.round(price * (downPct / 100));

  els.price.value = price;
  els.downAmt.value = downAmt;
  els.downPct.value = downPct;

  els.termYears.value = choose([15, 20, 30]);

  els.taxAnnual.value = roundToNearest(price * rand(0.0075, 0.018), 50);
  els.insAnnual.value = roundToNearest(randInt(900, 2800), 50);
  els.hoaMonthly.value = choose([0, 0, 0, 75, 125, 200, 300]);
  els.pmiRate.value = downPct < 20 ? rand(0.35, 0.95).toFixed(2) : "0.00";
  els.extraMonthly.value = choose([0, 0, 50, 100, 150, 250, 500]);

  if (type === "fixed") {
    els.rate.value = rand(5.75, 7.75).toFixed(2);

    els.armIntroRate.value = "";
    els.armIntroYears.value = "";
    els.armAdjMonths.value = "";
    els.armIndex.value = "";
    els.armMargin.value = "";
    els.armCapPerAdj.value = "";
    els.armLifeCap.value = "";
  }

  if (type === "arm") {
    els.rate.value = "";

    els.armIntroRate.value = rand(4.75, 6.50).toFixed(2);
    els.armIntroYears.value = choose([3, 5, 7, 10]);
    els.armAdjMonths.value = 12;
    els.armIndex.value = rand(3.00, 4.75).toFixed(2);
    els.armMargin.value = rand(2.00, 3.00).toFixed(2);
    els.armCapPerAdj.value = choose([1, 2]);
    els.armLifeCap.value = choose([5, 6]);
  }

  clearInputErrors();

  els.msg.textContent = "";

  calculate({ scrollOnError: false });
}

function wireDownPaymentSync() {
  let lock = false;

  els.downAmt.addEventListener("input", () => {
    if (lock) return;

    lock = true;
    syncDownFromAmt();
    lock = false;
  });

  els.downPct.addEventListener("input", () => {
    if (lock) return;

    lock = true;
    syncDownFromPct();
    lock = false;
  });

  els.price.addEventListener("input", () => {
    if (lock) return;

    lock = true;

    if (els.downAmt.value !== "") {
      syncDownFromAmt();
    } else if (els.downPct.value !== "") {
      syncDownFromPct();
    }

    lock = false;
  });
}

function wireLoanTypeCards() {
  els.typeCards.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.loanType;
      setLoanType(type);
    });
  });
}

function wireClearErrorsOnInput() {
  document.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", () => {
      el.classList.remove("inputError");
    });

    el.addEventListener("change", () => {
      el.classList.remove("inputError");
    });
  });
}

function drawChart(rows) {
  const c = els.chart;

  if (!c) return;

  const ctx = c.getContext("2d");
  const wrap = c.parentElement;

  const cssW = wrap?.clientWidth || 900;
  const cssH = wrap?.clientHeight || 320;
  const dpr = window.devicePixelRatio || 1;

  c.width = Math.round(cssW * dpr);
  c.height = Math.round(cssH * dpr);
  c.style.width = `${cssW}px`;
  c.style.height = `${cssH}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = cssW;
  const H = cssH;

  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = "#0d1318";
  ctx.fillRect(0, 0, W, H);

  if (!rows || rows.length === 0) {
    ctx.fillStyle = "rgba(168,178,189,.85)";
    ctx.font = "13px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Run a calculation to see the balance chart.", 14, 24);
    return;
  }

  const pad = {
    l: 64,
    r: 16,
    t: 18,
    b: 34,
  };

  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const startBal = rows[0].balance + rows[0].principal + rows[0].extra;
  const maxBal = Math.max(startBal, 1);
  const n = rows.length;

  const x = (i) => pad.l + (i / Math.max(1, n - 1)) * innerW;
  const y = (bal) => pad.t + (1 - bal / maxBal) * innerH;

  ctx.strokeStyle = "rgba(42,51,61,.95)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + innerH);
  ctx.lineTo(pad.l + innerW, pad.t + innerH);
  ctx.stroke();

  ctx.strokeStyle = "rgba(95,191,159,.95)";
  ctx.lineWidth = 2;

  ctx.beginPath();

  rows.forEach((r, i) => {
    const px = x(i);
    const py = y(r.balance);

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });

  ctx.stroke();

  ctx.fillStyle = "rgba(168,178,189,.9)";
  ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";

  ctx.fillText("Month 1", pad.l, H - 10);
  ctx.fillText(`Month ${n}`, pad.l + innerW - 78, H - 10);
  ctx.fillText(fmtMoney(maxBal), 10, pad.t + 12);
  ctx.fillText(fmtMoney(0), 10, pad.t + innerH);
}

if (els.calcBtn) {
  els.calcBtn.addEventListener("click", calculate);
}

if (els.sampleBtn) {
  els.sampleBtn.addEventListener("click", applySampleValues);
}

if (els.resetBtn) {
  els.resetBtn.addEventListener("click", reset);
}

if (els.showAll) {
  els.showAll.addEventListener("change", () => {
    if (!lastSchedule) {
      renderTable(null, els.showAll.checked);
      return;
    }

    renderTable(lastSchedule, els.showAll.checked);
  });
}

if (els.csvBtn) {
  els.csvBtn.addEventListener("click", () => {
    if (!lastSchedule || !lastInputs) {
      els.msg.textContent = "Run a calculation first, then download CSV.";
      return;
    }

    const csv = toCSV(lastSchedule);
    const filename = `amortization_${Math.round(lastInputs.years)}yr_${lastInputs.loanType}.csv`;

    download(filename, csv);
  });
}

wireDownPaymentSync();
wireLoanTypeCards();
wireClearErrorsOnInput();

reset();

window.addEventListener("resize", () => {
  drawChart(lastSchedule);
});
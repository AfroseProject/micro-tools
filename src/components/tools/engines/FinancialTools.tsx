'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface SubscriptionItem {
  id: string;
  name: string;
  cost: number;
  cycle: 'monthly' | 'yearly';
}

export default function FinancialTools({ slug }: { slug: string }) {
  const [a, setA] = useState<number>(10000);
  const [b, setB] = useState<number>(500);
  const [c, setC] = useState<number>(8);
  const [d, setD] = useState<number>(10);
  const [mode, setMode] = useState<'add' | 'remove'>('add');

  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const [subName, setSubName] = useState('');
  const [subCost, setSubCost] = useState('');
  const [subCycle, setSubCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (slug === 'subscription-cost-tracker') {
      const saved = localStorage.getItem('qt_subscriptions');
      if (saved) setSubs(JSON.parse(saved));
    }
  }, [slug]);

  const saveSubs = (next: SubscriptionItem[]) => {
    setSubs(next);
    localStorage.setItem('qt_subscriptions', JSON.stringify(next));
  };

  // #71 Compound Interest
  if (slug === 'compound-interest-calculator') {
    const r = c / 100 / 12;
    const n = d * 12;
    const futureVal =
      r === 0 ? a + b * n : a * Math.pow(1 + r, n) + b * ((Math.pow(1 + r, n) - 1) / r);
    const totalContrib = a + b * n;
    const interest = futureVal - totalContrib;
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Initial Principal ($)" value={a} onChange={setA} />
          <Field label="Monthly Contribution ($)" value={b} onChange={setB} />
          <Field label="Annual Return (%)" value={c} onChange={setC} step={0.1} />
          <Field label="Years" value={d} onChange={setD} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Stat
            label="Future Balance"
            value={`$${futureVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            highlight
          />
          <Stat
            label="Total Principal Invested"
            value={`$${totalContrib.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          />
          <Stat
            label="Total Interest Earned"
            value={`$${interest.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          />
        </div>
      </div>
    );
  }

  // #72 Mortgage & Loan Amortization
  if (slug === 'mortgage-loan-calculator') {
    const principal = a || 250000;
    const rate = (c || 6.5) / 100 / 12;
    const months = (d || 30) * 12;
    const monthly =
      rate === 0 ? principal / months : (principal * rate) / (1 - Math.pow(1 + rate, -months));
    const totalPaid = monthly * months;
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Loan Amount ($)" value={a} onChange={setA} />
          <Field label="Annual Interest Rate (%)" value={c} onChange={setC} step={0.1} />
          <Field label="Loan Term (Years)" value={d} onChange={setD} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Stat label="Monthly Payment" value={`$${monthly.toFixed(2)}`} highlight />
          <Stat
            label="Total Interest"
            value={`$${(totalPaid - principal).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          />
          <Stat
            label="Total Repayment"
            value={`$${totalPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          />
        </div>
      </div>
    );
  }

  // #73 SaaS Runway & Burn Rate
  if (slug === 'saas-runway-calculator') {
    const netBurn = Math.max(0, b - c);
    const runway = netBurn === 0 ? Infinity : a / netBurn;
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Cash in Bank ($)" value={a} onChange={setA} />
          <Field label="Monthly Gross Expenses ($)" value={b} onChange={setB} />
          <Field label="Monthly Revenue / MRR ($)" value={c} onChange={setC} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Stat label="Net Monthly Burn" value={`$${netBurn.toLocaleString()}/mo`} />
          <Stat
            label="Estimated Runway"
            value={runway === Infinity ? 'Profitable (∞)' : `${runway.toFixed(1)} Months`}
            highlight
          />
        </div>
      </div>
    );
  }

  // #74 Freelance Hourly Rate
  if (slug === 'freelance-hourly-rate-calculator') {
    const targetAnnual = a || 80000;
    const expenses = b || 12000;
    const billableHoursPerWeek = c || 25;
    const workingWeeks = d || 48;
    const hourly = (targetAnnual + expenses) / Math.max(1, billableHoursPerWeek * workingWeeks);
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Target Net Income ($/yr)" value={a} onChange={setA} />
          <Field label="Annual Expenses & Taxes ($)" value={b} onChange={setB} />
          <Field label="Billable Hours / Week" value={c} onChange={setC} />
          <Field label="Working Weeks / Year" value={d} onChange={setD} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Stat label="Minimum Billable Hourly Rate" value={`$${hourly.toFixed(2)} / hr`} highlight />
          <Stat label="Recommended Day Rate (8h)" value={`$${(hourly * 8).toFixed(2)} / day`} />
        </div>
      </div>
    );
  }

  // #75 Crypto P&L / DCA
  if (slug === 'crypto-dca-calculator') {
    const invested = a;
    const avgBuy = Math.max(0.000001, b);
    const currentPrice = c;
    const coins = invested / avgBuy;
    const currentVal = coins * currentPrice;
    const pnl = currentVal - invested;
    const pct = invested > 0 ? (pnl / invested) * 100 : 0;
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Total Invested ($)" value={a} onChange={setA} />
          <Field label="Average Entry Price ($)" value={b} onChange={setB} step={0.01} />
          <Field label="Current / Target Price ($)" value={c} onChange={setC} step={0.01} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Stat label="Total Units Held" value={coins.toFixed(6)} />
          <Stat label="Portfolio Value" value={`$${currentVal.toFixed(2)}`} />
          <Stat
            label="Net Profit / Loss"
            value={`${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pct.toFixed(2)}%)`}
            highlight
          />
        </div>
      </div>
    );
  }

  // #76 PayPal & Stripe Fee Calculator
  if (slug === 'paypal-stripe-fee-calculator') {
    const rate = (c || 2.9) / 100;
    const fixed = b || 0.3;
    const netReceived = Math.max(0, a - (a * rate + fixed));
    const askAmount = (a + fixed) / (1 - rate);
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Invoice Amount ($)" value={a} onChange={setA} step={0.01} />
          <Field label="Fixed Fee ($)" value={b} onChange={setB} step={0.01} />
          <Field label="Percentage Fee (%)" value={c} onChange={setC} step={0.1} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Stat
            label={`If you charge $${a.toFixed(2)}, you receive`}
            value={`$${netReceived.toFixed(2)}`}
          />
          <Stat
            label={`To receive $${a.toFixed(2)}, ask for`}
            value={`$${askAmount.toFixed(2)}`}
            highlight
          />
        </div>
      </div>
    );
  }

  // #77 ROI Calculator
  if (slug === 'roi-calculator') {
    const profit = b - a;
    const roi = a > 0 ? (profit / a) * 100 : 0;
    const annualized = a > 0 && d > 0 ? (Math.pow(b / a, 1 / d) - 1) * 100 : 0;
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Amount Invested ($)" value={a} onChange={setA} />
          <Field label="Amount Returned ($)" value={b} onChange={setB} />
          <Field label="Duration (Years)" value={d} onChange={setD} step={0.5} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Stat label="Net Profit" value={`$${profit.toLocaleString()}`} />
          <Stat label="Total ROI" value={`${roi.toFixed(2)}%`} highlight />
          <Stat label="Annualized ROI (CAGR)" value={`${annualized.toFixed(2)}%`} />
        </div>
      </div>
    );
  }

  // #78 Salary Tax Breakdown
  if (slug === 'salary-tax-calculator') {
    const gross = a;
    const effectiveTaxRate = Math.min(90, Math.max(0, c));
    const taxPaid = gross * (effectiveTaxRate / 100);
    const netAnnual = gross - taxPaid;
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Annual Gross Salary ($)" value={a} onChange={setA} />
          <Field label="Effective Tax & Deduction Rate (%)" value={c} onChange={setC} step={0.5} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Stat
            label="Net Take-Home (Yearly)"
            value={`$${netAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            highlight
          />
          <Stat
            label="Net Take-Home (Monthly)"
            value={`$${(netAnnual / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          />
          <Stat
            label="Total Taxes Deducted"
            value={`$${taxPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          />
        </div>
      </div>
    );
  }

  // #79 Break-Even Point
  if (slug === 'break-even-calculator') {
    const marginPerUnit = b - c;
    const units = marginPerUnit > 0 ? Math.ceil(a / marginPerUnit) : 0;
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Fixed Costs ($)" value={a} onChange={setA} />
          <Field label="Price Per Unit ($)" value={b} onChange={setB} step={0.01} />
          <Field label="Variable Cost Per Unit ($)" value={c} onChange={setC} step={0.01} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Stat
            label="Break-Even Units Required"
            value={marginPerUnit > 0 ? `${units.toLocaleString()} units` : 'Price must exceed cost'}
            highlight
          />
          <Stat label="Break-Even Revenue" value={`$${(units * b).toLocaleString()}`} />
        </div>
      </div>
    );
  }

  // #80 Affiliate Earnings
  if (slug === 'affiliate-earnings-calculator') {
    const clicks = a;
    const convRate = c / 100;
    const commission = b;
    const sales = clicks * convRate;
    const earnings = sales * commission;
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Monthly Visitors / Clicks" value={a} onChange={setA} />
          <Field label="Commission Per Sale ($)" value={b} onChange={setB} step={0.5} />
          <Field label="Conversion Rate (%)" value={c} onChange={setC} step={0.1} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Stat label="Estimated Conversions" value={`${sales.toFixed(1)} sales/mo`} />
          <Stat
            label="Projected Monthly Earnings"
            value={`$${earnings.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            highlight
          />
        </div>
      </div>
    );
  }

  // #81 VAT / Sales Tax Calculator
  if (slug === 'vat-sales-tax-calculator') {
    const rate = c / 100;
    const net = mode === 'add' ? a : a / (1 + rate);
    const tax = mode === 'add' ? a * rate : a - net;
    const gross = mode === 'add' ? a + tax : a;
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          <button
            onClick={() => setMode('add')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              mode === 'add' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Add Tax (Exclusive)
          </button>
          <button
            onClick={() => setMode('remove')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              mode === 'remove' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Extract Tax (Inclusive)
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Amount ($)" value={a} onChange={setA} step={0.01} />
          <Field label="VAT / GST / Tax Rate (%)" value={c} onChange={setC} step={0.1} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Stat label="Net Price" value={`$${net.toFixed(2)}`} />
          <Stat label="Tax Amount" value={`$${tax.toFixed(2)}`} />
          <Stat label="Gross Total" value={`$${gross.toFixed(2)}`} highlight />
        </div>
      </div>
    );
  }

  // #82 Stock Dividend Yield
  if (slug === 'dividend-yield-calculator') {
    const shares = a;
    const sharePrice = b;
    const annualDivPerShare = c;
    const totalInvested = shares * sharePrice;
    const annualIncome = shares * annualDivPerShare;
    const yieldPct = sharePrice > 0 ? (annualDivPerShare / sharePrice) * 100 : 0;
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Number of Shares" value={a} onChange={setA} />
          <Field label="Share Price ($)" value={b} onChange={setB} step={0.01} />
          <Field label="Annual Dividend / Share ($)" value={c} onChange={setC} step={0.01} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Stat label="Dividend Yield" value={`${yieldPct.toFixed(2)}%`} highlight />
          <Stat label="Annual Passive Income" value={`$${annualIncome.toFixed(2)}`} />
          <Stat label="Position Value" value={`$${totalInvested.toLocaleString()}`} />
        </div>
      </div>
    );
  }

  // #83 Inflation Impact
  if (slug === 'inflation-impact-calculator') {
    const rate = c / 100;
    const purchasingPower = a / Math.pow(1 + rate, d);
    const futureEquivalent = a * Math.pow(1 + rate, d);
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Current Amount ($)" value={a} onChange={setA} />
          <Field label="Annual Inflation Rate (%)" value={c} onChange={setC} step={0.1} />
          <Field label="Years Ahead" value={d} onChange={setD} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Stat
            label={`Purchasing Power in ${d} Years`}
            value={`$${purchasingPower.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            highlight
          />
          <Stat
            label={`Cost of Today's $${a.toLocaleString()} Basket`}
            value={`$${futureEquivalent.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          />
        </div>
      </div>
    );
  }

  // #84 Subscription Cost Tracker
  if (slug === 'subscription-cost-tracker') {
    const monthlyTotal = subs.reduce(
      (acc, s) => acc + (s.cycle === 'monthly' ? s.cost : s.cost / 12),
      0
    );
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-4 gap-3">
          <input
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            placeholder="Service (e.g., AWS, Figma)"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"
          />
          <input
            type="number"
            value={subCost}
            onChange={(e) => setSubCost(e.target.value)}
            placeholder="Cost ($)"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"
          />
          <select
            value={subCycle}
            onChange={(e) => setSubCycle(e.target.value as 'monthly' | 'yearly')}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button
            onClick={() => {
              const costNum = parseFloat(subCost);
              if (!subName.trim() || isNaN(costNum)) return;
              saveSubs([
                ...subs,
                { id: crypto.randomUUID(), name: subName.trim(), cost: costNum, cycle: subCycle },
              ]);
              setSubName('');
              setSubCost('');
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 py-2.5"
          >
            <Plus className="w-4 h-4" /> Add Subscription
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Stat label="Normalized Monthly Spend" value={`$${monthlyTotal.toFixed(2)} / mo`} highlight />
          <Stat label="Projected Annual Spend" value={`$${(monthlyTotal * 12).toFixed(2)} / yr`} />
        </div>

        <div className="space-y-2">
          {subs.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-sm"
            >
              <div>
                <span className="font-semibold text-white">{s.name}</span>
                <span className="text-xs text-slate-500 ml-2">({s.cycle})</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-emerald-400">${s.cost.toFixed(2)}</span>
                <button
                  onClick={() => saveSubs(subs.filter((x) => x.id !== s.id))}
                  className="text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // #85 Unit Economics & LTV/CAC
  const arpu = a || 49;
  const grossMargin = (c || 80) / 100;
  const monthlyChurn = Math.max(0.1, d || 4) / 100;
  const cac = b || 150;
  const ltv = (arpu * grossMargin) / monthlyChurn;
  const ratio = cac > 0 ? ltv / cac : 0;
  const paybackMonths = arpu * grossMargin > 0 ? cac / (arpu * grossMargin) : 0;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Monthly ARPU ($)" value={a} onChange={setA} />
        <Field label="Customer Acquisition Cost ($)" value={b} onChange={setB} />
        <Field label="Gross Margin (%)" value={c} onChange={setC} />
        <Field label="Monthly Churn (%)" value={d} onChange={setD} step={0.1} />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Customer LTV" value={`$${ltv.toFixed(2)}`} />
        <Stat label="LTV : CAC Ratio" value={`${ratio.toFixed(2)}x`} highlight />
        <Stat label="CAC Payback Period" value={`${paybackMonths.toFixed(1)} months`} />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-2xl border ${
        highlight ? 'bg-indigo-950/30 border-indigo-500/40' : 'bg-slate-950 border-slate-800'
      }`}
    >
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-xl font-black mt-1 ${highlight ? 'text-indigo-300' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}
# Liquidity Control Tower

Liquidity Control Tower is a fintech treasury MVP for PSPs, neobanks, and multi-currency finance teams.

The product shows not just how much money a company has on paper, but how much liquidity is actually usable after settlement delays, cut-offs, holidays, buffers, and planned payouts. The main demo scenario finds a future EUR cash gap, explains why it happens, recommends a manual treasury action, and shows the business impact after approval.

## Demo Goal

In 3–5 minutes, the demo should answer four questions:

- Where is the liquidity risk?
- When will it happen?
- Why will it happen?
- What action should treasury approve?

## MVP Scope

The MVP uses synthetic data instead of real bank integrations. It focuses on clear settlement logic, explainable cash gap detection, deterministic recommendations, and a dashboard that can be shown to a jury without extra setup.

Out of scope for the hackathon MVP:

- real bank APIs;
- real payments;
- production ML;
- ERP/TMS integrations;
- complex RBAC or compliance flows.

## Main Demo Story

1. Total cash looks healthy.
2. Usable EUR liquidity drops because card clearing settles later than a merchant payout.
3. A bank holiday pushes an expected inflow by one business day.
4. The dashboard raises a Red risk alert for a cash gap in roughly 36 hours.
5. The system recommends moving idle EUR from another account before cut-off.
6. The user approves the recommendation.
7. Risk status changes to Green and the ROI block shows avoided overdraft and released liquidity.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

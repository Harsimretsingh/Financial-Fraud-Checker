import { initLogger, logAgent } from './src/utils/logger.js';
import { screenTransaction } from './src/services/transactionService.js';

const transactionForm = document.getElementById('transactionForm');
const logArea = document.getElementById('logArea');
const historyBody = document.getElementById('historyBody');
const verdictLabel = document.getElementById('verdictLabel');
const riskScoreEl = document.getElementById('riskScore');
const decisionPathEl = document.getElementById('decisionPath');
const verdictReasonEl = document.getElementById('verdictReason');
const specterInsightEl = document.getElementById('specterInsight');

const history = [];
initLogger(logArea);
logAgent('Service ready.', 'Submit a payment to start screening through the agent workflow.');

function updateDashboard(output) {
  verdictLabel.textContent = output.result.verdict;
  riskScoreEl.textContent = `${output.result.riskScore}%`;
  decisionPathEl.textContent = output.result.decisionTrack;
  verdictReasonEl.textContent = output.result.reason;

  const details = output.result.enrichmentSummary;
  specterInsightEl.textContent = `Company: ${details.companyName}. Funding stage: ${details.fundingStage}. Last funding: ${details.lastFundingAmount}. Employees: ${details.employeeCount || 'unknown'}. ${details.sectorNotes}`;
}

function addHistory(output) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${output.transaction.merchant}</td>
    <td>${output.transaction.currency} ${output.transaction.amount.toFixed(2)}</td>
    <td>${output.result.riskScore}%</td>
    <td><span class="label ${output.result.decisionBadge}">${output.result.decisionLabel}</span></td>
    <td>${output.result.decisionTrack}</td>
  `;
  historyBody.prepend(row);
  history.unshift(output);
}

transactionForm.addEventListener('submit', event => {
  event.preventDefault();
  const formData = new FormData(transactionForm);
  const transaction = {
    merchant: formData.get('merchant'),
    amount: Number(formData.get('amount')),
    currency: formData.get('currency'),
    location: formData.get('location'),
    paymentType: formData.get('paymentType'),
    timestamp: new Date().toISOString()
  };

  const output = screenTransaction(transaction, logAgent);
  updateDashboard(output);
  addHistory(output);

  transactionForm.reset();
  transactionForm.elements.merchant.focus();
});

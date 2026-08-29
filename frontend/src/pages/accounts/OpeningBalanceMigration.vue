<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Opening Balance &amp; Migration</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Bring the closing position of your previous books in as this system's opening position — these are balances
          already held on the migration date, not new receipts or payments
        </p>
      </div>
      <div class="d-flex flex-wrap align-center ga-2">
        <AppChip v-if="migration" size="small" :color="store.isFinalized ? 'success' : 'warning'">
          {{ store.isFinalized ? 'Finalized' : 'Draft' }}
        </AppChip>
        <AppBtn v-if="migration && !store.isFinalized" color="success" size="small" prepend-icon="mdi-lock-check-outline" @click="onFinalize">
          Finalize Opening Position
        </AppBtn>
        <AppBtn v-else-if="migration" color="warning" variant="outlined" size="small" prepend-icon="mdi-lock-open-variant-outline" @click="onReopen">
          Reopen
        </AppBtn>
      </div>
    </div>

    <!-- ------------------------------------------------- migration header -->
    <AppCard class="pa-4 mb-4">
      <div class="text-subtitle-2 mb-3">Migration Details</div>
      <div class="row row-dense">
        <div class="col-12 col-sm-6 col-md-3">
          <AppTextField v-model="migrationForm.migrationDate" type="date" label="Migration Date" density="compact" hide-details class="mb-2" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <AppTextField v-model="migrationForm.previousSystem" label="Previous System" density="compact" hide-details class="mb-2" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <AppTextField v-model="migrationForm.previousClosingDate" type="date" label="Previous Closing Date" density="compact" hide-details class="mb-2" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <AppTextField v-model="migrationForm.notes" label="Notes" density="compact" hide-details class="mb-2" />
        </div>
      </div>
      <div class="d-flex align-center ga-2 mt-2">
        <AppBtn color="primary" size="small" :loading="savingMigration" :disabled="store.isFinalized" @click="onSaveMigration">
          {{ migration ? 'Update Migration Details' : 'Start Migration' }}
        </AppBtn>
        <span v-if="migration" class="text-caption text-medium-emphasis">
          New transactions in this system run from {{ formatDate(migration.migrationDate) }}.
        </span>
      </div>
    </AppCard>

    <AppAlert v-if="!migration" type="info" variant="tonal" class="mb-4">
      Set the migration date and previous system first — every opening balance below is dated from it.
    </AppAlert>

    <template v-else>
      <AppTabs v-model="activeTab" color="primary" class="mb-4">
        <AppTab value="bank-cash">Bank &amp; Cash</AppTab>
        <AppTab value="assets">Existing Assets</AppTab>
        <AppTab value="loans">Loans &amp; Liabilities</AppTab>
        <AppTab value="loans-given">Loans Given</AppTab>
        <AppTab value="receivables">Receivables</AppTab>
        <AppTab value="payables">Payables</AppTab>
        <AppTab value="capital">Capital &amp; Owner Funds</AppTab>
        <AppTab value="other">Other Adjustments</AppTab>
        <AppTab value="summary">Migration Summary</AppTab>
      </AppTabs>

      <AppWindow v-model="activeTab">
        <!-- ------------------------------------------------ Bank & Cash -->
        <AppWindowItem value="bank-cash">
          <OpeningBalanceTable
            title="Bank Opening Balances"
            description="The balance already available in each bank account on the migration date. This is not money received — the account balance simply starts from here."
            name-header="Bank Account"
            add-label="Add Bank Balance"
            :entries="store.byCategory('BANK')"
            :locked="store.isFinalized"
            @add="openEntryDialog('BANK')"
            @edit="openEditEntry"
            @remove="onRemoveEntry"
            @confirm="onConfirmEntry"
          />
          <OpeningBalanceTable
            title="Cash Opening Balances"
            description="Cash in hand on the migration date, per cash account."
            name-header="Cash Account"
            add-label="Add Cash Balance"
            :entries="store.byCategory('CASH')"
            :locked="store.isFinalized"
            @add="openEntryDialog('CASH')"
            @edit="openEditEntry"
            @remove="onRemoveEntry"
            @confirm="onConfirmEntry"
          />
        </AppWindowItem>

        <!-- --------------------------------------------- Existing Assets -->
        <AppWindowItem value="assets">
          <AppCard class="pa-4 mb-4">
            <div class="d-flex flex-wrap align-center justify-space-between mb-2 ga-2">
              <div>
                <div class="text-subtitle-2">Existing / Opening Assets</div>
                <p class="text-caption text-medium-emphasis mb-0">
                  Assets you already owned on the migration date. No purchase transaction is created and no bank or cash
                  balance moves — how they were originally paid for is not guessed.
                </p>
              </div>
              <div class="d-flex ga-2">
                <AppBtn size="small" variant="outlined" prepend-icon="mdi-open-in-new" @click="router.push('/accounts/fixed-assets')">
                  Asset Register
                </AppBtn>
                <AppBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openAssetDialog()">
                  Register Opening Asset
                </AppBtn>
              </div>
            </div>

            <p v-if="openingAssets.length === 0" class="text-caption text-medium-emphasis mb-0">No opening assets registered yet.</p>
            <div v-else class="tblwrap">
              <AppTable density="compact">
                <thead>
                  <tr>
                    <th>Code</th><th>Asset</th><th>Vehicle</th>
                    <th class="text-right">Original Cost</th>
                    <th class="text-right">Accumulated Depreciation</th>
                    <th class="text-right">Opening Book Value</th>
                    <th>Opening Date</th><th>Source</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="asset in openingAssets" :key="asset.id">
                    <td>{{ asset.assetCode }}</td>
                    <td>{{ asset.assetName }}</td>
                    <td>{{ asset.vehicle?.registrationNumber || '—' }}</td>
                    <td class="text-right">{{ formatCurrency(asset.purchaseValue) }}</td>
                    <td class="text-right">{{ formatCurrency(asset.accumulatedDepreciation) }}</td>
                    <td class="text-right">{{ formatCurrency(asset.currentValue) }}</td>
                    <td>{{ asset.openingDate ? formatDate(asset.openingDate) : formatDate(asset.purchaseDate) }}</td>
                    <td class="text-caption">{{ asset.migrationSource || 'Tally Migration' }}</td>
                    <td class="text-right text-no-wrap">
                      <AppBtn icon="mdi-pencil-outline" variant="text" size="small" title="Edit opening asset" @click="openAssetDialog(asset)" />
                      <AppBtn icon="mdi-delete-outline" variant="text" size="small" color="error" title="Delete opening asset" @click="onRemoveAsset(asset)" />
                    </td>
                  </tr>
                </tbody>
              </AppTable>
            </div>
          </AppCard>

          <OpeningBalanceTable
            title="Other Opening Assets"
            description="Deposits, advances and anything else you owned that is not in the Asset Register."
            name-header="Description"
            add-label="Add Opening Asset"
            :entries="store.byCategory('OTHER_ASSET')"
            :locked="store.isFinalized"
            @add="openEntryDialog('OTHER_ASSET')"
            @edit="openEditEntry"
            @remove="onRemoveEntry"
            @confirm="onConfirmEntry"
          />
        </AppWindowItem>

        <!-- ------------------------------------------ Loans & Liabilities -->
        <AppWindowItem value="loans">
          <AppCard class="pa-4 mb-4">
            <div class="d-flex flex-wrap align-center justify-space-between mb-2 ga-2">
              <div>
                <div class="text-subtitle-2">Existing Loans</div>
                <p class="text-caption text-medium-emphasis mb-0">
                  Loans that were already running. Enter what is still owed on the migration date and how many EMIs are
                  left — EMIs already paid in the old system are not recreated.
                </p>
              </div>
              <div class="d-flex ga-2">
                <AppBtn size="small" variant="outlined" prepend-icon="mdi-open-in-new" @click="router.push('/accounts/loans')">
                  Loans &amp; EMI
                </AppBtn>
                <AppBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openLoanDialog()">
                  Register Opening Loan
                </AppBtn>
              </div>
            </div>

            <p v-if="openingLoans.length === 0" class="text-caption text-medium-emphasis mb-0">No opening loans registered yet.</p>
            <div v-else class="tblwrap">
              <AppTable density="compact">
                <thead>
                  <tr>
                    <th>Loan No.</th><th>Lender</th><th>Type</th><th>Vehicle / Owner</th>
                    <th class="text-right">Original Loan</th>
                    <th class="text-right">Opening Outstanding</th>
                    <th class="text-right">Outstanding Now</th>
                    <th class="text-right">EMI</th><th>Next EMI</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="loan in openingLoans" :key="loan.id">
                    <td>
                      <RouterLink :to="`/accounts/loans/${loan.id}`" class="text-primary">{{ loan.loanNumber }}</RouterLink>
                    </td>
                    <td>{{ loan.lenderName }}</td>
                    <td>{{ LOAN_TYPE_LABELS[loan.loanType] }}</td>
                    <td>{{ loan.vehicle?.registrationNumber || loan.capitalPartner?.name || '—' }}</td>
                    <td class="text-right">{{ formatCurrency(loan.originalPrincipal ?? loan.principalAmount) }}</td>
                    <td class="text-right">{{ formatCurrency(loan.principalAmount) }}</td>
                    <td class="text-right">{{ formatCurrency(loan.totals.outstandingPrincipal) }}</td>
                    <td class="text-right">{{ formatCurrency(loan.emiAmount) }}</td>
                    <td>{{ loan.totals.nextEmiDate ? formatDate(loan.totals.nextEmiDate) : '—' }}</td>
                    <td class="text-right text-no-wrap">
                      <AppBtn icon="mdi-pencil-outline" variant="text" size="small" title="Edit opening loan" @click="openLoanDialog(loan)" />
                      <AppBtn icon="mdi-delete-outline" variant="text" size="small" color="error" title="Delete opening loan" @click="onRemoveLoan(loan)" />
                    </td>
                  </tr>
                </tbody>
              </AppTable>
            </div>
          </AppCard>

          <OpeningBalanceTable
            title="Other Opening Liabilities"
            description="Anything else the business owed on the migration date that is not a loan or a supplier bill."
            name-header="Description"
            add-label="Add Opening Liability"
            :entries="store.byCategory('OTHER_LIABILITY')"
            :locked="store.isFinalized"
            @add="openEntryDialog('OTHER_LIABILITY')"
            @edit="openEditEntry"
            @remove="onRemoveEntry"
            @confirm="onConfirmEntry"
          />
        </AppWindowItem>

        <!-- ----------------------------------------------- Loans Given -->
        <AppWindowItem value="loans-given">
          <AppCard class="pa-4">
            <div class="d-flex flex-wrap align-center justify-space-between mb-2 ga-2">
              <div>
                <div class="text-subtitle-2">Loans Given</div>
                <p class="text-caption text-medium-emphasis mb-0">
                  Money you had already lent out on the migration date — to a friend, a relative, or anyone with no
                  master record. This is an asset, not an expense. Registering one here moves no money: your opening
                  Bank/Cash balance already accounts for the cash having left.
                </p>
              </div>
              <div class="d-flex ga-2">
                <AppBtn size="small" variant="outlined" prepend-icon="mdi-open-in-new" @click="router.push('/accounts/loans-given')">
                  Loans Given
                </AppBtn>
                <AppBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openLoanGivenDialog()">
                  Register Opening Loan Given
                </AppBtn>
              </div>
            </div>

            <p v-if="openingLoansGiven.length === 0" class="text-caption text-medium-emphasis mb-0">
              No opening loans given registered yet.
            </p>
            <div v-else class="tblwrap">
              <AppTable density="compact">
                <thead>
                  <tr>
                    <th>Reference</th><th>Given To</th><th>Contact</th><th>Given On</th><th>Expected Back</th>
                    <th class="text-right">Amount at Migration</th>
                    <th class="text-right">Repaid Since</th>
                    <th class="text-right">Still Owed</th>
                    <th>Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="loan in openingLoansGiven" :key="loan.id">
                    <td>{{ loan.referenceNumber }}</td>
                    <td>{{ loan.partyName }}</td>
                    <td>{{ loan.partyContact || '—' }}</td>
                    <td>{{ formatDate(loan.givenDate) }}</td>
                    <td>{{ loan.expectedReturnDate ? formatDate(loan.expectedReturnDate) : '—' }}</td>
                    <td class="text-right">{{ formatCurrency(loan.amount) }}</td>
                    <td class="text-right">{{ formatCurrency(loan.totals.repaid) }}</td>
                    <td class="text-right">{{ formatCurrency(loan.totals.outstanding) }}</td>
                    <td>
                      <AppChip
                        size="x-small"
                        :color="loan.status === 'WRITTEN_OFF' ? 'error' : loan.status === 'REPAID' ? 'success' : loan.totals.isOverdue ? 'warning' : 'info'"
                        variant="tonal"
                      >
                        {{ LOAN_GIVEN_STATUS_LABELS[loan.status] }}
                      </AppChip>
                    </td>
                    <td class="text-right text-no-wrap">
                      <AppBtn icon="mdi-pencil-outline" variant="text" size="small" title="Edit opening loan given" @click="openLoanGivenDialog(loan)" />
                      <AppBtn icon="mdi-delete-outline" variant="text" size="small" color="error" title="Delete opening loan given" @click="onRemoveLoanGiven(loan)" />
                    </td>
                  </tr>
                </tbody>
              </AppTable>
              <p class="text-caption text-medium-emphasis mt-2 mb-0">
                Record repayments on the Loans Given screen — money coming back after the migration date is real money
                and credits the account it lands in.
              </p>
            </div>
          </AppCard>
        </AppWindowItem>

        <!-- ----------------------------------------------- Receivables -->
        <AppWindowItem value="receivables">
          <OpeningBalanceTable
            title="Customer Opening Outstanding"
            description="What customers already owed you on the migration date. Recorded customer-wise, or invoice-wise if you have the invoice reference."
            name-header="Customer"
            add-label="Add Customer Outstanding"
            :entries="store.byCategory('RECEIVABLE')"
            :locked="store.isFinalized"
            show-reference
            @add="openEntryDialog('RECEIVABLE')"
            @edit="openEditEntry"
            @remove="onRemoveEntry"
            @confirm="onConfirmEntry"
          />
        </AppWindowItem>

        <!-- -------------------------------------------------- Payables -->
        <AppWindowItem value="payables">
          <OpeningBalanceTable
            title="Supplier Opening Outstanding"
            description="What you already owed suppliers on the migration date. No payment or bill is created for these."
            name-header="Supplier"
            add-label="Add Supplier Outstanding"
            :entries="store.byCategory('PAYABLE')"
            :locked="store.isFinalized"
            show-reference
            @add="openEntryDialog('PAYABLE')"
            @edit="openEditEntry"
            @remove="onRemoveEntry"
            @confirm="onConfirmEntry"
          />
        </AppWindowItem>

        <!-- ------------------------------------- Capital & Owner Funds -->
        <AppWindowItem value="capital">
          <AppAlert type="info" variant="tonal" density="compact" class="mb-3">
            Money an owner put in before the migration is not automatically capital. Part of it is often a loan the
            business owes back — leave it as <strong>Needs Review</strong> until you know, then reclassify it.
          </AppAlert>
          <OpeningBalanceTable
            title="Owner / Partner Opening Funds"
            description="One row per amount. Split a partner's total into capital and owner loan by adding a row for each part."
            name-header="Owner / Partner"
            add-label="Add Owner Funds"
            :entries="store.byCategory('OWNER_FUNDS')"
            :locked="store.isFinalized"
            show-classification
            @add="openEntryDialog('OWNER_FUNDS')"
            @edit="openEditEntry"
            @remove="onRemoveEntry"
            @reclassify="openReclassifyDialog"
            @confirm="onConfirmEntry"
          />
        </AppWindowItem>

        <!-- ---------------------------------------- Other Adjustments -->
        <AppWindowItem value="other">
          <OpeningBalanceTable
            title="Other Opening Equity"
            description="Accumulated profit or any other equity carried forward from the old books. A past loss can be entered as a negative amount."
            name-header="Description"
            add-label="Add Opening Equity"
            :entries="store.byCategory('OTHER_EQUITY')"
            :locked="store.isFinalized"
            @add="openEntryDialog('OTHER_EQUITY')"
            @edit="openEditEntry"
            @remove="onRemoveEntry"
            @confirm="onConfirmEntry"
          />
          <OpeningBalanceTable
            title="Other Opening Assets"
            name-header="Description"
            add-label="Add Opening Asset"
            :entries="store.byCategory('OTHER_ASSET')"
            :locked="store.isFinalized"
            @add="openEntryDialog('OTHER_ASSET')"
            @edit="openEditEntry"
            @remove="onRemoveEntry"
            @confirm="onConfirmEntry"
          />
          <OpeningBalanceTable
            title="Other Opening Liabilities"
            name-header="Description"
            add-label="Add Opening Liability"
            :entries="store.byCategory('OTHER_LIABILITY')"
            :locked="store.isFinalized"
            @add="openEntryDialog('OTHER_LIABILITY')"
            @edit="openEditEntry"
            @remove="onRemoveEntry"
            @confirm="onConfirmEntry"
          />
        </AppWindowItem>

        <!-- ------------------------------------------ Migration Summary -->
        <AppWindowItem value="summary">
          <template v-if="summary">
            <AppAlert
              :type="summary.totals.reconciled && summary.totals.unclassifiedAmount === 0 ? 'success' : 'warning'"
              variant="tonal"
              class="mb-4"
            >
              <div class="font-weight-medium">
                {{ summary.totals.reconciled ? 'Opening position balances' : 'Opening Balance Requires Reconciliation' }}
              </div>
              <div class="text-caption">
                Assets {{ formatCurrency(summary.totals.totalAssets) }} = Liabilities
                {{ formatCurrency(summary.totals.totalLiabilities) }} + Capital
                {{ formatCurrency(summary.totals.totalCapital) }}
                <template v-if="summary.totals.unclassifiedAmount">
                  + Owner funds needing review {{ formatCurrency(summary.totals.unclassifiedAmount) }}
                </template>
                <template v-if="!summary.totals.reconciled">
                  — unreconciled opening amount
                  <strong>{{ formatCurrency(summary.totals.difference) }}</strong>
                </template>
              </div>
            </AppAlert>

            <div class="row mb-2">
              <div class="col-12 col-sm-6 col-md-3">
                <ProfitCard label="Total Opening Assets" :value="summary.totals.totalAssets" icon="mdi-warehouse" color="primary" />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <ProfitCard label="Total Opening Liabilities" :value="summary.totals.totalLiabilities" icon="mdi-hand-coin-outline" color="warning" />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <ProfitCard label="Total Opening Capital" :value="summary.totals.totalCapital" icon="mdi-wallet-outline" color="success" />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <ProfitCard
                  label="Unreconciled / Needs Review"
                  :value="summary.totals.difference + summary.totals.unclassifiedAmount"
                  icon="mdi-help-circle-outline"
                  color="error"
                />
              </div>
            </div>

            <div class="row">
              <div class="col-12 col-md-6">
                <AppCard class="pa-4 mb-4">
                  <div class="text-subtitle-2 mb-2">What the business owns</div>
                  <div class="bs-row"><span>Bank</span><span>{{ formatCurrency(summary.bank.total) }}</span></div>
                  <div class="bs-row"><span>Cash</span><span>{{ formatCurrency(summary.cash.total) }}</span></div>
                  <div class="bs-row">
                    <span>
                      Opening Assets (book value)
                      <span class="text-caption text-medium-emphasis">
                        — cost {{ formatCurrency(summary.assets.grossCost) }}, less depreciation
                        {{ formatCurrency(summary.assets.accumulatedDepreciation) }}
                      </span>
                    </span>
                    <span>{{ formatCurrency(summary.assets.bookValue) }}</span>
                  </div>
                  <div class="bs-row"><span>Customer Outstanding ({{ summary.receivables.count }})</span><span>{{ formatCurrency(summary.receivables.total) }}</span></div>
                  <div class="bs-row">
                    <span>
                      Loans Given ({{ summary.loansGiven.count }})
                      <span v-if="summary.loansGiven.recoverable !== summary.loansGiven.given" class="text-caption text-medium-emphasis">
                        — {{ formatCurrency(summary.loansGiven.recoverable) }} still recoverable today
                      </span>
                    </span>
                    <span>{{ formatCurrency(summary.loansGiven.given) }}</span>
                  </div>
                  <div class="bs-row"><span>Other Opening Assets</span><span>{{ formatCurrency(summary.other.otherAssets) }}</span></div>
                  <div class="bs-row font-weight-bold"><span>Total Opening Assets</span><span>{{ formatCurrency(summary.totals.totalAssets) }}</span></div>
                </AppCard>
              </div>

              <div class="col-12 col-md-6">
                <AppCard class="pa-4 mb-4">
                  <div class="text-subtitle-2 mb-2">What the business owes &amp; owner funds</div>
                  <div class="bs-row"><span>Opening Loans ({{ summary.loans.count }})</span><span>{{ formatCurrency(summary.loans.openingOutstanding) }}</span></div>
                  <div class="bs-row"><span>Supplier Outstanding ({{ summary.payables.count }})</span><span>{{ formatCurrency(summary.payables.total) }}</span></div>
                  <div class="bs-row"><span>Owner Loans</span><span>{{ formatCurrency(summary.ownerFunds.ownerLoan) }}</span></div>
                  <div class="bs-row"><span>Other Opening Liabilities</span><span>{{ formatCurrency(summary.other.otherLiabilities + summary.ownerFunds.otherLiability) }}</span></div>
                  <div class="bs-row font-weight-bold"><span>Total Opening Liabilities</span><span>{{ formatCurrency(summary.totals.totalLiabilities) }}</span></div>
                  <div class="bs-row mt-2"><span>Owner Capital</span><span>{{ formatCurrency(summary.ownerFunds.capital) }}</span></div>
                  <div class="bs-row"><span>Other Opening Equity</span><span>{{ formatCurrency(summary.other.otherEquity) }}</span></div>
                  <div class="bs-row font-weight-bold"><span>Total Opening Capital</span><span>{{ formatCurrency(summary.totals.totalCapital) }}</span></div>
                  <div v-if="summary.totals.unclassifiedAmount" class="bs-row text-error">
                    <span>Owner funds still to classify</span><span>{{ formatCurrency(summary.totals.unclassifiedAmount) }}</span>
                  </div>
                </AppCard>
              </div>
            </div>

            <AppCard class="pa-4">
              <div class="text-subtitle-2 mb-2">Migration Status</div>
              <div class="d-flex flex-wrap ga-4">
                <div v-for="(label, key) in MIGRATION_STATUS_LABELS" :key="key" class="d-flex align-center ga-2">
                  <AppChip size="x-small" :color="statusChipColor(key)">{{ label }}</AppChip>
                  <span class="text-body-2 font-weight-medium">{{ summary.statusCounts[key] || 0 }}</span>
                </div>
              </div>
              <p class="text-caption text-medium-emphasis mb-0 mt-3">
                Counts cover every opening record — bank, cash, receivables, payables, owner funds, opening assets and
                opening loans.
              </p>
            </AppCard>
          </template>
        </AppWindowItem>
      </AppWindow>
    </template>

    <!-- ------------------------------------------- opening balance dialog -->
    <MasterFormDialog
      v-model="entryDialog"
      :title="entryDialogTitle"
      :loading="submitting"
      @submit="onSubmitEntry"
    >
      <AppSelect
        v-if="entryForm.category === 'BANK'"
        v-model="entryForm.bankAccountId"
        :items="bankOptions"
        item-title="label"
        item-value="id"
        label="Bank Account"
        :disabled="!!editTarget"
        :error-messages="entryErrors.link"
        class="mb-2"
      />
      <AppSelect
        v-else-if="entryForm.category === 'CASH'"
        v-model="entryForm.cashAccountId"
        :items="cashOptions"
        item-title="label"
        item-value="id"
        label="Cash Account"
        :disabled="!!editTarget"
        :error-messages="entryErrors.link"
        class="mb-2"
      />
      <AppSelect
        v-else-if="entryForm.category === 'RECEIVABLE'"
        v-model="entryForm.companyId"
        :items="companyOptions"
        item-title="name"
        item-value="id"
        label="Customer"
        :disabled="!!editTarget"
        :error-messages="entryErrors.link"
        class="mb-2"
      />
      <AppSelect
        v-else-if="entryForm.category === 'PAYABLE'"
        v-model="entryForm.supplierId"
        :items="supplierOptions"
        item-title="name"
        item-value="id"
        label="Supplier"
        :disabled="!!editTarget"
        :error-messages="entryErrors.link"
        class="mb-2"
      />
      <AppSelect
        v-else-if="entryForm.category === 'OWNER_FUNDS'"
        v-model="entryForm.capitalPartnerId"
        :items="partnerOptions"
        item-title="name"
        item-value="id"
        label="Owner / Partner"
        :disabled="!!editTarget"
        :error-messages="entryErrors.link"
        class="mb-2"
      />
      <AppTextField
        v-else
        v-model="entryForm.label"
        label="Description"
        :disabled="!!editTarget"
        :error-messages="entryErrors.link"
        class="mb-2"
      />

      <AppTextField
        v-model.number="entryForm.amount"
        type="number"
        label="Opening Balance"
        :error-messages="entryErrors.amount"
        :hint="amountHint"
        persistent-hint
        class="mb-2"
      />

      <AppSelect
        v-if="entryForm.category === 'OWNER_FUNDS'"
        v-model="entryForm.classification"
        :items="classificationOptions"
        item-title="label"
        item-value="value"
        label="Treat this money as"
        class="mb-2"
      />

      <div v-if="entryForm.category === 'RECEIVABLE' || entryForm.category === 'PAYABLE'" class="d-flex ga-2">
        <AppTextField v-model="entryForm.referenceNumber" label="Invoice / Bill No. (optional)" class="mb-2 flex-1-1" />
        <AppTextField v-model="entryForm.referenceDate" type="date" label="Due / Bill Date (optional)" hint="Used for aging" persistent-hint class="mb-2 flex-1-1" />
      </div>

      <div class="d-flex ga-2">
        <AppSelect v-model="entryForm.status" :items="statusOptions" item-title="label" item-value="value" label="Status" class="mb-2 flex-1-1" />
        <AppTextField v-model="entryForm.source" label="Source" class="mb-2 flex-1-1" />
      </div>
      <AppTextarea v-model="entryForm.remarks" label="Remarks" rows="2" class="mb-2" />
    </MasterFormDialog>

    <!-- ----------------------------------------------- reclassify dialog -->
    <MasterFormDialog v-model="reclassifyDialog" title="Reclassify Owner Funds" :loading="submitting" @submit="onSubmitReclassify">
      <p class="text-caption text-medium-emphasis mb-3">
        {{ reclassifyTarget?.name }} — {{ formatCurrency(reclassifyTarget?.amount || 0) }}. Capital stays in the
        business; an owner loan is money the business owes back.
      </p>
      <AppSelect
        v-model="reclassifyForm.classification"
        :items="classificationOptions"
        item-title="label"
        item-value="value"
        label="Treat this money as"
        class="mb-2"
      />
      <AppTextarea v-model="reclassifyForm.remarks" label="Reason / Remarks" rows="2" class="mb-2" />
    </MasterFormDialog>

    <!-- -------------------------------------------- opening asset dialog -->
    <MasterFormDialog
      v-model="assetDialog"
      :title="assetEditTarget ? 'Edit Opening Asset' : 'Register Opening Asset'"
      :loading="submitting"
      @submit="onSubmitAsset"
    >
      <AppAlert type="info" variant="tonal" density="compact" class="mb-3">
        No payment is recorded for an opening asset — no bank or cash balance changes.
      </AppAlert>
      <AppTextField v-model="assetForm.assetName" label="Asset Name" :error-messages="assetErrors.assetName" class="mb-2" />
      <AppSelect v-model="assetForm.categoryId" :items="categoryStore.items" item-title="name" item-value="id" label="Asset Category" :error-messages="assetErrors.categoryId" class="mb-2" />
      <AppSelect v-model="assetForm.vehicleId" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle (if a vehicle asset)" clearable class="mb-2" />
      <div class="d-flex ga-2">
        <AppTextField v-model="assetForm.purchaseDate" type="date" label="Original Purchase Date" class="mb-2 flex-1-1" />
        <AppTextField v-model.number="assetForm.purchaseValue" type="number" label="Original Cost" :error-messages="assetErrors.purchaseValue" class="mb-2 flex-1-1" />
      </div>
      <div class="d-flex ga-2">
        <AppTextField v-model.number="assetForm.accumulatedDepreciation" type="number" label="Accumulated Depreciation" class="mb-2 flex-1-1" />
        <AppTextField :model-value="assetBookValue" type="number" label="Opening Book Value" readonly hint="Original cost − accumulated depreciation" persistent-hint class="mb-2 flex-1-1" />
      </div>
      <div class="d-flex ga-2">
        <AppTextField v-model="assetForm.openingDate" type="date" label="Opening Date" class="mb-2 flex-1-1" />
        <AppSelect v-model="assetForm.migrationStatus" :items="statusOptions" item-title="label" item-value="value" label="Status" class="mb-2 flex-1-1" />
      </div>
    </MasterFormDialog>

    <!-- --------------------------------------------- opening loan dialog -->
    <MasterFormDialog
      v-model="loanDialog"
      :title="loanEditTarget ? 'Edit Opening Loan' : 'Register Opening Loan'"
      :loading="submitting"
      @submit="onSubmitLoan"
    >
      <AppAlert type="info" variant="tonal" density="compact" class="mb-3">
        <template v-if="loanEditTarget">
          Correcting any of the money figures below regenerates the remaining EMI schedule. Once an EMI has been paid
          against this loan the figures are frozen — reverse the payment first.
        </template>
        <template v-else>
          Enter what is still owed today and how many EMIs are left. The remaining EMI schedule is generated from there —
          old EMIs are not recreated.
        </template>
      </AppAlert>
      <AppTextField v-model="loanForm.loanName" label="Loan Name" :error-messages="loanErrors.loanName" class="mb-2" />
      <AppTextField v-model="loanForm.lenderName" label="Lender / Bank" :error-messages="loanErrors.lenderName" class="mb-2" />
      <AppSelect
        v-model="loanForm.loanType"
        :items="loanTypeOptions"
        item-title="label"
        item-value="value"
        label="Loan Type"
        :disabled="!!loanEditTarget"
        :hint="loanEditTarget ? 'Loan type cannot be changed after the schedule is generated' : undefined"
        persistent-hint
        class="mb-2"
      />
      <AppSelect v-if="loanForm.loanType === 'VEHICLE_LOAN'" v-model="loanForm.vehicleId" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle" :error-messages="loanErrors.link" class="mb-2" />
      <AppSelect v-if="loanForm.loanType === 'OWNER_LOAN'" v-model="loanForm.capitalPartnerId" :items="partnerOptions" item-title="name" item-value="id" label="Owner / Partner" :error-messages="loanErrors.link" class="mb-2" />
      <div class="d-flex ga-2">
        <AppTextField v-model="loanForm.loanStartDate" type="date" label="Original Loan Start Date" class="mb-2 flex-1-1" />
        <AppTextField v-model.number="loanForm.originalPrincipal" type="number" label="Original Loan Amount" class="mb-2 flex-1-1" />
      </div>
      <div class="d-flex ga-2">
        <AppTextField v-model.number="loanForm.principalAmount" type="number" label="Outstanding on Migration Date" :error-messages="loanErrors.principalAmount" class="mb-2 flex-1-1" />
        <AppTextField v-model.number="loanForm.interestRatePercent" type="number" label="Interest Rate (% p.a.)" class="mb-2 flex-1-1" />
      </div>
      <div class="d-flex ga-2">
        <AppTextField v-model.number="loanForm.tenureMonths" type="number" label="Remaining EMIs" :error-messages="loanErrors.tenureMonths" class="mb-2 flex-1-1" />
        <AppTextField v-model.number="loanForm.emiAmount" type="number" label="EMI Amount" hint="Leave blank to calculate" persistent-hint class="mb-2 flex-1-1" />
      </div>
      <div class="d-flex ga-2">
        <AppTextField v-model="loanForm.firstEmiDate" type="date" label="Next EMI Date" class="mb-2 flex-1-1" />
        <AppSelect v-model="loanForm.fundAccountKey" :items="fundAccountOptions" item-title="label" item-value="key" label="EMI Paid From" :error-messages="loanErrors.fundAccountKey" class="mb-2 flex-1-1" />
      </div>
    </MasterFormDialog>

    <!-- --------------------------------------- opening loan given dialog -->
    <MasterFormDialog
      v-model="loanGivenDialog"
      :title="loanGivenEditTarget ? 'Edit Opening Loan Given' : 'Register Opening Loan Given'"
      :loading="submitting"
      @submit="onSubmitLoanGiven"
    >
      <AppAlert type="info" variant="tonal" density="compact" class="mb-3">
        No Bank or Cash balance is touched by this. The money left before the migration date, so your opening
        balances already account for it — this only records that it is still owed back to you.
      </AppAlert>
      <AppTextField v-model="loanGivenForm.partyName" label="Given To" placeholder="Name of the person or firm" :error-messages="loanGivenErrors.partyName" class="mb-2" />
      <AppTextField v-model="loanGivenForm.partyContact" label="Contact (optional)" class="mb-2" />
      <div class="d-flex ga-2">
        <AppTextField v-model.number="loanGivenForm.amount" type="number" label="Still Owed on Migration Date" :error-messages="loanGivenErrors.amount" class="mb-2 flex-1-1" />
        <AppSelect
          v-model="loanGivenForm.fundAccountKey"
          :items="fundAccountOptions"
          item-title="label"
          item-value="key"
          label="Originally Paid From"
          hint="For reference only — no money moves"
          persistent-hint
          :error-messages="loanGivenErrors.fundAccountKey"
          class="mb-2 flex-1-1"
        />
      </div>
      <div class="d-flex ga-2">
        <AppTextField v-model="loanGivenForm.givenDate" type="date" label="Date Given" :error-messages="loanGivenErrors.givenDate" class="mb-2 flex-1-1" />
        <AppTextField v-model="loanGivenForm.expectedReturnDate" type="date" label="Expected Back (optional)" class="mb-2 flex-1-1" />
      </div>
      <AppTextarea v-model="loanGivenForm.remarks" label="Remarks (optional)" rows="2" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
/**
 * Finance → Opening Balance & Migration.
 *
 * Every figure on this screen is a POSITION on the migration date, never a
 * transaction: no receipt, payment, income or expense is created anywhere
 * here. Opening assets, opening loans and opening loans given are registered
 * in the Asset Register, the Loan Register and the Loans Given register
 * respectively (each flagged as "opening"), so there is one place for each
 * kind of record rather than two.
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useOpeningBalanceStore } from '@/stores/accounts/openingBalance';
import { useAssetCategoryStore } from '@/stores/accounts/vehicleAssets';
import { fixedAssetApi } from '@/services/accounts/vehicleAssets';
import { loanApi } from '@/services/accounts/loans';
import { loanGivenApi } from '@/services/accounts/loansGiven';
import { adminCompanyApi } from '@/services/admin-company.service';
import { useSupplierStore, useVehicleStore } from '@/stores/masters';
import { useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { createMasterApi } from '@/services/masterApiFactory';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency, formatDate } from '@/utils/format';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import OpeningBalanceTable from '@/components/accounts/OpeningBalanceTable.vue';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import {
  AppBtn,
  AppCard,
  AppChip,
  AppAlert,
  AppTable,
  AppTabs,
  AppTab,
  AppWindow,
  AppWindowItem,
  AppSelect,
  AppTextField,
  AppTextarea,
} from '@/components/ui';
import {
  MIGRATION_STATUS_LABELS,
  OPENING_CATEGORY_LABELS,
  type OpeningBalanceCategory,
  type OpeningBalanceEntry,
} from '@/types/openingBalance.types';
import { LOAN_TYPE_LABELS, type Loan, type LoanType } from '@/types/loans.types';
import { LOAN_GIVEN_STATUS_LABELS, type LoanGiven } from '@/types/loansGiven.types';
import type { FixedAsset } from '@/types/phase6.types';

const capitalPartnerApi = createMasterApi<{ id: string; name: string }>('/masters/capital-partners');

const router = useRouter();
const store = useOpeningBalanceStore();
const categoryStore = useAssetCategoryStore();
const supplierStore = useSupplierStore();
const vehicleStore = useVehicleStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

const activeTab = ref('bank-cash');
const submitting = ref(false);
const savingMigration = ref(false);

const migration = computed(() => store.migration);
const summary = computed(() => store.summary);

const statusOptions = [
  { value: 'UNVERIFIED', label: 'Unverified' },
  { value: 'NEEDS_REVIEW', label: 'Needs Review' },
  { value: 'CONFIRMED', label: 'Confirmed' },
];
const classificationOptions = [
  { value: 'CAPITAL', label: 'Capital — stays in the business' },
  { value: 'OWNER_LOAN', label: 'Owner Loan — business owes it back' },
  { value: 'OTHER_LIABILITY', label: 'Other Liability' },
  { value: 'UNCLASSIFIED', label: 'Needs Review — not decided yet' },
];
const loanTypeOptions = (Object.keys(LOAN_TYPE_LABELS) as LoanType[]).map((value) => ({ value, label: LOAN_TYPE_LABELS[value] }));

function statusChipColor(status: string) {
  return ({ CONFIRMED: 'success', NEEDS_REVIEW: 'warning', UNVERIFIED: 'default', RECLASSIFIED: 'info' } as Record<string, string>)[status] || 'default';
}

// ------------------------------------------------------------ master options
const companyOptions = ref<{ id: string; name: string }[]>([]);
const partnerOptions = ref<{ id: string; name: string }[]>([]);
const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const supplierOptions = computed(() => supplierStore.items.map((s: any) => ({ id: s.id, name: s.name })));
const bankOptions = computed(() =>
  bankAccountStore.items.map((b: any) => ({ id: b.id, label: `${b.accountHolderName}${b.bankName ? ` — ${b.bankName}` : ''} (${b.accountNumber})` }))
);
const cashOptions = computed(() => cashAccountStore.items.map((c: any) => ({ id: c.id, label: `${c.cashAccountType} Cash` })));
const fundAccountOptions = computed(() => [
  ...bankOptions.value.map((b) => ({ key: `BANK:${b.id}`, label: `Bank — ${b.label}` })),
  ...cashOptions.value.map((c) => ({ key: `CASH:${c.id}`, label: `Cash — ${c.label}` })),
]);

// ------------------------------------------------------------ migration form
const migrationForm = reactive({
  migrationDate: new Date().toISOString().slice(0, 10),
  previousSystem: 'Tally',
  previousClosingDate: '',
  notes: '',
});

async function onSaveMigration() {
  savingMigration.value = true;
  try {
    await store.saveMigration({
      migrationDate: migrationForm.migrationDate,
      previousSystem: migrationForm.previousSystem || 'Tally',
      previousClosingDate: migrationForm.previousClosingDate || undefined,
      notes: migrationForm.notes || undefined,
    });
    success('Migration details saved');
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save migration details'));
  } finally {
    savingMigration.value = false;
  }
}

async function onFinalize() {
  try {
    await store.finalize();
    success('Opening position finalized — amounts are now locked');
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to finalize the migration'));
  }
}

async function onReopen() {
  try {
    await store.reopen();
    success('Migration reopened');
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reopen the migration'));
  }
}

// ---------------------------------------------------------- opening entries
const entryDialog = ref(false);
const editTarget = ref<OpeningBalanceEntry | null>(null);
const entryForm = reactive({
  category: 'BANK' as OpeningBalanceCategory,
  bankAccountId: '',
  cashAccountId: '',
  companyId: '',
  supplierId: '',
  capitalPartnerId: '',
  label: '',
  amount: undefined as number | undefined,
  classification: 'UNCLASSIFIED',
  status: 'UNVERIFIED',
  source: 'Tally Migration',
  referenceNumber: '',
  referenceDate: '',
  remarks: '',
});
const entryErrors = reactive({ link: '', amount: '' });

const entryDialogTitle = computed(
  () => `${editTarget.value ? 'Edit' : 'Add'} ${OPENING_CATEGORY_LABELS[entryForm.category]}`
);
const amountHint = computed(() =>
  entryForm.category === 'BANK'
    ? 'The account balance starts from here; a negative amount records an overdrawn account.'
    : entryForm.category === 'OTHER_EQUITY'
      ? 'A past accumulated loss can be entered as a negative amount.'
      : 'Balance already outstanding on the migration date.'
);

function resetEntryForm(category: OpeningBalanceCategory) {
  Object.assign(entryForm, {
    category,
    bankAccountId: '',
    cashAccountId: '',
    companyId: '',
    supplierId: '',
    capitalPartnerId: '',
    label: '',
    amount: undefined,
    classification: 'UNCLASSIFIED',
    status: 'UNVERIFIED',
    source: 'Tally Migration',
    referenceNumber: '',
    referenceDate: '',
    remarks: '',
  });
  Object.assign(entryErrors, { link: '', amount: '' });
}

function openEntryDialog(category: OpeningBalanceCategory) {
  editTarget.value = null;
  resetEntryForm(category);
  entryDialog.value = true;
}

function openEditEntry(entry: OpeningBalanceEntry) {
  editTarget.value = entry;
  resetEntryForm(entry.category);
  Object.assign(entryForm, {
    bankAccountId: entry.bankAccountId || '',
    cashAccountId: entry.cashAccountId || '',
    companyId: entry.companyId || '',
    supplierId: entry.supplierId || '',
    capitalPartnerId: entry.capitalPartnerId || '',
    label: entry.label || '',
    amount: entry.amount,
    classification: entry.classification || 'UNCLASSIFIED',
    status: entry.status,
    source: entry.source,
    referenceNumber: entry.referenceNumber || '',
    referenceDate: entry.referenceDate ? String(entry.referenceDate).slice(0, 10) : '',
    remarks: entry.remarks || '',
  });
  entryDialog.value = true;
}

function linkValue() {
  switch (entryForm.category) {
    case 'BANK':
      return entryForm.bankAccountId;
    case 'CASH':
      return entryForm.cashAccountId;
    case 'RECEIVABLE':
      return entryForm.companyId;
    case 'PAYABLE':
      return entryForm.supplierId;
    case 'OWNER_FUNDS':
      return entryForm.capitalPartnerId;
    default:
      return entryForm.label;
  }
}

async function onSubmitEntry() {
  entryErrors.link = linkValue() ? '' : 'This field is required';
  // A bank account can be overdrawn and past equity can be a loss, so those
  // two are the only places a negative opening amount makes sense.
  const signed = entryForm.category === 'BANK' || entryForm.category === 'OTHER_EQUITY';
  entryErrors.amount = entryForm.amount && (signed || entryForm.amount > 0) ? '' : 'Enter an amount';
  if (entryErrors.link || entryErrors.amount) return;

  submitting.value = true;
  try {
    if (editTarget.value) {
      await store.update(editTarget.value.id, {
        amount: entryForm.amount,
        label: entryForm.label || null,
        classification: entryForm.category === 'OWNER_FUNDS' ? entryForm.classification : undefined,
        status: entryForm.status,
        source: entryForm.source,
        referenceNumber: entryForm.referenceNumber || null,
        referenceDate: entryForm.referenceDate || null,
        remarks: entryForm.remarks || null,
      });
      success('Opening balance updated');
    } else {
      await store.create({
        category: entryForm.category,
        amount: entryForm.amount,
        bankAccountId: entryForm.bankAccountId || undefined,
        cashAccountId: entryForm.cashAccountId || undefined,
        companyId: entryForm.companyId || undefined,
        supplierId: entryForm.supplierId || undefined,
        capitalPartnerId: entryForm.capitalPartnerId || undefined,
        label: entryForm.label || undefined,
        classification: entryForm.category === 'OWNER_FUNDS' ? entryForm.classification : undefined,
        status: entryForm.status,
        source: entryForm.source || undefined,
        referenceNumber: entryForm.referenceNumber || undefined,
        referenceDate: entryForm.referenceDate || undefined,
        remarks: entryForm.remarks || undefined,
      });
      success('Opening balance recorded');
    }
    entryDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save the opening balance'));
  } finally {
    submitting.value = false;
  }
}

async function onRemoveEntry(entry: OpeningBalanceEntry) {
  try {
    await store.remove(entry.id);
    success('Opening balance deleted');
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete the opening balance'));
  }
}

async function onConfirmEntry(entry: OpeningBalanceEntry) {
  try {
    await store.setStatus(entry.id, entry.status === 'CONFIRMED' ? 'NEEDS_REVIEW' : 'CONFIRMED');
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update the status'));
  }
}

// ----------------------------------------------------------- reclassifying
const reclassifyDialog = ref(false);
const reclassifyTarget = ref<OpeningBalanceEntry | null>(null);
const reclassifyForm = reactive({ classification: 'CAPITAL', remarks: '' });

function openReclassifyDialog(entry: OpeningBalanceEntry) {
  reclassifyTarget.value = entry;
  reclassifyForm.classification = entry.classification || 'UNCLASSIFIED';
  reclassifyForm.remarks = entry.remarks || '';
  reclassifyDialog.value = true;
}

async function onSubmitReclassify() {
  if (!reclassifyTarget.value) return;
  submitting.value = true;
  try {
    await store.reclassify(reclassifyTarget.value.id, {
      classification: reclassifyForm.classification,
      remarks: reclassifyForm.remarks || undefined,
    });
    success('Owner funds reclassified');
    reclassifyDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reclassify'));
  } finally {
    submitting.value = false;
  }
}

// --------------------------------------------------------- opening assets
const openingAssets = ref<FixedAsset[]>([]);
const assetDialog = ref(false);
const assetEditTarget = ref<FixedAsset | null>(null);
const assetForm = reactive({
  assetName: '',
  categoryId: '',
  vehicleId: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  purchaseValue: undefined as number | undefined,
  accumulatedDepreciation: undefined as number | undefined,
  openingDate: new Date().toISOString().slice(0, 10),
  migrationStatus: 'UNVERIFIED',
});
const assetErrors = reactive({ assetName: '', categoryId: '', purchaseValue: '' });
const assetBookValue = computed(() =>
  Math.max(Math.round(((assetForm.purchaseValue || 0) - (assetForm.accumulatedDepreciation || 0)) * 100) / 100, 0)
);

function openAssetDialog(asset?: FixedAsset) {
  assetEditTarget.value = asset ?? null;
  const migrationDate = migration.value ? String(migration.value.migrationDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
  Object.assign(
    assetForm,
    asset
      ? {
          assetName: asset.assetName,
          categoryId: asset.category?.id || '',
          vehicleId: asset.vehicle?.id || '',
          purchaseDate: String(asset.purchaseDate).slice(0, 10),
          purchaseValue: asset.purchaseValue,
          accumulatedDepreciation: asset.accumulatedDepreciation,
          openingDate: String(asset.openingDate || asset.purchaseDate).slice(0, 10),
          migrationStatus: asset.migrationStatus || 'UNVERIFIED',
        }
      : {
          assetName: '',
          categoryId: '',
          vehicleId: '',
          purchaseDate: migrationDate,
          purchaseValue: undefined,
          accumulatedDepreciation: undefined,
          openingDate: migrationDate,
          migrationStatus: 'UNVERIFIED',
        }
  );
  Object.assign(assetErrors, { assetName: '', categoryId: '', purchaseValue: '' });
  assetDialog.value = true;
}

async function onSubmitAsset() {
  assetErrors.assetName = assetForm.assetName ? '' : 'Asset name is required';
  assetErrors.categoryId = assetForm.categoryId ? '' : 'Category is required';
  assetErrors.purchaseValue = assetForm.purchaseValue && assetForm.purchaseValue > 0 ? '' : 'Original cost must be greater than 0';
  if (assetErrors.assetName || assetErrors.categoryId || assetErrors.purchaseValue) return;

  submitting.value = true;
  try {
    const payload = {
      assetName: assetForm.assetName,
      categoryId: assetForm.categoryId,
      vehicleId: assetForm.vehicleId || null,
      purchaseDate: assetForm.purchaseDate,
      purchaseValue: assetForm.purchaseValue,
      accumulatedDepreciation: assetForm.accumulatedDepreciation || 0,
      openingDate: assetForm.openingDate,
      migrationSource: migration.value?.previousSystem ? `${migration.value.previousSystem} Migration` : 'Tally Migration',
      migrationStatus: assetForm.migrationStatus,
    };
    if (assetEditTarget.value) {
      await fixedAssetApi.update(assetEditTarget.value.id, payload);
      success('Opening asset updated');
    } else {
      // assetOrigin is only meaningful at registration — an opening asset
      // never becomes a purchase made through this system.
      await fixedAssetApi.register({ ...payload, vehicleId: assetForm.vehicleId || undefined, assetOrigin: 'OPENING' });
      success('Opening asset registered — no payment was recorded');
    }
    assetDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, assetEditTarget.value ? 'Failed to update the opening asset' : 'Failed to register the opening asset'));
  } finally {
    submitting.value = false;
  }
}

async function onRemoveAsset(asset: FixedAsset) {
  try {
    await fixedAssetApi.remove(asset.id);
    success('Opening asset deleted');
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete the opening asset'));
  }
}

// ---------------------------------------------------------- opening loans
const openingLoans = ref<Loan[]>([]);
const loanDialog = ref(false);
const loanEditTarget = ref<Loan | null>(null);
const loanForm = reactive({
  loanName: '',
  lenderName: '',
  loanType: 'VEHICLE_LOAN' as LoanType,
  vehicleId: '',
  capitalPartnerId: '',
  loanStartDate: new Date().toISOString().slice(0, 10),
  originalPrincipal: undefined as number | undefined,
  principalAmount: undefined as number | undefined,
  interestRatePercent: undefined as number | undefined,
  tenureMonths: undefined as number | undefined,
  emiAmount: undefined as number | undefined,
  firstEmiDate: '',
  fundAccountKey: '',
});
const loanErrors = reactive({ loanName: '', lenderName: '', link: '', principalAmount: '', tenureMonths: '', fundAccountKey: '' });

function openLoanDialog(loan?: Loan) {
  loanEditTarget.value = loan ?? null;
  Object.assign(
    loanForm,
    loan
      ? {
          loanName: loan.loanName,
          lenderName: loan.lenderName,
          loanType: loan.loanType,
          vehicleId: loan.vehicle?.id || '',
          capitalPartnerId: loan.capitalPartner?.id || '',
          loanStartDate: String(loan.loanStartDate).slice(0, 10),
          originalPrincipal: loan.originalPrincipal ?? undefined,
          principalAmount: loan.principalAmount,
          interestRatePercent: loan.interestRatePercent,
          // The remaining EMIs, not the original tenure — the schedule this
          // loan was brought in with only ever covers what is left.
          tenureMonths: loan.tenureMonths,
          emiAmount: loan.emiAmount,
          firstEmiDate: String(loan.firstEmiDate).slice(0, 10),
          fundAccountKey: `${loan.fundAccountType}:${loan.fundAccountId}`,
        }
      : {
          loanName: '',
          lenderName: '',
          loanType: 'VEHICLE_LOAN',
          vehicleId: '',
          capitalPartnerId: '',
          loanStartDate: new Date().toISOString().slice(0, 10),
          originalPrincipal: undefined,
          principalAmount: undefined,
          interestRatePercent: undefined,
          tenureMonths: undefined,
          emiAmount: undefined,
          firstEmiDate: '',
          fundAccountKey: '',
        }
  );
  Object.assign(loanErrors, { loanName: '', lenderName: '', link: '', principalAmount: '', tenureMonths: '', fundAccountKey: '' });
  loanDialog.value = true;
}

async function onSubmitLoan() {
  loanErrors.loanName = loanForm.loanName ? '' : 'Loan name is required';
  loanErrors.lenderName = loanForm.lenderName ? '' : 'Lender is required';
  loanErrors.link =
    loanForm.loanType === 'VEHICLE_LOAN' && !loanForm.vehicleId
      ? 'A vehicle loan must be linked to a vehicle'
      : loanForm.loanType === 'OWNER_LOAN' && !loanForm.capitalPartnerId
        ? 'An owner loan must be linked to an owner / partner'
        : '';
  loanErrors.principalAmount = loanForm.principalAmount && loanForm.principalAmount > 0 ? '' : 'Enter what is still owed';
  loanErrors.tenureMonths = loanForm.tenureMonths && loanForm.tenureMonths > 0 ? '' : 'Enter how many EMIs are left';
  loanErrors.fundAccountKey = loanForm.fundAccountKey ? '' : 'Choose the account EMIs are paid from';
  if (Object.values(loanErrors).some(Boolean)) return;

  const [fundAccountType, fundAccountId] = loanForm.fundAccountKey.split(':');
  submitting.value = true;
  try {
    if (loanEditTarget.value) {
      // A money term is sent only when it actually changed: the server
      // regenerates the remaining schedule whenever one arrives, and refuses
      // once an EMI has been paid — which must not block a name-only fix.
      const target = loanEditTarget.value;
      const changed = <T>(value: T, current: T) => (value === current ? undefined : value);
      const money = {
        principalAmount: changed(loanForm.principalAmount, target.principalAmount),
        interestRatePercent: changed(loanForm.interestRatePercent || 0, target.interestRatePercent),
        tenureMonths: changed(loanForm.tenureMonths, target.tenureMonths),
        // A cleared EMI is not a change to send — it means "recalculate it",
        // which is what the server does when the other terms move.
        emiAmount: changed(loanForm.emiAmount || undefined, target.emiAmount),
        firstEmiDate: changed(loanForm.firstEmiDate, String(target.firstEmiDate).slice(0, 10)),
      };
      const rescheduling = Object.values(money).some((v) => v !== undefined);

      await loanApi.update(target.id, {
        loanName: loanForm.loanName,
        lenderName: loanForm.lenderName,
        vehicleId: loanForm.loanType === 'VEHICLE_LOAN' ? loanForm.vehicleId : null,
        capitalPartnerId: loanForm.loanType === 'OWNER_LOAN' ? loanForm.capitalPartnerId : null,
        loanStartDate: changed(loanForm.loanStartDate, String(target.loanStartDate).slice(0, 10)),
        ...money,
        fundAccountType,
        fundAccountId,
        originalPrincipal: changed(loanForm.originalPrincipal || undefined, target.originalPrincipal ?? undefined),
      });
      success(rescheduling ? 'Opening loan updated — its remaining EMI schedule was regenerated' : 'Opening loan updated');
    } else {
      await loanApi.create({
        loanName: loanForm.loanName,
        lenderName: loanForm.lenderName,
        loanType: loanForm.loanType,
        vehicleId: loanForm.loanType === 'VEHICLE_LOAN' ? loanForm.vehicleId : undefined,
        capitalPartnerId: loanForm.loanType === 'OWNER_LOAN' ? loanForm.capitalPartnerId : undefined,
        loanStartDate: loanForm.loanStartDate,
        principalAmount: loanForm.principalAmount,
        interestRatePercent: loanForm.interestRatePercent ?? 0,
        tenureMonths: loanForm.tenureMonths,
        emiAmount: loanForm.emiAmount || undefined,
        firstEmiDate: loanForm.firstEmiDate || loanForm.loanStartDate,
        fundAccountType,
        fundAccountId,
        origin: 'OPENING',
        originalPrincipal: loanForm.originalPrincipal || undefined,
        openingAsOfDate: migration.value ? String(migration.value.migrationDate).slice(0, 10) : undefined,
      });
      success('Opening loan registered with its remaining EMI schedule');
    }
    loanDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, loanEditTarget.value ? 'Failed to update the opening loan' : 'Failed to register the opening loan'));
  } finally {
    submitting.value = false;
  }
}

async function onRemoveLoan(loan: Loan) {
  try {
    await loanApi.remove(loan.id);
    success('Opening loan deleted');
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete the opening loan'));
  }
}

// ---------------------------------------------------- opening loans given
// Money already lent out at migration. Registered against the real Loans
// Given register with origin=OPENING — not as an OTHER_ASSET row — so it
// keeps repayment tracking and write-off, and appears on the Balance Sheet's
// own "Loans Given" line rather than as a static opening figure.
const openingLoansGiven = ref<LoanGiven[]>([]);
const loanGivenDialog = ref(false);
const loanGivenEditTarget = ref<LoanGiven | null>(null);
const loanGivenForm = reactive({
  partyName: '',
  partyContact: '',
  amount: undefined as number | undefined,
  givenDate: '',
  expectedReturnDate: '',
  fundAccountKey: '',
  remarks: '',
});
const loanGivenErrors = reactive({ partyName: '', amount: '', givenDate: '', fundAccountKey: '' });

function openLoanGivenDialog(loan?: LoanGiven) {
  loanGivenEditTarget.value = loan ?? null;
  Object.assign(
    loanGivenForm,
    loan
      ? {
          partyName: loan.partyName,
          partyContact: loan.partyContact || '',
          amount: loan.amount,
          givenDate: String(loan.givenDate).slice(0, 10),
          expectedReturnDate: loan.expectedReturnDate ? String(loan.expectedReturnDate).slice(0, 10) : '',
          fundAccountKey: `${loan.fundAccountType}:${loan.fundAccountId}`,
          remarks: loan.remarks || '',
        }
      : {
          partyName: '',
          partyContact: '',
          amount: undefined,
          // The money went out on or before the migration date, so that is the
          // sensible starting point rather than today.
          givenDate: migration.value ? String(migration.value.migrationDate).slice(0, 10) : '',
          expectedReturnDate: '',
          fundAccountKey: '',
          remarks: '',
        }
  );
  Object.assign(loanGivenErrors, { partyName: '', amount: '', givenDate: '', fundAccountKey: '' });
  loanGivenDialog.value = true;
}

async function onSubmitLoanGiven() {
  loanGivenErrors.partyName = loanGivenForm.partyName.trim() ? '' : 'Who the money was given to is required';
  loanGivenErrors.amount = loanGivenForm.amount && loanGivenForm.amount > 0 ? '' : 'Enter what is still owed';
  loanGivenErrors.givenDate = loanGivenForm.givenDate ? '' : 'Enter the date the money was given';
  loanGivenErrors.fundAccountKey = loanGivenForm.fundAccountKey ? '' : 'Choose the account it originally came from';
  if (Object.values(loanGivenErrors).some(Boolean)) return;

  const [fundAccountType, fundAccountId] = loanGivenForm.fundAccountKey.split(':');
  submitting.value = true;
  try {
    if (loanGivenEditTarget.value) {
      await loanGivenApi.update(loanGivenEditTarget.value.id, {
        partyName: loanGivenForm.partyName.trim(),
        partyContact: loanGivenForm.partyContact.trim() || null,
        amount: loanGivenForm.amount,
        givenDate: loanGivenForm.givenDate,
        expectedReturnDate: loanGivenForm.expectedReturnDate || null,
        fundAccountType,
        fundAccountId,
        remarks: loanGivenForm.remarks.trim() || null,
      });
      success('Opening loan given updated');
    } else {
      await loanGivenApi.create({
        partyName: loanGivenForm.partyName.trim(),
        partyContact: loanGivenForm.partyContact.trim() || undefined,
        amount: loanGivenForm.amount,
        givenDate: loanGivenForm.givenDate,
        expectedReturnDate: loanGivenForm.expectedReturnDate || undefined,
        fundAccountType,
        fundAccountId,
        origin: 'OPENING',
        openingAsOfDate: migration.value ? String(migration.value.migrationDate).slice(0, 10) : undefined,
        remarks: loanGivenForm.remarks.trim() || undefined,
      });
      success('Opening loan given registered — no account was debited');
    }
    loanGivenDialog.value = false;
    await reload();
  } catch (err) {
    error(
      extractErrorMessage(
        err,
        loanGivenEditTarget.value ? 'Failed to update the opening loan given' : 'Failed to register the opening loan given'
      )
    );
  } finally {
    submitting.value = false;
  }
}

async function onRemoveLoanGiven(loan: LoanGiven) {
  try {
    await loanGivenApi.remove(loan.id);
    success('Opening loan given deleted');
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete the opening loan given'));
  }
}

// -------------------------------------------------------------------- load
async function loadRegisters() {
  const [assets, loans, loansGiven] = await Promise.all([
    fixedAssetApi.list({ assetOrigin: 'OPENING', pageSize: 200 }),
    loanApi.list({ origin: 'OPENING', pageSize: 200 }),
    loanGivenApi.list({ origin: 'OPENING', pageSize: 200 }),
  ]);
  openingAssets.value = assets.data.data;
  openingLoans.value = loans.data.data;
  openingLoansGiven.value = loansGiven.data.data;
}

async function reload() {
  await Promise.all([store.fetchAll(), loadRegisters()]);
  if (store.migration) {
    migrationForm.migrationDate = String(store.migration.migrationDate).slice(0, 10);
    migrationForm.previousSystem = store.migration.previousSystem;
    migrationForm.previousClosingDate = store.migration.previousClosingDate
      ? String(store.migration.previousClosingDate).slice(0, 10)
      : '';
    migrationForm.notes = store.migration.notes || '';
  }
}

onMounted(async () => {
  await Promise.all([
    reload(),
    categoryStore.fetchList(),
    supplierStore.fetchList({ pageSize: 200 }),
    vehicleStore.fetchList({ pageSize: 200 }),
    bankAccountStore.fetchList({ pageSize: 200 }),
    cashAccountStore.fetchList({ pageSize: 200 }),
    adminCompanyApi
      .list({ pageSize: 200 })
      .then((res) => {
        companyOptions.value = (res.data.data as any[]).map((c) => ({ id: c.id, name: c.name }));
      })
      .catch(() => undefined),
    capitalPartnerApi
      .list({ pageSize: 200 })
      .then((res) => {
        partnerOptions.value = (res.data.data as any[]).map((p) => ({ id: p.id, name: p.name }));
      })
      .catch(() => undefined),
  ]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
.bs-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.bs-row:last-child {
  border-bottom: none;
}
</style>

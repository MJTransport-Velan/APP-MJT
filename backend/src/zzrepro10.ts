interface FullInstallment { id: string; recoveredReferenceId: string | null; }
interface Base {
  id: string;
  borrowerId: string;
  disbursementVoucherId: string | null;
  installments: FullInstallment[];
  [key: string]: unknown;
}

function mapLoan<T extends Base>(r: T, driverById: Map<string, { id: string; name: string }>) {
  return {
    ...r,
    driver: driverById.get(r.borrowerId)!,
    installments: r.installments.map((i) => ({ ...i, recoveredSettlementId: i.recoveredReferenceId })),
  };
}

async function attachRelations<T extends Base>(row: T): Promise<ReturnType<typeof mapLoan<T>>>;
async function attachRelations<T extends Base>(rows: T[]): Promise<ReturnType<typeof mapLoan<T>>[]>;
async function attachRelations<T extends Base>(rowOrRows: T | T[]) {
  const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
  const driverById = new Map<string, { id: string; name: string }>();
  const merged = rows.map((r) => mapLoan(r, driverById));
  return Array.isArray(rowOrRows) ? merged : merged[0];
}

async function find(id: string): Promise<Base | null> {
  return null;
}

async function repo(id: string) {
  const loan = await find(id);
  return loan ? attachRelations(loan) : null;
}

type Result = NonNullable<Awaited<ReturnType<typeof repo>>>;

const x: Result = {} as any;
x.installments[0].recoveredSettlementId;

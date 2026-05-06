import { prisma } from "../lib/prisma";

export type PackageRule = {
  id: string;
  name: string;
  maxFileSizeMb: number;
  price: number;
  isActive: boolean;
};

const DEFAULT_PACKAGE_RULES: Array<Omit<PackageRule, "id" | "isActive">> = [
  { name: "PDF <= 3 MB", maxFileSizeMb: 3, price: 8000 },
  { name: "PDF <= 5 MB", maxFileSizeMb: 5, price: 10000 },
  { name: "PDF <= 10 MB", maxFileSizeMb: 10, price: 12000 }
];

export async function ensureDefaultPackages() {
  const count = await prisma.package.count();
  if (count > 0) {
    return;
  }

  await prisma.package.createMany({
    data: DEFAULT_PACKAGE_RULES.map((item) => ({
      name: item.name,
      maxFileSizeMb: item.maxFileSizeMb,
      price: item.price,
      isActive: true
    }))
  });
}

export async function listPackages(options?: { activeOnly?: boolean }) {
  await ensureDefaultPackages();

  return prisma.package.findMany({
    where: options?.activeOnly ? { isActive: true } : undefined,
    orderBy: { maxFileSizeMb: "asc" }
  });
}

export async function resolvePackageByFileSize(fileSizeBytes: number) {
  const fileSizeMb = fileSizeBytes / (1024 * 1024);
  const packages = await listPackages({ activeOnly: true });
  const matched = packages.find((item) => fileSizeMb <= item.maxFileSizeMb);

  if (!matched) {
    throw new Error("Ukuran file melebihi batas maksimum 10 MB sesuai ketentuan API checker.");
  }

  return {
    id: matched.id,
    name: matched.name,
    maxFileSizeMb: matched.maxFileSizeMb,
    price: matched.price,
    isActive: matched.isActive
  } satisfies PackageRule;
}

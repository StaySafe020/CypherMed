import prisma from "../prisma";

/** Provider roles a wallet can register with (POST /api/auth/provider). Every other wallet is a patient. */
export const PROVIDER_ROLES = [
  "doctor",
  "nurse",
  "hospital_admin",
  "insurer",
] as const;

export type ProviderRole = (typeof PROVIDER_ROLES)[number];

export function isProviderRole(role: unknown): role is ProviderRole {
  return (
    typeof role === "string" &&
    (PROVIDER_ROLES as readonly string[]).includes(role)
  );
}

/** The provider registration of a wallet (role and verification status), or null for a patient. */
export async function providerOf(
  wallet: string
): Promise<{ role: string; verificationStatus: string } | null> {
  return prisma.provider.findUnique({
    where: { wallet },
    select: { role: true, verificationStatus: true },
  });
}

/** The role the server has on record for a wallet: its provider role, or "patient". */
export async function roleOf(wallet: string): Promise<string> {
  const provider = await prisma.provider.findUnique({
    where: { wallet },
    select: { role: true },
  });
  return provider?.role ?? "patient";
}

import { prisma } from "@/lib/db";

export async function getCurrentUser() {
  const user = await prisma.user.findFirstOrThrow();
  return user;
}

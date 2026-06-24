import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ADMIN_PASSWORD, USER_SEED_DATA } from "./users-data";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  let created = 0;
  let updated = 0;

  for (const user of USER_SEED_DATA) {
    const existing = await prisma.user.findUnique({
      where: { prontuario: user.prontuario },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: user.name,
          role: user.role,
          passwordHash:
            user.role === "ADMIN"
              ? existing.passwordHash ?? adminHash
              : null,
        },
      });
      updated += 1;
      continue;
    }

    await prisma.user.create({
      data: {
        prontuario: user.prontuario,
        name: user.name,
        role: user.role,
        passwordHash: user.role === "ADMIN" ? adminHash : null,
      },
    });
    created += 1;
  }

  console.log(`Importação concluída: ${created} criados, ${updated} atualizados.`);
  console.log(`Total na lista: ${USER_SEED_DATA.length}`);
  console.log(`Senha inicial dos novos administradores: ${DEFAULT_ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

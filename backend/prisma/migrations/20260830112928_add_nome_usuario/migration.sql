/*
  Warnings:

  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable

-- Adiciona a coluna com um valor padrão temporário para preencher os registros antigos
ALTER TABLE "User" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Usuário';

-- (Opcional) Remove o default para que novas criações via app sejam obrigadas a enviar o nome
ALTER TABLE "User" ALTER COLUMN "name" DROP DEFAULT;
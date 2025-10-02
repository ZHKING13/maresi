# Copilot Instructions for AI Coding Agents

## Aperçu de l'architecture

- Ce projet est un backend NestJS modulaire avec Prisma (ORM) et PostgreSQL.
- Les modules principaux sont dans `src/`, chaque domaine (auth, user, post, minio, etc.) a son propre dossier avec `module`, `service`, `controller` et parfois `client`.
- Les dossiers préfixés par `_` (ex: `_config`, `_decorators`, `_guards`, `_middlewares`, `_paths`, `_utils`, `_validators`) contiennent des utilitaires globaux, des décorateurs, des middlewares, des guards, des constantes, etc. Ils ne sont pas des modules NestJS standards.
- La validation des schémas se fait avec Zod (voir `_validators/`).
- L'authentification utilise JWT (access/refresh) et PassportJS, avec gestion des rôles (RBAC).
- Prisma gère la base de données, les schémas sont dans `prisma/schema.prisma` et les seeds dans `prisma/seed/`.

## Workflows de développement

- **Installation** : `pnpm install`
- **Migration DB** : `pnpm db:migrate` (voir scripts dans `package.json`)
- **Seed DB** : `pnpm db:seed`
- **Démarrage** : `pnpm start:dev`
- **Docs locales** : `pnpm dlx @compodoc/compodoc -p tsconfig.json -s`
- **Docker** : `docker-compose up -d` puis `docker-compose exec app pnpm prisma migrate deploy`

## Conventions spécifiques

- Préfixer tout dossier utilitaire non-module par `_` pour la clarté visuelle.
- Les endpoints publics/privés sont gérés par des décorateurs personnalisés dans `_decorators/setters/`.
- Les guards d'accès (RBAC) sont dans `_guards/roles.guard.ts`.
- Les middlewares globaux sont dans `_middlewares/`.
- Les routes sont centralisées dans `_paths/`.
- Les seeds de données sont organisés par domaine dans `prisma/seed/data/`.
- Les tests end-to-end sont dans `test/`.

## Points d'intégration et dépendances

- **Prisma** : configuration dans `prisma/`, migrations dans `prisma/migrations/`.
- **Email** : service Resend, voir `src/email/`.
- **Stockage** : Minio, voir `src/minio/`.
- **Validation** : Zod, voir `_validators/`.
- **Swagger** : documentation API sur `/doc`.

## Exemples de patterns

- Pour ajouter un endpoint : créer un controller dans le module concerné, ajouter les routes dans `_paths/`, utiliser les décorateurs d'accès.
- Pour ajouter une validation : créer un schéma Zod dans `_validators/` et l'utiliser dans le DTO.
- Pour ajouter un seed : placer les données dans `prisma/seed/data/` et référencer dans le script de seed.

## Références clés

- `README.md` : instructions d'installation, usage, Docker, architecture.
- `prisma/schema.prisma` : schéma de la base de données.
- `src/_config/` : configuration globale (environnements, constantes).
- `src/_decorators/`, `src/_guards/`, `src/_middlewares/` : patterns transverses.
- `src/auth/`, `src/user/`, `src/post/` : modules métier principaux.

---

Adaptez-vous aux conventions de ce starter kit. Si un pattern n'est pas documenté ici, cherchez un exemple dans le code existant avant d'inventer une nouvelle approche.

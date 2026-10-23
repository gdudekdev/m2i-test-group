Gauthier Dudek Matheo Leonard EIDAL 26/28

# Extra Time - Séances de tirs au but

API REST qui enregistre des séances de tirs au but et diffuse leur déroulé en direct aux plateformes partenaires.

## L'IA dans ce projet, en bref

**Un outil d'écriture, pas un conseiller.** Nous avons utilisé l'IA générative comme un moyen d'écrire plus vite, pas comme un assistant qui nous dit quoi faire :
- **Architecture** : nous l'avons décidée avant de la confier à l'outil, puis imposée étape par étape (DDD, séparation CQRS, ports et adapters, découpage en modules, rangement des cas d'usage, conventions de nommage, stratégie de test).
- **Contrôle** : nous avons relu chaque résultat et fait corriger tout ce qui s'écartait de la structure voulue.

**Ce que l'IA nous a apporté.** Elle nous a permis de remplir le contrat du projet plus vite : les routes, les tests et le parcours Bruno. Elle n'a pas orienté nos décisions d'architecture. Les quelques suggestions retenues sont des ajustements à l'intérieur du cadre que nous avions fixé, et aucune ne remet en cause l'architecture choisie. Elles sont listées dans la section « Usage de l'IA générative ».

**Pourquoi cette architecture.** Notre objectif était d'être aussi efficaces que possible pour les tests. Pour cela, chaque composant devait pouvoir être testé indépendamment des autres, ce que permet l'inversion de dépendances du pattern repository : le domaine et les handlers ne dépendent que d'interfaces. Le détail est donné dans la section Architecture.

## Démarrage

Prérequis : [Bun](https://bun.sh) 1.4.3 ou plus.

```bash
bun install
bun run db:migrate
bun run start
```

L'API écoute sur http://localhost:3000. L'interface spectateur est servie à la même adresse.

Avec Docker : `docker compose up --build`. Le conteneur applique les migrations avant chaque démarrage.

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT` | Port HTTP de l'API | `3000` |
| `DATABASE_PATH` | Fichier SQLite | `./extra-time.sqlite` |

Les variables sont décrites dans `.env.example`.

## Commandes

| Action | Commande |
|---|---|
| Démarrer l'API | `bun run start` |
| Initialiser ou migrer le stockage (idempotent) | `bun run db:migrate` |
| Lancer les tests | `bun test` |
| Lancer le parcours API (API démarrée) | `bun run test:api` |
| Vérifier les types | `bun run typecheck` |

## Interface spectateur

Ouvrir http://localhost:3000/?id=<identifiant de séance>. La page s'abonne au flux SSE et affiche, en direct :

- le score et les drapeaux des équipes ;
- l'équipe attendue ;
- la grille des tirs, réglementaires puis en mort subite ;
- le déroulé des tirs ;
- le vainqueur à la fin.

## API

| Route | Rôle | Réponses |
|---|---|---|
| `GET /health` | Disponibilité du service | `200` |
| `POST /shootouts` | Créer une séance | `201` + `Location`, `400` |
| `GET /shootouts/:id` | Consulter une séance | `200`, `404` |
| `POST /shootouts/:id/shots` | Enregistrer un tir | `201`, `400`, `404`, `409` |
| `GET /shootouts/:id/events` | Flux SSE des mises à jour | `200` `text/event-stream`, `404` |

Les erreurs suivent le format `{ "error": { "code": "...", "message": "..." } }`.

| Code | Statut | Cas |
|---|---|---|
| `INVALID_REQUEST` | 400 | Corps mal formé ou valeur hors contrat |
| `NOT_FOUND` | 404 | Route inconnue |
| `SHOOTOUT_NOT_FOUND` | 404 | Séance inconnue |
| `VERSION_CONFLICT` | 409 | `expectedVersion` différente de la version courante |
| `SHOOTOUT_FINISHED` | 409 | Tir sur une séance terminée |
| `DUPLICATE_SHOT` | 409 | `clientShotId` déjà enregistré pour la séance |
| `NOT_TEAM_TURN` | 409 | L'équipe qui tire n'est pas celle attendue |

## Règles métier retenues

- **Déroulé** : les équipes tirent en alternance. L'équipe qui commence est choisie à la création.
- **Résultats d'un tir** : `GOAL` est le seul résultat qui compte. `MISS`, `SAVED`, `POST` et `CROSSBAR` sont des échecs.
- **Séance réglementaire** : 5 tirs par équipe. La séance s'arrête dès que l'écart ne peut plus être comblé avec les tirs restants.
- **Mort subite** : en cas d'égalité après 5 tirs chacun, la séance continue. Elle n'est décidée qu'après le même nombre de tirs pour les deux équipes.
- **Ordre de vérification des refus** :
  1. séance inconnue ;
  2. version attendue ;
  3. séance terminée ;
  4. `clientShotId` déjà utilisé ;
  5. équipe attendue.
- **Écritures concurrentes** : `expectedVersion` est vérifiée deux fois, avant l'application des règles puis au moment de l'écriture (`UPDATE … WHERE version = ?`). Deux écritures fondées sur la même version ne peuvent donc pas être acceptées toutes les deux.
- **Atomicité** : un tir accepté est persisté en une seule transaction. Un refus ne laisse aucune écriture, et les événements SSE ne sont publiés qu'après la persistance.

**Hypothèses à valider avec l'expert métier** : nous avons repris les règles IFAB standard. Les codes de refus, leur ordre de priorité et le traitement d'un `clientShotId` renvoyé deux fois (refus en 409 plutôt que réponse idempotente) sont des choix provisoires. Ils doivent encore être confirmés au registre des décisions.

## Architecture

Le code est organisé par module métier, en DDD, avec une séparation CQRS entre écriture et lecture et une architecture ports / adapters.

```
src/
├── modules/shootout/
│   ├── domain/              agrégat Shootout, règles IFAB, value objects, types, événements, erreurs métier,
│   │                        interface du repository (domain/repositories/)
│   ├── application/
│   │   ├── commands/        createShootout/, recordShot/      (command + command-handler)
│   │   ├── queries/         getShootout/ (query + query-handler), modèle de lecture ShootoutView
│   │   │                    et interface du repository de lecture
│   │   └── errors.ts        erreurs applicatives (conflit de version)
│   ├── ports/               ports techniques (EventPublisher)
│   ├── adapters/
│   │   ├── typeorm/         implémentations TypeORM des repositories, entités, mapper
│   │   └── sse/             publication des événements vers le flux SSE
│   ├── http/
│   │   ├── commands/        createShootout/, recordShot/      (controller)
│   │   ├── queries/         getShootout/, getShootoutEvents/  (controller)
│   │   └── shootout.routes.ts
│   ├── _test/
│   │   ├── domain/          tests unitaires du domaine
│   │   ├── application/     tests des command et query handlers, sur stubs
│   │   ├── integration/     tests d'intégration de l'API sur une vraie base SQLite
│   │   ├── fixtures/        séances, commandes et banc d'intégration (givenApi)
│   │   └── stubs/           stubs des ports et application de test (given)
│   └── shootout.module.ts   assemblage du module
├── shared/                  erreurs de base, interfaces CQRS, ports communs, persistance, socle HTTP
└── sse/                     composant SSE fourni, avec ses tests dans _test/
```

**Flux d'une écriture** : `Controller (http) → Command → CommandHandler (application) → Repository (interface du domaine) → TypeOrmRepository (adapter)`. Une lecture suit le même chemin avec une `Query`, un `QueryHandler` et le repository de lecture.

**Sens des dépendances** :
- **Domaine** : il ne dépend de rien d'autre, ni des autres couches, ni de TypeORM, Hono ou Zod.
- **Application** : elle ne dépend que du domaine et des ports.
- **`http/`** : il dépend de l'application. Les cas d'usage ne connaissent pas le transport et pourraient être appelés depuis une autre entrée qu'HTTP.
- **`adapters/`** : ils implémentent les interfaces du domaine et de l'application. Rien ne dépend d'eux, sauf l'assemblage du module.
- **Erreurs** : le domaine lève des erreurs métier (`INVALID_VALUE`, `NOT_TEAM_TURN`, …), et c'est `toHttpError` qui les traduit en statuts et en codes publics. Le conflit de version est une erreur applicative.

### Une architecture pensée pour les tests

Nous avons choisi cette architecture pour une raison : maximiser l'efficacité des tests en rendant les composants indépendants les uns des autres.

**Le levier : l'inversion de dépendances.** Les handlers ne connaissent que des interfaces : `ShootoutRepository` (domaine), `ShootoutReadRepository` (application) et `EventPublisher` (port). Ils ne connaissent jamais TypeORM ni le SSE. Le module (`shootout.module.ts`) branche les implémentations réelles au démarrage, et les tests branchent leurs propres implémentations à la place.

**Ce que cela permet à chaque niveau :**

| Composant | Testé avec | Sans |
|---|---|---|
| Domaine (agrégat, règles IFAB, value objects) | des fonctions pures | base, HTTP, framework |
| Handlers (cas d'usage) | des stubs des ports, une horloge fixe et des identifiants fixes | base, HTTP |
| Adapters et routes | une vraie base SQLite en mémoire et l'application complète | stubs |

**Le résultat** : chaque niveau teste une seule responsabilité, rapidement et de façon reproductible. Une erreur dans les règles fait échouer les tests du domaine. Une erreur d'orchestration fait échouer ceux des handlers. Une erreur de persistance fait échouer ceux d'intégration.

**Choix techniques** :
- **Agrégat immuable** : chaque tir renvoie une nouvelle séance et les événements produits.
- **Côtés séparés** : les commandes ne renvoient pas la représentation publique. Le contrôleur interroge ensuite le côté lecture pour construire la réponse `201`.
- **Schéma** : il est produit uniquement par les migrations. `synchronize` est désactivé.

## Tests

| Niveau | Emplacement | Ce qui est vérifié |
|---|---|---|
| Unitaires du domaine | `src/modules/shootout/_test/domain/` | Création, alternance, refus et priorités, fin anticipée, mort subite, table de décision IFAB, bornes des value objects |
| Cas d'usage | `src/modules/shootout/_test/application/` | Handlers branchés sur des stubs des ports : persistance, conflit de version et écriture concurrente, absence d'effet sur refus, publication après persistance |
| Intégration | `src/modules/shootout/_test/integration/` | L'application complète (routes Hono, handlers, adapters TypeORM) sur une vraie base SQLite en mémoire, migrée et neuve pour chaque test. Vérifications sur la réponse HTTP et sur la base : création, consultation, tirs, refus sans écriture, deux tirs sur la même version, fin de séance persistée, flux SSE, migrations |
| Traduction des erreurs | `src/shared/http/_test/` | Chaque type d'erreur (requête, domaine, introuvable, refus métier, conflit applicatif, erreur inattendue) donne le bon statut et le bon code, sans exposer les messages internes |
| Composant SSE fourni | `src/sse/_test/` | Tests livrés avec le composant, déplacés à côté de lui sans autre modification |
| Parcours API | `bruno/` | 19 requêtes contre l'API démarrée : création, consultation, tir accepté, chaque refus 409, fin de séance, flux SSE inconnu |

**Format des tests** : ils suivent le format « given when then ». L'horloge et les identifiants sont fixés, ce qui rend les résultats reproductibles.

**Pertinence** : pour vérifier qu'ils détectent vraiment des erreurs, nous avons introduit volontairement des bugs dans une copie du code. Les tests ont échoué à chaque fois :
- **tests unitaires et de cas d'usage** : nombre de tirs réglementaires modifié, publication avant la persistance, contrôle du tour supprimé, contrôle de version supprimé ;
- **tests d'intégration** : un adapter qui n'insère plus le nouveau tir, et une migration qui rend à nouveau `nextTeam` obligatoire. Ces deux erreurs passent inaperçues avec les stubs.

## Limites

- **Concurrence** : elle est vérifiée en séquence, c'est-à-dire deux écritures sur la même version, et par une écriture simulée entre la lecture et l'enregistrement. La concurrence réellement parallèle est hors périmètre (§8).
- **SSE dans Bruno** : le flux d'une séance existante n'y est pas testé, car il ne se ferme jamais. Il est couvert par les tests d'intégration.
- **Drapeaux** : l'interface charge les drapeaux depuis flagcdn.com. Hors connexion, elle affiche les initiales des équipes.

## Usage de l'IA générative

**Outil** : Claude Code (modèle Claude Opus 5.5).

**Usage** : nous l'avons utilisé comme un outil d'écriture de code, pour produire plus vite ce que nous avions décidé. Nous ne l'avons pas utilisé pour concevoir à notre place. Concrètement, chaque étape commençait par une consigne précise de notre part (structure, emplacement, nommage, cas à couvrir), que l'outil exécutait. Nous relisions ensuite le résultat et demandions des corrections jusqu'à ce qu'il corresponde à ce que nous voulions. Il s'agissait alors plus d'un travail de reproduction d'un pattern fournit, plutot qu'une vrai generation de ce dernier.

### Décisions prises par l'équipe

L'architecture a été définie par nous, avant d'être confiée à l'outil. Chaque choix ci-dessous lui a été imposé explicitement :

- **Approche générale** : DDD, séparation CQRS, cas d'usage s'appuyant sur le pattern repository, avec pour but la testabilité par inversion de dépendances.
- **Domaine métier pur** : à notre demande de revue, les entités TypeORM et le mapper ont été sortis du domaine vers `adapters/typeorm/`.
- **Organisation par module** (`modules/shootout`) :
  - `ports/` et `adapters/` au même niveau ;
  - un dossier `adapters/typeorm/` dédié ;
  - les agrégats dans `domain/aggregates/` ;
  - les types, énumérations et value objects regroupés dans le domaine.
- **Flux des écritures** : `Controller → Command → CommandHandler → Repository → TypeOrmRepository`, sans couche « services ».
- **Rangement des cas d'usage** : séparés en `commands/` et `queries/`, avec un dossier par cas d'usage, dans la couche `application/`. Le contrôleur correspondant est rangé dans le même dossier côté `http/`.
- **Conventions de nommage** :
  - `*.controller.ts`, `*.command.ts`, `*.command-handler.ts`, `*.query.ts`, `*.query-handler.ts` ;
  - `*.repository.ts` pour les interfaces et `TypeOrm*.repository.ts` pour les implémentations ;
  - « shootout » plutôt que « match ».
- **Stratégie de test** :
  - tests rangés dans `_test/` au sein du module ;
  - format « étant donné / quand / alors » ;
  - fixtures et stubs des repositories, avec un stub qui porte la préparation et l'appel des handlers ;
  - collection Bruno limitée aux cas principaux.
- **Règles métier** : le choix des règles IFAB comme référence.

### Ce que l'IA a produit sous notre direction

L'outil a écrit le code qui met en œuvre ces décisions :

- la persistance : migrations, data source;
- le domaine : agrégat, value objects ; (le pattern est fourni a l'avance)
- la collection Bruno et l'interface spectateur.

### Propositions de l'IA que nous avons retenues

Ce sont des ajustements d'implémentation, faits à l'intérieur du cadre fixé ci-dessus et validés par nous :

- **Clé du tir** : clé primaire composée (`shootoutId`, `sequence`).
- **Fin de séance** : `nextTeam` peut valoir `null`, ce qui a demandé une migration.
- **Revue DDD demandée par l'équipe** : nous avons demandé à l'outil si le projet respectait un DDD propre. Nous avons retenu trois corrections de rangement, qui ne changent ni le découpage ni les choix faits plus haut :
  - une couche `application/` distincte de `http/` pour les commandes, les requêtes et leurs handlers ;
  - l'interface du repository d'écriture dans `domain/repositories/` ;
  - des erreurs du domaine sans vocabulaire HTTP (`INVALID_VALUE`, traduit en `INVALID_REQUEST` par la couche HTTP), et le conflit de version déplacé dans les erreurs applicatives.

### Vérifications effectuées

- **Compilation et tests** : `bun run typecheck` et `bun test` passent (107 tests), ainsi que la collection Bruno (19 requêtes, 112 assertions).
- **Pertinence des tests** : contrôlée en introduisant volontairement des erreurs, voir la section Tests.
- **Parcours réel** : des séances complètes ont été jouées sur le vrai serveur et suivies dans l'interface spectateur.
- **Relecture** : nous avons relu le code produit et demandé des corrections quand il ne respectait pas l'architecture voulue. Les fichiers ont été déplacés et renommés plusieurs fois jusqu'à obtenir l'organisation ci-dessus.

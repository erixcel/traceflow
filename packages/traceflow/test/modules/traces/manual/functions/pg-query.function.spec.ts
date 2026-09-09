import { getPgQueryMetadata } from '../../../../../src/modules/traces/manual/functions/pg-query.function';

describe('PostgreSQL query relations', () => {
  it.each([
    ['select b.id from bath b left join pet p on p.id=b.pet_id join customer c on c.id=p.customer_id', 'SELECT', ['bath', 'pet', 'customer']],
    ['select * from users u join users manager on manager.id=u.id', 'SELECT', ['users']],
    ['select * from "tenant"."User Accounts" u, public.pets p where u.id=p.id', 'SELECT', ['tenant.User Accounts', 'public.pets']],
    ["select 'join secret_table' from users /* join hidden */ where id in (select user_id from pets)", 'SELECT', ['users', 'pets']],
    ['select (select count(*) from pets) as total from users', 'SELECT', ['pets', 'users']],
    ['with users as (select * from users), pets as (select * from users join animals a on true) select * from pets join public.users u on true', 'SELECT', ['users', 'animals', 'public.users']],
    ['select * from (with x as (select * from users) select * from x) a join x on true', 'SELECT', ['users', 'x']],
    ['with recursive tree(id) as (select id from users union all select u.id from users u join tree t on true) select * from tree', 'SELECT', ['users']],
    ['update users set id=2 from pets where users.id=pets.id', 'UPDATE', ['users', 'pets']],
    ['delete from users where id in (select user_id from pets)', 'DELETE', ['users', 'pets']],
    ['insert into users(id) select id from applicants returning id', 'INSERT', ['users', 'applicants']],
    ['select * from users union all select * from applicants', 'SELECT', ['users', 'applicants']],
  ])('extracts tables from %s', (sql, operation, tables) => {
    const metadata = getPgQueryMetadata(sql);
    expect(metadata).toMatchObject({ operation, status: 'parsed', control: false });
    expect([...metadata.tables].sort()).toEqual([...tables].sort());
  });

  it('does not invent relations for unsupported SQL or statements without tables', () => {
    expect(getPgQueryMetadata('unrecognized postgres extension syntax')).toEqual({ tables: [], operation: 'QUERY', status: 'unavailable', control: false });
    expect(getPgQueryMetadata('select 1')).toMatchObject({ tables: [], status: 'parsed' });
    expect(getPgQueryMetadata('begin')).toMatchObject({ tables: [], control: true });
  });
});

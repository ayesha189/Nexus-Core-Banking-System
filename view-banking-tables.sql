-- Connect as SYSTEM user (use system/system as credentials)

-- View all your banking tables
select table_name
  from user_tables
 where table_name in ( 'CUSTOMERS',
                       'ACCOUNTS',
                       'TRANSACTIONS',
                       'COMPLAINTS',
                       'AUDIT_LOGS',
                       'USERS' )
 order by table_name;

-- View CUSTOMERS table
select *
  from system.customers;

-- View ACCOUNTS table
select *
  from system.accounts;

-- View TRANSACTIONS table
select *
  from system.transactions;

-- View COMPLAINTS table
select *
  from system.complaints;

-- View AUDIT_LOGS table
select *
  from system.audit_logs;

-- View USERS table
select *
  from system.users;
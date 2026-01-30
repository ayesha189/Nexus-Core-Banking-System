   SET PAGESIZE 100 FEEDBACK ON HEADING ON ECHO OFF;
select constraint_name,
       constraint_type,
       table_name,
       column_name
  from user_cons_columns
 where constraint_name = 'SYS_C007170'
 order by table_name,
          position;
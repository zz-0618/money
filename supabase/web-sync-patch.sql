-- 在先前 iOS schema.sql 執行後，再執行此檔
-- Realtime 用於網頁與 iOS 跨裝置即時刷新
alter publication supabase_realtime add table accounts, transactions, todos, journal_entries;

-- 讓同一筆收支寫入後自動調整帳戶餘額
create or replace function public.apply_transaction_balance() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.kind='income' then update accounts set balance=balance+new.amount where id=new.account_id and user_id=new.user_id;
  elsif new.kind='expense' then update accounts set balance=balance-new.amount where id=new.account_id and user_id=new.user_id;
  elsif new.kind='transfer' then
    update accounts set balance=balance-new.amount where id=new.account_id and user_id=new.user_id;
    update accounts set balance=balance+new.amount where id=new.to_account_id and user_id=new.user_id;
  end if; return new;
end $$;
drop trigger if exists transaction_balance_insert on transactions;
create trigger transaction_balance_insert after insert on transactions for each row execute function apply_transaction_balance();

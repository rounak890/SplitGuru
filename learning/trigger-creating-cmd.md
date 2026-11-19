
forward_sql = """
CREATE OR REPLACE FUNCTION check_split_sum() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT SUM(owed_amount) FROM expense_splits WHERE expense_id = NEW.expense_id) >
     (SELECT total_amount FROM expenses WHERE expense_id = NEW.expense_id) THEN
    RAISE EXCEPTION 'Split sum exceeds total expense amount';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_split_sum
AFTER INSERT ON expense_splits
FOR EACH ROW EXECUTE FUNCTION check_split_sum();
"""

reverse_sql = """
DROP TRIGGER IF EXISTS trg_check_split_sum ON expense_splits;
DROP FUNCTION IF EXISTS check_split_sum();
"""
